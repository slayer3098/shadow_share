import { useState, useEffect } from 'react';
import { Logo } from '../components/shadowshare/Logo';
import { FileTypeIcon } from '../components/shadowshare/FileTypeIcon';
import { Download, Clock, Flame, ShieldCheck, ShieldX } from 'lucide-react';
import { downloadFileBlob, getFileMeta } from '../lib/api';
import PdfPreview from '../components/PdfPreview';
import {
  decryptBytes,
  deriveAesKeyFromPassword,
  fromBase64,
  fromBase64Url,
  importRawAesKey,
  parseUtf8,
} from '../lib/crypto';

type ViewState = 'loading' | 'password-required' | 'decrypting' | 'ready' | 'expired' | 'tampered';

export function ViewerPage({ fileId }: { fileId: string }) {
  const [state, setState] = useState<ViewState>('loading');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('encrypted-file.bin');
  const [fileSize, setFileSize] = useState(0);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [expiresLabel, setExpiresLabel] = useState('Unknown');
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [metaEnvelope, setMetaEnvelope] = useState<{ encryptedMetadata: string | null; encryptionIv: string | null } | null>(null);
  const [accessVerifier, setAccessVerifier] = useState<{ verifier: string | null; salt: string | null; iv: string | null } | null>(null);
  const [mimeType, setMimeType] = useState('application/octet-stream');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const meta = await getFileMeta(fileId);
        if (cancelled) return;

        setFileSize(meta.blobSizeBytes);
        setBurnAfterRead(Boolean(meta.burnAfterRead));
        setExpiresLabel(meta.expiresAt || 'Unknown');

        setMetaEnvelope({ encryptedMetadata: meta.encryptedMetadata, encryptionIv: meta.encryptionIv });
        setAccessVerifier(meta.accessVerifier || null);
        const fragment = window.location.hash.replace(/^#/, '');
        const [mode, payload] = fragment.split('.', 2);

        if (mode === 'k' && payload) {
          const imported = await importRawAesKey(fromBase64Url(payload));
          await decryptMetadataWithKey(meta.encryptedMetadata, meta.encryptionIv, imported);
          if (cancelled) return;
          setKey(imported);
          runDecryptAnimation(cancelled);
          return;
        }

        if (mode === 'p' && payload) {
          setState('password-required');
          return;
        }

        setState('tampered');
      } catch (error) {
        console.error(error);
        setState('expired');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  const handlePasswordSubmit = async () => {
    if (password.length < 1 || !metaEnvelope) {
      setPasswordError(true);
      return;
    }
    try {
      const fragment = window.location.hash.replace(/^#/, '');
      const [mode, payload] = fragment.split('.', 2);
      if (mode !== 'p' || !payload) {
        setPasswordError(true);
        return;
      }

      const salt = fromBase64Url(payload);
      const derived = await deriveAesKeyFromPassword(password, salt);

      // If an access verifier is present, verify it first (faster failure path)
      if (accessVerifier && accessVerifier.verifier && accessVerifier.iv) {
        try {
          const cipher = fromBase64(accessVerifier.verifier);
          const iv = fromBase64(accessVerifier.iv);
          const plain = await decryptBytes(cipher, iv, derived);
          const txt = parseUtf8(plain);
          if (txt !== 'ShadowShare Access Verifier v1') {
            setPasswordError(true);
            return;
          }
        } catch (err) {
          setPasswordError(true);
          return;
        }
      }

      await decryptMetadataWithKey(metaEnvelope.encryptedMetadata, metaEnvelope.encryptionIv, derived);
      setKey(derived);
      runDecryptAnimation(false);
    } catch (error) {
      console.error(error);
      setPasswordError(true);
    }
  };

  const handleDownload = async () => {
    if (!key) {
      setState('tampered');
      return;
    }

    try {
      const blob = await downloadFileBlob(fileId);
      const encryptedPayload = new Uint8Array(await blob.arrayBuffer());
      if (encryptedPayload.length < 13) {
        setState('tampered');
        return;
      }

      const fileIv = encryptedPayload.slice(0, 12);
      const fileCipher = encryptedPayload.slice(12);
      const plainBytes = await decryptBytes(fileCipher, fileIv, key);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        const localPreview = URL.createObjectURL(new Blob([plainBytes], { type: mimeType }));
        setPreviewUrl(localPreview);
      }

      const url = URL.createObjectURL(new Blob([plainBytes], { type: mimeType || 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setState('tampered');
    }
  };

  const decryptMetadataWithKey = async (
    encryptedMetadata: string | null,
    encryptionIv: string | null,
    cryptoKey: CryptoKey
  ) => {
    if (!encryptedMetadata || !encryptionIv) {
      throw new Error('Missing metadata envelope');
    }
    const plain = await decryptBytes(fromBase64(encryptedMetadata), fromBase64(encryptionIv), cryptoKey);
    const parsed = JSON.parse(parseUtf8(plain)) as { filename?: string; size?: number };
    if (parsed.filename) {
      setFileName(parsed.filename);
    }
    if ((parsed as { mimeType?: string }).mimeType) {
      setMimeType((parsed as { mimeType?: string }).mimeType as string);
    }
    if (typeof parsed.size === 'number') {
      setFileSize(parsed.size);
    }
  };

  const runDecryptAnimation = (cancelled: boolean) => {
    setState('decrypting');
    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        if (!cancelled) setState('ready');
      }
    }, 120);
  };

  if (state === 'loading' || state === 'password-required') {
    return (
      <ViewerLayout>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-transparent mb-5" style={{
            borderTopColor: 'var(--brand-accent)',
            borderRightColor: 'var(--brand-accent)'
          }} />
          <h2 className="mb-2" style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Preparing secure transfer…
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Verifying link integrity
          </p>
          <p className="mb-6" style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            The sender protected this file with an access password.
          </p>

          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              placeholder="Enter password"
              className="w-full h-11 px-4 rounded-md transition-all outline-none"
              style={{
                backgroundColor: 'var(--elevated)',
                border: passwordError ? '1px solid var(--danger)' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            {passwordError && (
              <p style={{ fontSize: '13px', color: 'var(--danger)', textAlign: 'left' }}>
                Incorrect password
              </p>
            )}
            <button
              onClick={handlePasswordSubmit}
              className="w-full h-11 rounded-md transition-all"
              style={{
                backgroundColor: 'var(--brand-accent)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Verify & decrypt
            </button>
          </div>
        </div>
      </ViewerLayout>
    );
  }

  if (state === 'decrypting') {
    return (
      <ViewerLayout>
        <div className="text-center">
          <div className="mb-6">
            <svg width="64" height="64" viewBox="0 0 64 64" className="mx-auto">
              <g style={{ color: 'var(--brand-accent)' }}>
                <path
                  d="M32 8C27.6 8 24 11.6 24 16V24H20C17.8 24 16 25.8 16 28V52C16 54.2 17.8 56 20 56H44C46.2 56 48 54.2 48 52V28C48 25.8 46.2 24 44 24H40V16C40 11.6 36.4 8 32 8Z"
                  fill="currentColor"
                  opacity="0.3"
                />
                <path
                  d="M28 16C28 13.8 29.8 12 32 12C34.2 12 36 13.8 36 16V20C36 20.6 35.6 21 35 21H29C28.4 21 28 20.6 28 20V16Z"
                  fill="currentColor"
                  className="animate-pulse"
                />
              </g>
            </svg>
          </div>

          <h2 className="mb-2" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Verifying and decrypting…
          </h2>
          <p className="mb-6" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Checking AES-GCM authentication tag
          </p>

          <div className="w-full h-0.5 rounded-full overflow-hidden" style={{
            backgroundColor: 'var(--elevated)'
          }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--brand-accent)',
                animation: 'shimmer 1.5s infinite'
              }}
            />
          </div>
        </div>
      </ViewerLayout>
    );
  }

  if (state === 'ready') {
    return (
      <ViewerLayout>
        <div className="text-center">
          <FileTypeIcon mimeType="application/pdf" size={56} className="mx-auto mb-4" />

          <h2 className="mb-1" style={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {fileName}
          </h2>
          <p className="mb-3" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {(fileSize / (1024 * 1024)).toFixed(2)} MB
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3" style={{
            backgroundColor: 'rgba(124, 110, 250, 0.08)',
            border: '1px solid rgba(124, 110, 250, 0.2)'
          }}>
            <ShieldCheck size={14} style={{ color: 'var(--brand-accent)' }} />
            <span style={{ fontSize: '12px', color: 'var(--brand-accent)' }}>
              End-to-End Encrypted
            </span>
          </div>

          {burnAfterRead && (
            <div className="p-3 rounded-md flex gap-2 items-center mb-6" style={{
              backgroundColor: 'rgba(245, 166, 35, 0.08)',
              border: '1px solid rgba(245, 166, 35, 0.2)'
            }}>
              <Flame size={14} style={{ color: 'var(--warning)' }} />
              <span style={{ fontSize: '13px', color: 'var(--warning)' }}>
                This file will be permanently deleted after download
              </span>
            </div>
          )}

          <button
            onClick={handleDownload}
            className="w-full h-14 rounded-xl transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--success)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(39, 213, 133, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--success)';
            }}
          >
            <Download size={20} />
            Download {fileName}
          </button>

          {previewUrl && mimeType.startsWith('image/') && (
            <div className="mt-4 text-left">
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Preview generated client-side
              </p>
              <img src={previewUrl} alt="Decrypted preview" className="w-full rounded-md" />
            </div>
          )}

          {previewUrl && mimeType === 'application/pdf' && (
            <div className="mt-4 text-left">
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                PDF preview generated client-side
              </p>
              <div style={{ height: '320px', overflow: 'auto' }}>
                <PdfPreview src={previewUrl} />
              </div>
            </div>
          )}

          <p className="mt-4 italic" style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '1.5'
          }}>
            End-to-end encrypted · Key never sent to server
          </p>

          <div className="mt-2 flex items-center justify-center gap-2" style={{
            fontSize: '13px',
            color: 'var(--text-muted)'
          }}>
            <Clock size={14} />
            <span>Expires at {expiresLabel}</span>
          </div>
        </div>
      </ViewerLayout>
    );
  }

  if (state === 'tampered') {
    return (
      <ViewerLayout>
        <div className="text-center">
          <ShieldX size={64} style={{ color: 'var(--danger)' }} className="mx-auto mb-5" />
          <h2 className="mb-3" style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--danger)'
          }}>
            Integrity check failed
          </h2>
          <p className="mb-2 mx-auto" style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            maxWidth: '20rem',
            lineHeight: '1.6'
          }}>
            This file's authentication signature did not verify.
            It may have been tampered with or the link is corrupted.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Do not use this file. Contact the sender.
          </p>
          <a
            href="/"
            className="inline-block mt-6 text-sm hover:underline"
            style={{ color: 'var(--brand-accent)', fontSize: '13px' }}
          >
            Return home
          </a>
        </div>
      </ViewerLayout>
    );
  }

  if (state === 'expired') {
    return (
      <ViewerLayout>
        <div className="text-center">
          <Clock size={64} style={{ color: 'var(--warning)' }} className="mx-auto mb-5" />
          <h2 className="mb-3" style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--warning)'
          }}>
            This file has expired
          </h2>
          <p className="mb-6" style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            The sender set a time limit on this file and it has passed.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md border transition-all"
            style={{
              borderColor: 'var(--brand-accent)',
              color: 'var(--brand-accent)',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Send a file
          </a>
        </div>
      </ViewerLayout>
    );
  }

  return null;
}

function ViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{
      backgroundColor: 'var(--background)',
      backgroundImage: 'radial-gradient(circle at center, rgba(28, 32, 48, 0.4) 0%, rgba(10, 12, 18, 1) 100%)',
    }}>
      <div className="absolute top-6 left-6">
        <Logo />
      </div>

      <div className="max-w-md w-full rounded-3xl p-10 border" style={{
        backgroundColor: 'rgba(18, 21, 31, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 32px 80px rgba(0, 0, 0, 0.4)'
      }}>
        {children}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
