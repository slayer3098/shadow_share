import { Lock, Link2 } from 'lucide-react';

type SecurityMode = 'link-password' | 'link-only';

export function SecurityModeSelector({
  mode,
  onChange,
  theme
}: {
  mode: SecurityMode;
  onChange: (mode: SecurityMode) => void;
  theme: 'dark' | 'light';
}) {
  const options = [
    {
      id: 'link-password' as const,
      icon: Lock,
      label: 'Link + Password',
      description: 'Recipient needs this link AND a password'
    },
    {
      id: 'link-only' as const,
      icon: Link2,
      label: 'Link Only',
      description: 'The link itself is the key. Simpler.'
    }
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
        Security level
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = mode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className="flex flex-col items-start gap-2 p-3 rounded-lg border transition-all duration-150 text-left"
              style={{
                backgroundColor: isSelected
                  ? (theme === 'dark' ? 'rgba(124, 110, 250, 0.08)' : 'rgba(124, 110, 250, 0.12)')
                  : (theme === 'dark' ? 'transparent' : 'rgba(255, 255, 255, 0.65)'),
                borderColor: isSelected
                  ? 'rgba(124, 110, 250, 0.5)'
                  : (theme === 'dark' ? 'var(--border-subtle)' : 'var(--border)'),
                color: isSelected ? 'var(--brand-hover)' : 'var(--text-muted)'
              }}
            >
              <Icon size={18} />
              <div>
                <div className="font-medium text-sm" style={{ fontSize: '13px' }}>
                  {option.label}
                </div>
                <div className="text-xs mt-0.5" style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  opacity: 0.8
                }}>
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
