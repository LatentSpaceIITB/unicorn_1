'use client';

import { useEffect, useState } from 'react';
import { SteamParticle, ParticleLayer, LayerConfig } from '../types';

const LAYER_CONFIGS: Record<ParticleLayer, LayerConfig> = {
  back: {
    zIndex: 1,
    blur: 12,
    colors: ['#FFF5E6', '#FFF0DB', '#FFECD0'],
    opacityRange: [0.08, 0.15],
    sizeRange: [40, 80],
    durationRange: [25, 35],
  },
  front: {
    zIndex: 3,
    blur: 6,
    colors: ['#FFFAF0', '#FFF8E7', '#FFFBF0'],
    opacityRange: [0.15, 0.25],
    sizeRange: [60, 120],
    durationRange: [18, 25],
  },
};

interface SteamWispsProps {
  layer: ParticleLayer;
  count: number;
}

export function SteamWisps({ layer, count }: SteamWispsProps) {
  const [particles, setParticles] = useState<SteamParticle[]>([]);
  const config = LAYER_CONFIGS[layer];

  useEffect(() => {
    const newParticles: SteamParticle[] = [];

    for (let i = 0; i < count; i++) {
      const [minSize, maxSize] = config.sizeRange;
      const [minDur, maxDur] = config.durationRange;

      newParticles.push({
        id: i,
        x: Math.random() * 100,
        size: minSize + Math.random() * (maxSize - minSize),
        duration: minDur + Math.random() * (maxDur - minDur),
        delay: Math.random() * 20,
        drift: (Math.random() - 0.5) * (layer === 'front' ? 60 : 40),
      });
    }

    setParticles(newParticles);
  }, [count, layer, config.sizeRange, config.durationRange]);

  const animationName = layer === 'back' ? 'steam-rise-back' : 'steam-rise-front';

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: config.zIndex }}
      aria-hidden="true"
    >
      {particles.map((particle) => {
        const color = config.colors[particle.id % config.colors.length];
        const [minOpacity, maxOpacity] = config.opacityRange;
        const peakOpacity = minOpacity + Math.random() * (maxOpacity - minOpacity);

        return (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              bottom: '-80px',
              width: particle.size,
              height: particle.size,
              background: `radial-gradient(
                ellipse at center,
                ${color} 0%,
                rgba(255, 250, 240, ${peakOpacity * 0.6}) 40%,
                transparent 70%
              )`,
              filter: `blur(${config.blur}px)`,
              animation: `${animationName} ${particle.duration}s linear infinite`,
              animationDelay: `${particle.delay}s`,
              '--drift': `${particle.drift}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
