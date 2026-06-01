import { useState, useEffect } from 'react';
import { Check, Copy, Clock, Trash2, QrCode, ShieldCheck, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { Logo } from '../components/shadowshare/Logo';

export function SuccessPage({
  shareLink,
  deleteLink,
  expiresAt,
  ttl,
  onReset
}: {
  shareLink: string;
  deleteLink: string;
  expiresAt: string;
  ttl?: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [deleteCopied, setDeleteCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    confetti({
      particleCount: 15,
      spread: 50,
      origin: { y: 0.5 },
      colors: ['#7C6EFA', '#27D585', '#F5A623'],
      shapes: ['square'],
      gravity: 0.8,
      scalar: 0.7,
      drift: 0,
      ticks: 200
    });
  }, []);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(shareLink, {
      width: 220,
      margin: 1,
      color: {
        dark: '#7C6EFA',
        light: '#00000000',
      },
    }).then((url) => {
      if (active) setQrDataUrl(url);
    }).catch((error) => {
      console.error(error);
    });
    return () => {
      active = false;
    };
  }, [shareLink]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteCopy = () => {
    navigator.clipboard.writeText(deleteLink);
    setDeleteCopied(true);
    setTimeout(() => setDeleteCopied(false), 2000);
  };

  function formatExpiresLabel(expiresAtStr: string, ttlOpt?: string) {
    // prefer exact selected TTL label when available
    if (ttlOpt) {
      if (ttlOpt === '1h') return 'Expires in 1 hour';
      if (ttlOpt === '24h') return 'Expires in 24 hours';
      if (ttlOpt === '7d') return 'Expires in 7 days';
      if (ttlOpt === '30d') return 'Expires in 30 days';
    }
    // fallback to computing from a timestamp
    try {
      const then = new Date(expiresAtStr).getTime();
      const now = Date.now();
      if (isNaN(then)) return 'Unknown';
      const diffMs = then - now;
      if (diffMs <= 0) return 'Expired';
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      if (hours < 24) return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      const days = Math.ceil(hours / 24);
      return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
    } catch (e) {
      return 'Unknown';
    }
  }

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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{
            border: '3px solid var(--success)'
          }}>
            <Check size={32} style={{ color: 'var(--success)' }} strokeWidth={3} />
          </div>

          <h2 className="mb-2" style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
            File encrypted & ready
          </h2>

          <p className="mx-auto" style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            maxWidth: '20rem',
            lineHeight: '1.5'
          }}>
            Send this link to your recipient. Only they can decrypt it.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Your secure share link
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                onClick={(e) => e.currentTarget.select()}
                className="flex-1 h-11 px-4 rounded-md border outline-none"
                style={{
                  backgroundColor: 'var(--elevated)',
                  borderColor: copied ? 'var(--success)' : 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '13px',
                  boxShadow: copied ? '0 0 0 2px rgba(39, 213, 133, 0.5)' : 'none',
                  transition: 'all 200ms'
                }}
              />
              <button
                onClick={handleCopy}
                className="h-11 px-4 rounded-md border transition-all duration-200 flex items-center gap-2"
                style={{
                  backgroundColor: copied ? 'rgba(39, 213, 133, 0.1)' : 'var(--elevated)',
                  borderColor: copied ? 'rgba(39, 213, 133, 0.3)' : 'var(--border-subtle)',
                  color: copied ? 'var(--success)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={14} />
                <span style={{ fontSize: '13px' }}>{formatExpiresLabel(expiresAt, ttl)}</span>
              </div>
              <button
                onClick={() => setShowQR(!showQR)}
                className="p-1 hover:text-(--text-secondary) transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <QrCode size={18} />
              </button>
            </div>

            {showQR && qrDataUrl && (
              <div className="mt-3 p-3 rounded-md border text-center" style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'rgba(28, 32, 48, 0.5)'
              }}>
                <img src={qrDataUrl} alt="Share link QR" className="mx-auto rounded" style={{ width: 180, height: 180 }} />
                <p className="mt-2" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Scan to open the full secure link
                </p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-r-md flex gap-3 items-start" style={{
            borderLeft: '3px solid var(--warning)',
            backgroundColor: 'rgba(245, 166, 35, 0.06)'
          }}>
            <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
            <p style={{
              fontSize: '13px',
              color: 'rgba(245, 166, 35, 0.9)',
              lineHeight: '1.5'
            }}>
              This link contains the decryption key. Share it only via a private channel — do not post publicly.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border transition-colors" style={{
            backgroundColor: 'rgba(28, 32, 48, 0.5)',
            borderColor: 'var(--border-subtle)'
          }}>
            <div className="flex items-center gap-2">
              <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Save your delete link
              </span>
            </div>
            <button
              onClick={handleDeleteCopy}
              className="text-sm hover:text-(--text-secondary) transition-colors"
              style={{
                color: deleteCopied ? 'var(--success)' : 'var(--text-muted)',
                fontSize: '13px'
              }}
            >
              {deleteCopied ? 'Copied!' : 'Copy delete link'}
            </button>
          </div>

          <button
            onClick={onReset}
            className="w-full text-center text-sm underline underline-offset-2 hover:text-(--text-secondary) transition-colors mt-6"
            style={{ color: 'var(--text-muted)', fontSize: '13px' }}
          >
            Send another file
          </button>
        </div>
      </div>
    </div>
  );
}
