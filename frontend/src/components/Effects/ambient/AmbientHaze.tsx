'use client';

export function AmbientHaze() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0"
      style={{
        height: '35%',
        zIndex: 2,
        background: `linear-gradient(
          to top,
          rgba(26, 21, 16, 0.5) 0%,
          rgba(26, 21, 16, 0.3) 40%,
          rgba(26, 21, 16, 0.1) 70%,
          transparent 100%
        )`,
        animation: 'haze-breathe 10s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  );
}
