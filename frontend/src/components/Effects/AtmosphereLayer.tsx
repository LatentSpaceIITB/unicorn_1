'use client';

import { SteamWisps } from './particles/SteamWisps';
import { FloatingDust } from './particles/FloatingDust';
import { AmbientHaze } from './ambient/AmbientHaze';
import { WarmGlow } from './ambient/WarmGlow';
import { useViewportParticles } from './hooks/useViewportParticles';

interface AtmosphereLayerProps {
  enabled?: boolean;
  intensity?: 'subtle' | 'normal' | 'dense';
}

export function AtmosphereLayer({
  enabled = true,
  intensity = 'normal',
}: AtmosphereLayerProps) {
  const particleConfig = useViewportParticles();

  if (!enabled) return null;

  // Intensity multiplier
  const multiplier = intensity === 'subtle' ? 0.6 : intensity === 'dense' ? 1.4 : 1;

  return (
    <>
      {/* Ambient light source */}
      <WarmGlow />

      {/* Back layer particles (distant, slower, more blurred) */}
      <SteamWisps
        layer="back"
        count={Math.round(particleConfig.steam.back * multiplier)}
      />
      <FloatingDust
        layer="back"
        count={Math.round(particleConfig.dust.back * multiplier)}
      />

      {/* Fog/haze layer */}
      <AmbientHaze />

      {/* Front layer particles (closer, faster, sharper) */}
      <SteamWisps
        layer="front"
        count={Math.round(particleConfig.steam.front * multiplier)}
      />
      <FloatingDust
        layer="front"
        count={Math.round(particleConfig.dust.front * multiplier)}
      />
    </>
  );
}
