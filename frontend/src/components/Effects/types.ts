export type ParticleLayer = 'back' | 'front';

export interface SteamParticle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

export interface DustParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  opacityStart: number;
  opacityPeak: number;
}

export interface LayerConfig {
  zIndex: number;
  blur: number;
  colors: string[];
  opacityRange: [number, number];
  sizeRange: [number, number];
  durationRange: [number, number];
}
