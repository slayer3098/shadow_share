import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput({
  value,
  onChange,
  placeholder = "Enter a strong password"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const dots = '• '.repeat(Math.min(value.length, 12));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Encryption password
        </label>
        {value && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
            {dots}
          </div>
        )}
      </div>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full h-11 px-4 pr-12 rounded-md transition-all outline-none"
          style={{
            backgroundColor: 'var(--elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '14px'
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = '0 0 0 2px rgba(124, 110, 250, 0.4)';
            e.target.style.borderColor = 'var(--brand-accent)';
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none';
            e.target.style.borderColor = 'var(--border-subtle)';
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-[var(--text-secondary)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Share this password with your recipient separately.
      </div>
    </div>
  );
}
