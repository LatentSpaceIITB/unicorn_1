'use client';

import { useState, useEffect } from 'react';

interface ParticleConfig {
  steam: { back: number; front: number };
  dust: { back: number; front: number };
}

export function useViewportParticles(): ParticleConfig {
  const [config, setConfig] = useState<ParticleConfig>({
    steam: { back: 10, front: 8 },
    dust: { back: 20, front: 12 },
  });

  useEffect(() => {
    const calculateParticles = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const area = (width * height) / 1000000; // Normalize to megapixels

      // Scale particles based on viewport area
      // Base: 1080p (2.07 megapixels)
      const scale = Math.max(0.5, Math.min(1.5, area / 2.07));

      setConfig({
        steam: {
          back: Math.round(10 * scale),
          front: Math.round(8 * scale),
        },
        dust: {
          back: Math.round(20 * scale),
          front: Math.round(12 * scale),
        },
      });
    };

    calculateParticles();
    window.addEventListener('resize', calculateParticles);
    return () => window.removeEventListener('resize', calculateParticles);
  }, []);

  return config;
}
