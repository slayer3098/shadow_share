export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{
      backgroundColor: 'var(--background)',
      backgroundImage: 'radial-gradient(circle at center, rgba(28, 32, 48, 0.4) 0%, rgba(10, 12, 18, 1) 100%)',
    }}>
      {/* Animated noise/grain background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        pointerEvents: 'none'
      }} />

      <div className="text-center relative z-10">
        <h1 className="mb-6" style={{
          fontSize: '96px',
          fontWeight: 600,
          color: 'var(--brand-accent)',
          lineHeight: '1'
        }}>
          404
        </h1>
        <h2 className="mb-6" style={{
          fontSize: '24px',
          color: 'var(--text-secondary)'
        }}>
          Nothing here.
        </h2>
        <a
          href="/"
          className="inline-block text-sm hover:underline"
          style={{
            color: 'var(--brand-accent)',
            fontSize: '14px'
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
