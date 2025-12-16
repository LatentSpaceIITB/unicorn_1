'use client';

export function WarmGlow() {
  return (
    <div
      className="pointer-events-none fixed bottom-0 left-1/2"
      style={{
        width: '150%',
        height: '40%',
        zIndex: 0,
        background: `radial-gradient(
          ellipse at 50% 100%,
          rgba(255, 179, 0, 0.08) 0%,
          rgba(255, 179, 0, 0.04) 30%,
          rgba(255, 179, 0, 0.02) 50%,
          transparent 70%
        )`,
        transform: 'translateX(-50%)',
        animation: 'glow-pulse 8s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  );
}
