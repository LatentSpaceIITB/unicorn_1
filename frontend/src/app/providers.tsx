'use client';

import { AudioProvider } from '@/contexts/AudioContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AudioProvider>{children}</AudioProvider>;
}
