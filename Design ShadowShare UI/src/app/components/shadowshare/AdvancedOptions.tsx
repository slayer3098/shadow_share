import { useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Shield, Sparkles, TimerReset } from 'lucide-react';

type ExpiryOption = '1h' | '24h' | '7d' | '30d';

export function AdvancedOptions({
  expiry,
  setExpiry,
  burnAfterReading,
  setBurnAfterReading,
  maxDownloads,
  setMaxDownloads
}: {
  expiry: ExpiryOption;
  setExpiry: (expiry: ExpiryOption) => void;
  burnAfterReading: boolean;
  setBurnAfterReading: (value: boolean) => void;
  maxDownloads: number | null;
  setMaxDownloads: (value: number | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showMaxDownloads, setShowMaxDownloads] = useState(false);

  const expiryOptions: { value: ExpiryOption; label: string }[] = [
    { value: '1h', label: '1h' },
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' }
  ];

  const maxDownloadsLabel = maxDownloads ? `${maxDownloads} max` : 'Unlimited';

  const applyQuickSecurePreset = () => {
    setExpiry('1h');
    setBurnAfterReading(true);
    setMaxDownloads(1);
    setShowMaxDownloads(true);
  };

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5 space-y-4"
      style={{
        background: 'linear-gradient(180deg, rgba(124, 110, 250, 0.08), rgba(124, 110, 250, 0.02))',
        borderColor: 'var(--border-subtle)'
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-4 text-left transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              backgroundColor: 'rgba(124, 110, 250, 0.14)',
              color: 'var(--brand-accent)'
            }}
          >
            <Shield size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Delivery controls</div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
              Set expiry, self-destruct, and download limits before you send.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-1"
            style={{
              backgroundColor: 'rgba(124, 110, 250, 0.12)',
              color: 'var(--brand-hover)',
              fontSize: '11px'
            }}
          >
            <TimerReset size={12} />
            {expiry}
          </span>
          {isOpen ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200 pt-1">
          <button
            type="button"
            onClick={applyQuickSecurePreset}
            className="group w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(124, 110, 250, 0.18), rgba(124, 110, 250, 0.05))',
              borderColor: 'rgba(124, 110, 250, 0.28)',
              boxShadow: '0 10px 24px rgba(124, 110, 250, 0.10)'
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Quick secure preset</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                    One tap sets 1h expiry, delete-after-read, and a single download.
                  </p>
                </div>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs transition-transform duration-200 group-hover:scale-105"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', color: 'var(--brand-hover)' }}
              >
                Apply
              </span>
            </div>
          </button>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'var(--elevated)', color: 'var(--text-secondary)' }}>
              <TimerReset size={12} />
              Expires: {expiry}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'var(--elevated)', color: 'var(--text-secondary)' }}>
              <Flame size={12} />
              Delete after read: {burnAfterReading ? 'On' : 'Off'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'var(--elevated)', color: 'var(--text-secondary)' }}>
              <Shield size={12} />
              Downloads: {maxDownloadsLabel}
            </span>
          </div>

          <div className="space-y-2">
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Expires after
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {expiryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExpiry(option.value)}
                  className="py-2 px-3 rounded-lg border transition-all duration-150"
                  style={{
                    backgroundColor: expiry === option.value ? 'rgba(124, 110, 250, 0.08)' : 'transparent',
                    borderColor: expiry === option.value ? 'rgba(124, 110, 250, 0.5)' : 'var(--border-subtle)',
                    color: expiry === option.value ? 'var(--brand-hover)' : 'var(--text-muted)',
                    fontSize: '13px'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-md" style={{
            backgroundColor: burnAfterReading ? 'rgba(245, 166, 35, 0.10)' : 'var(--elevated)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div className="flex items-center gap-2">
              <Flame size={14} style={{ color: 'var(--warning)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Delete after first download
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBurnAfterReading(!burnAfterReading)}
              className="relative w-10 h-5 rounded-full transition-all duration-200"
              style={{
                backgroundColor: burnAfterReading ? 'rgba(245, 166, 35, 0.8)' : 'var(--elevated)'
              }}
            >
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: 'white',
                  transform: burnAfterReading ? 'translateX(20px)' : 'translateX(0)'
                }}
              />
            </button>
          </div>

          {!showMaxDownloads ? (
            <button
              type="button"
              onClick={() => setShowMaxDownloads(true)}
              className="text-sm hover:text-[var(--text-secondary)] transition-colors inline-flex items-center gap-1"
              style={{ color: 'var(--text-muted)', fontSize: '13px' }}
            >
              + set download limit
            </button>
          ) : (
            <div className="space-y-2">
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Max downloads
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxDownloads || ''}
                onChange={(e) => setMaxDownloads(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited"
                className="w-24 h-9 px-3 rounded-md transition-all outline-none"
                style={{
                  backgroundColor: 'var(--elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
