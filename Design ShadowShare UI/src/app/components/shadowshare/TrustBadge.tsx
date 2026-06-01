import { LucideIcon } from 'lucide-react';

export function TrustBadge({
  icon: Icon,
  text
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm"
         style={{
           backgroundColor: 'var(--elevated)',
           borderColor: 'var(--border-subtle)',
           color: 'var(--text-secondary)',
           fontSize: '13px'
         }}>
      <Icon size={14} style={{ color: 'var(--brand-accent)' }} />
      <span>{text}</span>
    </div>
  );
}
