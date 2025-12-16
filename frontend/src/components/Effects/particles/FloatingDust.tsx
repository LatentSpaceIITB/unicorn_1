'use client';

import { useEffect, useState } from 'react';
import { DustParticle, ParticleLayer, LayerConfig } from '../types';

const LAYER_CONFIGS: Record<ParticleLayer, LayerConfig> = {
  back: {
    zIndex: 1,
    blur: 1,
    colors: ['#FFB300', '#FFC233', '#FFD166'],
    opacityRange: [0.03, 0.08],
    sizeRange: [2, 4],
    durationRange: [40, 60],
  },
  front: {
    zIndex: 3,
    blur: 0.5,
    colors: ['#FFE4B5', '#FFEAC7', '#FFF0D9'],
    opacityRange: [0.06, 0.12],
    sizeRange: [3, 6],
    durationRange: [25, 40],
  },
};

interface FloatingDustProps {
  layer: ParticleLayer;
  count: number;
}

export function FloatingDust({ layer, count }: FloatingDustProps) {
  const [particles, setParticles] = useState<DustParticle[]>([]);
  const config = LAYER_CONFIGS[layer];

  useEffect(() => {
    const newParticles: DustParticle[] = [];
    const [minSize, maxSize] = config.sizeRange;
    const [minDur, maxDur] = config.durationRange;
    const [minOpacity, maxOpacity] = config.opacityRange;

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: minSize + Math.random() * (maxSize - minSize),
        duration: minDur + Math.random() * (maxDur - minDur),
        delay: Math.random() * 30,
        driftX: (Math.random() - 0.5) * (layer === 'front' ? 80 : 40),
        driftY: -20 - Math.random() * (layer === 'front' ? 60 : 30),
        opacityStart: minOpacity + Math.random() * (maxOpacity - minOpacity) * 0.5,
        opacityPeak: minOpacity + Math.random() * (maxOpacity - minOpacity),
      });
    }

    setParticles(newParticles);
  }, [count, layer, config.sizeRange, config.durationRange, config.opacityRange]);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: config.zIndex }}
      aria-hidden="true"
    >
      {particles.map((particle) => {
        const color = config.colors[particle.id % config.colors.length];

        return (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: color,
              filter: `blur(${config.blur}px)`,
              animation: `dust-float ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              '--dust-drift-x': `${particle.driftX}px`,
              '--dust-drift-y': `${particle.driftY}px`,
              '--dust-opacity-start': particle.opacityStart,
              '--dust-opacity-peak': particle.opacityPeak,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
