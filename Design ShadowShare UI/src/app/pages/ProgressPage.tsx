import { useEffect, useState } from 'react';
import { Key, Lock, CloudUpload } from 'lucide-react';
import { Logo } from '../components/shadowshare/Logo';
import type { UploadData } from './UploadPage';
import { apiBase, uploadInit, uploadComplete, uploadStatus, uploadChunkWithRetry } from '../lib/api';
import JSZip from 'jszip';
import {
  deriveAesKeyFromPassword,
  encryptBytes,
  exportRawKey,
  generateRandomAesKey,
  toBase64,
  toBase64Url,
  utf8,
} from '../lib/crypto';

type Phase = 'deriving' | 'encrypting' | 'uploading';

export function ProgressPage({
  uploadData,
  onComplete
}: {
  uploadData: UploadData;
  onComplete: (shareLink: string, deleteLink: string, expiresAt: string, ttl: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('deriving');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setPhase('deriving');
        setProgress(10);

        const bundle = await buildUploadBundle(uploadData.files);

        const mode = uploadData.password ? 'link-password' : 'link-only';
        let fragment = '';
        let key: CryptoKey;
        let salt: Uint8Array | null = null;

        if (mode === 'link-password') {
          salt = crypto.getRandomValues(new Uint8Array(16));
          key = await deriveAesKeyFromPassword(uploadData.password as string, salt);
          fragment = `p.${toBase64Url(salt)}`;
        } else {
          key = await generateRandomAesKey();
          const rawKey = await exportRawKey(key);
          fragment = `k.${toBase64Url(rawKey)}`;
        }

        const encryptedFile = await encryptBytes(bundle.bytes, key);
        const encryptedPayload = new Uint8Array(encryptedFile.iv.length + encryptedFile.cipher.length);
        encryptedPayload.set(encryptedFile.iv, 0);
        encryptedPayload.set(encryptedFile.cipher, encryptedFile.iv.length);
        setPhase('encrypting');
        setProgress(25);

        const metadata = {
          filename: bundle.name,
          size: bundle.bytes.byteLength,
          mimeType: bundle.mimeType,
          mode,
        };

        const encryptedMetadata = await encryptBytes(utf8(JSON.stringify(metadata)), key);
        const metadataBase64 = toBase64(encryptedMetadata.cipher);
        const metadataIvBase64 = toBase64(encryptedMetadata.iv);

        const totalSize = encryptedPayload.length;
        const chunkSize = 5 * 1024 * 1024;
        const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));

        setPhase('uploading');
        setProgress(35);
        // Attempt to reuse an existing session if one is stored and matches
        const stored = window.localStorage.getItem('shadowshare.lastUpload');
        let init: any = null;
        if (stored) {
          try {
            const info = JSON.parse(stored);
            if (info && info.totalSize === totalSize && info.totalChunks === totalChunks) {
              // verify status with server
              const status = await uploadStatus(info.sessionId);
              init = { sessionId: info.sessionId, chunkSizeBytes: status.chunkSize || chunkSize };
            }
          } catch (e) {
            init = null;
          }
        }
        if (!init) {
          init = await uploadInit({
          totalSizeBytes: totalSize,
          totalChunks,
          settings: {
            ttl: uploadData.expiry,
            burnAfterRead: uploadData.burnAfterReading,
            hasAccessPassword: Boolean(uploadData.password),
            maxDownloads: uploadData.maxDownloads,
          },
          });
          // persist session for possible resume
          try {
            window.localStorage.setItem('shadowshare.lastUpload', JSON.stringify({ sessionId: init.sessionId, totalSize, totalChunks }));
          } catch (e) {
            // ignore storage errors
          }
        }

        const effectiveChunkSize = init.chunkSizeBytes || chunkSize;
        // fetch current receivedChunks to skip already uploaded parts
        let received: number[] = [];
        try {
          const status = await uploadStatus(init.sessionId);
          received = status.receivedChunks || [];
        } catch (e) {
          // ignore; will attempt uploads from 0
        }

        for (let i = 0; i < totalChunks; i += 1) {
          if (cancelled) return;
          if (received.includes(i)) {
            const ratio = (i + 1) / totalChunks;
            setProgress(35 + Math.round(ratio * 55));
            continue;
          }
          const start = i * effectiveChunkSize;
          const end = Math.min(start + effectiveChunkSize, totalSize);
          await uploadChunkWithRetry(init.sessionId, i, encryptedPayload.slice(start, end));
          const ratio = (i + 1) / totalChunks;
          setProgress(35 + Math.round(ratio * 55));
        }

        let accessVerifierPayload = null;
        if (mode === 'link-password') {
          const verifierPlain = utf8('ShadowShare Access Verifier v1');
          const verifierEncrypted = await encryptBytes(verifierPlain, key);
          accessVerifierPayload = {
            verifier: toBase64(verifierEncrypted.cipher),
            salt: toBase64(salt),
            iv: toBase64(verifierEncrypted.iv),
          };
        }

        const done = await uploadComplete(init.sessionId, {
          encryptedMetadata: metadataBase64,
          encryptionIv: metadataIvBase64,
          accessVerifier: accessVerifierPayload,
        });

        // clear persisted session
        try { window.localStorage.removeItem('shadowshare.lastUpload'); } catch (e) {}

        setProgress(100);
        const shareLink = `${window.location.origin}/v/${done.fileId}#${fragment}`;
        const deleteLink = `${window.location.origin}/status/${done.fileId}#${done.deleteToken}`;
        // compute a client-side fallback expiresAt based on selected TTL
        function ttlToMs(ttl: string) {
          if (ttl === '1h') return 1 * 60 * 60 * 1000;
          if (ttl === '24h') return 24 * 60 * 60 * 1000;
          if (ttl === '7d') return 7 * 24 * 60 * 60 * 1000;
          if (ttl === '30d') return 30 * 24 * 60 * 60 * 1000;
          return 0;
        }
        const clientExpiresAt = new Date(Date.now() + ttlToMs(uploadData.expiry)).toISOString();
        onComplete(shareLink, deleteLink, done.expiresAt || clientExpiresAt, uploadData.expiry);
      } catch (error) {
        console.error(error);
        try {
          alert(`Upload failed. Check local backend is running and reachable at ${apiBase}`);
        } catch (e) {
          alert('Upload failed. Check local backend is running.');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [onComplete, uploadData]);

  async function buildUploadBundle(files: File[]): Promise<{ name: string; mimeType: string; bytes: Uint8Array }> {
    if (files.length === 1 && !(files[0] as File & { webkitRelativePath?: string }).webkitRelativePath) {
      const single = files[0];
      return {
        name: single.name,
        mimeType: single.type || 'application/octet-stream',
        bytes: new Uint8Array(await single.arrayBuffer()),
      };
    }

    const zip = new JSZip();
    for (const item of files) {
      const relativePath = (item as File & { webkitRelativePath?: string }).webkitRelativePath || item.name;
      zip.file(relativePath, item);
    }
    const zipped = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return {
      name: `shadowshare-bundle-${Date.now()}.zip`,
      mimeType: 'application/zip',
      bytes: zipped,
    };
  }

  const phaseConfig = {
    deriving: {
      icon: Key,
      label: 'Deriving encryption key…',
      sublabel: '100,000 PBKDF2 iterations · SHA-256'
    },
    encrypting: {
      icon: Lock,
      label: 'Encrypting file…',
      sublabel: 'AES-256-GCM · Your file never leaves the browser unencrypted'
    },
    uploading: {
      icon: CloudUpload,
      label: 'Uploading encrypted data…',
      sublabel: 'Server receives encrypted bytes only'
    }
  };

  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{
      backgroundColor: 'var(--background)',
      backgroundImage: 'radial-gradient(circle at center, rgba(28, 32, 48, 0.4) 0%, rgba(10, 12, 18, 1) 100%)',
    }}>
      <div className="absolute top-6 left-6">
        <Logo />
      </div>

      <div className="max-w-md w-full rounded-3xl p-10 border text-center" style={{
        backgroundColor: 'rgba(18, 21, 31, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 32px 80px rgba(0, 0, 0, 0.4)'
      }}>
        <div className="flex justify-center mb-6">
          <Icon
            size={64}
            style={{
              color: 'var(--brand-accent)',
              animation: phase === 'deriving' ? 'spin 3s linear infinite' :
                         phase === 'encrypting' ? 'pulse 1s ease-in-out infinite' :
                         'float 1.5s ease-in-out infinite'
            }}
          />
        </div>

        <h2 className="mb-2" style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          {config.label}
        </h2>

        <p className="mb-8" style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: '1.5'
        }}>
          {config.sublabel}
        </p>

        <div className="space-y-2">
          <div className="relative w-full h-2 rounded-full overflow-hidden" style={{
            backgroundColor: 'var(--elevated)'
          }}>
            <div
              className="h-full rounded-full relative transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--brand-accent)',
              }}
            >
              {progress < 100 && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 1.8s infinite'
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              {config.label.replace('…', '')}
            </span>
            <span style={{ color: 'var(--brand-accent)', fontSize: '12px', fontWeight: 500 }}>
              {progress}%
            </span>
          </div>
        </div>

        {phase === 'uploading' && (
          <button className="mt-6 text-sm hover:text-(--danger) transition-colors" style={{
            color: 'var(--text-muted)',
            fontSize: '13px'
          }}>
            Cancel
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
