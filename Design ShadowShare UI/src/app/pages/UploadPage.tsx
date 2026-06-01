import { useState } from 'react';
import { Logo } from '../components/shadowshare/Logo';
import { TrustBadge } from '../components/shadowshare/TrustBadge';
import { Lock, EyeOff, Monitor, Moon, SunMedium } from 'lucide-react';
import { DropZone } from '../components/shadowshare/DropZone';
import { SecurityModeSelector } from '../components/shadowshare/SecurityModeSelector';
import { PasswordInput } from '../components/shadowshare/PasswordInput';
import { AdvancedOptions } from '../components/shadowshare/AdvancedOptions';

type SecurityMode = 'link-password' | 'link-only';
type ExpiryOption = '1h' | '24h' | '7d' | '30d';

export function UploadPage({
  onUpload,
  theme,
  onToggleTheme,
}: {
  onUpload: (data: UploadData) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [securityMode, setSecurityMode] = useState<SecurityMode>('link-password');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState<ExpiryOption>('7d');
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState<number | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleUpload = () => {
    if (files.length === 0) return;
    if (securityMode === 'link-password' && !password) return;

    onUpload({
      files,
      password: securityMode === 'link-password' ? password : undefined,
      expiry,
      burnAfterReading,
      maxDownloads
    });
  };

  const canUpload = files.length > 0 && (securityMode === 'link-only' || password);

  return (
    <div className="min-h-screen relative" style={{
      backgroundColor: 'var(--background)',
      backgroundImage: theme === 'dark'
        ? 'radial-gradient(circle at center, rgba(28, 32, 48, 0.4) 0%, rgba(10, 12, 18, 1) 100%)'
        : 'radial-gradient(circle at center, rgba(210, 219, 238, 0.75) 0%, rgba(247, 248, 250, 1) 72%)',
    }}>
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-200" style={{
        height: '60px',
        borderBottom: '0.5px solid transparent'
      }}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowHowItWorks(true)}
              className="text-sm hover:text-(--text-secondary) transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              How it works
            </button>
            <button
              onClick={onToggleTheme}
              className="p-2 rounded transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'transparent'
              }}
            >
              {theme === 'dark' ? <SunMedium size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{
              backgroundColor: theme === 'dark' ? 'rgba(42, 37, 96, 0.6)' : 'rgba(124, 110, 250, 0.12)',
              border: theme === 'dark' ? '1px solid rgba(124, 110, 250, 0.2)' : '1px solid rgba(124, 110, 250, 0.18)',
              color: theme === 'dark' ? 'var(--brand-hover)' : 'var(--brand-accent)',
              fontSize: '12px'
            }}>
              Open Source · Zero Knowledge · Auditable
            </div>

            <h1 className="mb-4" style={{
              fontSize: '48px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '1.2'
            }}>
              Send files.
              <br />
              <span style={{ letterSpacing: '0.02em' }}>No trace.</span>
            </h1>

            <p className="mx-auto mb-6" style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              maxWidth: '28rem',
              lineHeight: '1.5'
            }}>
              End-to-end encrypted in your browser.
              Add single files, folders, photos, videos, documents, and zip archives.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <TrustBadge icon={Lock} text="AES-256-GCM" />
              <TrustBadge icon={EyeOff} text="Zero-Knowledge" />
              <TrustBadge icon={Monitor} text="Client-Side Only" />
            </div>
          </div>

          {/* Upload Card */}
          <div className="rounded-3xl p-8 border shadow-2xl" style={{
            backgroundColor: 'var(--surface)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: theme === 'dark' ? '0 32px 80px rgba(0, 0, 0, 0.4)' : '0 32px 80px rgba(15, 23, 42, 0.08)'
          }}>
            <div className="space-y-6">
              {/* Drop Zone */}
              <DropZone files={files} onFileSelect={setFiles} theme={theme} />

              {/* Security Mode */}
              <SecurityModeSelector mode={securityMode} onChange={setSecurityMode} theme={theme} />

              {/* Password Input */}
              {securityMode === 'link-password' && (
                <PasswordInput value={password} onChange={setPassword} />
              )}

              {/* Advanced Options */}
              <AdvancedOptions
                expiry={expiry}
                setExpiry={setExpiry}
                burnAfterReading={burnAfterReading}
                setBurnAfterReading={setBurnAfterReading}
                maxDownloads={maxDownloads}
                setMaxDownloads={setMaxDownloads}
              />

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!canUpload}
                className="w-full h-12 rounded-md transition-all duration-150"
                style={{
                  backgroundColor: canUpload ? 'var(--brand-accent)' : 'var(--elevated)',
                  color: canUpload ? 'white' : 'var(--text-muted)',
                  fontSize: '16px',
                  fontWeight: 500,
                  opacity: canUpload ? 1 : 0.35,
                  cursor: canUpload ? 'pointer' : 'not-allowed',
                  transform: 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (canUpload) {
                    e.currentTarget.style.backgroundColor = 'var(--brand-hover)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (canUpload) {
                    e.currentTarget.style.backgroundColor = 'var(--brand-accent)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                Encrypt & Upload
              </button>
            </div>
          </div>

          {/* Bottom Text */}
          <p className="text-center mt-6" style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: '1.5'
          }}>
            Your files are encrypted before they leave your device.
            We cannot read them. Neither can anyone else without the link.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-6">
        <div className="flex items-center justify-center gap-3 text-sm" style={{
          fontSize: '13px',
          color: 'var(--text-muted)'
        }}>
          <span>ShadowShare</span>
          <span>·</span>
          <a href="#" className="hover:text-(--text-secondary) transition-colors">Privacy</a>
          <span>·</span>
          <a href="#" className="hover:text-(--text-secondary) transition-colors">GitHub ↗</a>
          <span>·</span>
          <a href="#" className="hover:text-(--text-secondary) transition-colors">Security ↗</a>
        </div>
      </footer>

      {/* How It Works Modal */}
      {showHowItWorks && (
        <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
      )}
    </div>
  );
}

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full rounded-3xl p-8 border"
        style={{
          backgroundColor: 'var(--surface)',
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.12)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1 hover:text-(--text-secondary) transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>

        <h2 className="mb-6" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
          How ShadowShare works
        </h2>

        <div className="space-y-6">
          <Step
            number={1}
            title="Your browser encrypts the file"
            description="The file never leaves your device unencrypted. AES-256-GCM runs entirely in your browser using native Web Crypto APIs. We have no access to your file or password."
            technical="PBKDF2 · 100,000 iterations · SHA-256 · 256-bit key"
          />
          <Step
            number={2}
            title="We store encrypted noise"
            description="Our server receives a binary blob it cannot read. It stores your file ID, the encrypted bytes, and an expiry time. Nothing else. No filename. No key. No user account."
          />
          <Step
            number={3}
            title="The key travels in the link"
            description="The decryption key lives only in the # part of the URL. Browsers never send this to any server — it stays in the recipient's browser only."
            technical="RFC 3986 · URL fragment · Never transmitted"
          />
        </div>

        <div className="mt-8 flex gap-4 text-sm">
          <a href="#" className="hover:underline" style={{ color: 'var(--brand-accent)' }}>
            Open source — read the code ↗
          </a>
          <a href="#" className="hover:underline" style={{ color: 'var(--brand-accent)' }}>
            Read the security audit ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, description, technical }: {
  number: number;
  title: string;
  description: string;
  technical?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
        backgroundColor: 'rgba(124, 110, 250, 0.15)',
        color: 'var(--brand-accent)',
        fontSize: '14px',
        fontWeight: 600
      }}>
        {number}
      </div>
      <div className="flex-1">
        <h3 className="mb-2" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {description}
        </p>
        {technical && (
          <div className="mt-2 px-3 py-2 rounded" style={{
            backgroundColor: 'var(--elevated)',
            fontFamily: 'var(--font-family-mono)',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            {technical}
          </div>
        )}
      </div>
    </div>
  );
}

export interface UploadData {
  files: File[];
  password?: string;
  expiry: ExpiryOption;
  burnAfterReading: boolean;
  maxDownloads: number | null;
}
