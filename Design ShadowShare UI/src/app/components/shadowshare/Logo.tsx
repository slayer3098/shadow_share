export function Logo({ className = "", showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2C10.067 2 8.5 3.567 8.5 5.5V8H7C5.895 8 5 8.895 5 10V20C5 21.105 5.895 22 7 22H17C18.105 22 19 21.105 19 20V10C19 8.895 18.105 8 17 8H15.5V5.5C15.5 3.567 13.933 2 12 2ZM10.5 5.5C10.5 4.672 11.172 4 12 4C12.828 4 13.5 4.672 13.5 5.5V6.5C13.5 6.776 13.276 7 13 7H11C10.724 7 10.5 6.776 10.5 6.5V5.5Z"
          fill="currentColor"
          className="text-[var(--brand-accent)]"
        />
      </svg>
      {showWordmark && (
        <span className="font-semibold text-lg" style={{ fontWeight: 600 }}>
          ShadowShare
        </span>
      )}
    </div>
  );
}
