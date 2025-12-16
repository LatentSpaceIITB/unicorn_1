/**
 * Audio Manager for Read the Room
 *
 * Handles all game audio using Howler.js:
 * - SFX: Text blips, stat changes, UI feedback
 * - BGM: Dynamic music that reacts to game state
 */

import { Howl, Howler } from 'howler';

export type MusicState = 'icebreaker' | 'engaged' | 'tension' | 'awkward' | 'crash' | 'silent';

// Volume levels
const VOLUME = {
  SFX: 0.5,
  BGM_MUSIC: 0.3,
  BGM_AMBIENT: 0.15,
  BLIP: 0.2,
};

// Fade durations (ms)
const FADE_DURATION = 2000;

class AudioManager {
  private initialized = false;
  private muted = false;

  // SFX sounds
  private blips: Howl[] = [];
  private blipIndex = 0;
  private sendSound: Howl | null = null;
  private vibeUpSound: Howl | null = null;
  private vibeDownSound: Howl | null = null;
  private tensionPingSound: Howl | null = null;
  private warningSound: Howl | null = null;
  private gameOverSound: Howl | null = null;
  private successSound: Howl | null = null;

  // BGM tracks
  private cafeAmbient: Howl | null = null;
  private chillLofi: Howl | null = null;
  private tensionJazz: Howl | null = null;
  private awkwardSilence: Howl | null = null;

  private currentMusicTrack: Howl | null = null;
  private currentMusicState: MusicState = 'silent';

  /**
   * Initialize audio system - MUST be called after user interaction
   */
  init(): void {
    if (this.initialized) return;

    // Unlock audio context
    Howler.autoUnlock = true;

    // Load SFX
    this.loadSFX();

    // Load BGM
    this.loadBGM();

    this.initialized = true;
    console.log('[Audio] Initialized');
  }

  private loadSFX(): void {
    // Text blip sounds (pool of 3 for variation)
    for (let i = 1; i <= 3; i++) {
      const blip = new Howl({
        src: [`/audio/sfx/blip-${i}.mp3`],
        volume: VOLUME.BLIP,
        preload: true,
      });
      this.blips.push(blip);
    }

    this.sendSound = new Howl({
      src: ['/audio/sfx/send.mp3'],
      volume: VOLUME.SFX,
      preload: true,
    });

    this.vibeUpSound = new Howl({
      src: ['/audio/sfx/vibe-up.mp3'],
      volume: VOLUME.SFX,
      preload: true,
    });

    this.vibeDownSound = new Howl({
      src: ['/audio/sfx/vibe-down.mp3'],
      volume: VOLUME.SFX,
      preload: true,
    });

    this.tensionPingSound = new Howl({
      src: ['/audio/sfx/tension-ping.mp3'],
      volume: VOLUME.SFX,
      preload: true,
    });

    this.warningSound = new Howl({
      src: ['/audio/sfx/warning.mp3'],
      volume: VOLUME.SFX,
      preload: true,
    });

    this.gameOverSound = new Howl({
      src: ['/audio/sfx/game-over.mp3'],
      volume: VOLUME.SFX,
      preload: true,
    });

    this.successSound = new Howl({
      src: ['/audio/sfx/success.mp3'],
      volume: VOLUME.SFX,
      preload: true,
    });
  }

  private loadBGM(): void {
    this.cafeAmbient = new Howl({
      src: ['/audio/bgm/cafe-ambient.mp3'],
      volume: VOLUME.BGM_AMBIENT,
      loop: true,
      preload: true,
    });

    this.chillLofi = new Howl({
      src: ['/audio/bgm/chill-lofi.mp3'],
      volume: 0, // Start silent, fade in
      loop: true,
      preload: true,
    });

    this.tensionJazz = new Howl({
      src: ['/audio/bgm/tension-jazz.mp3'],
      volume: 0,
      loop: true,
      preload: true,
    });

    this.awkwardSilence = new Howl({
      src: ['/audio/bgm/awkward-silence.mp3'],
      volume: 0,
      loop: true,
      preload: true,
    });
  }

  // =========================================================================
  // SFX Methods
  // =========================================================================

  /**
   * Play a random blip sound (for text typing)
   */
  playBlip(): void {
    if (!this.initialized || this.muted) return;

    // Round-robin through blips for natural variation
    const blip = this.blips[this.blipIndex];
    if (blip) {
      blip.play();
      this.blipIndex = (this.blipIndex + 1) % this.blips.length;
    }
  }

  /**
   * Play send/submit sound
   */
  playSend(): void {
    if (!this.initialized || this.muted) return;
    this.sendSound?.play();
  }

  /**
   * Play stat change sound based on delta direction
   */
  playStatChange(delta: number): void {
    if (!this.initialized || this.muted) return;

    if (delta > 0) {
      this.vibeUpSound?.play();
    } else if (delta < 0) {
      this.vibeDownSound?.play();
    }
  }

  /**
   * Play tension ping (high tension moment)
   */
  playTensionPing(): void {
    if (!this.initialized || this.muted) return;
    this.tensionPingSound?.play();
  }

  /**
   * Play silence warning sound
   */
  playWarning(): void {
    if (!this.initialized || this.muted) return;
    this.warningSound?.play();
  }

  /**
   * Play ending sound based on rank
   */
  playEnding(rank: string): void {
    if (!this.initialized || this.muted) return;

    // Stop BGM
    this.stopAllBGM();

    // Play appropriate ending sound
    if (rank === 'S' || rank === 'A' || rank === 'B') {
      this.successSound?.play();
    } else {
      this.gameOverSound?.play();
    }
  }

  // =========================================================================
  // BGM Methods
  // =========================================================================

  /**
   * Start the ambient background (cafe sounds)
   */
  startAmbient(): void {
    if (!this.initialized || this.muted) return;

    if (this.cafeAmbient && !this.cafeAmbient.playing()) {
      this.cafeAmbient.play();
    }
  }

  /**
   * Set music state based on game stats
   */
  setMusicState(state: MusicState): void {
    if (!this.initialized || state === this.currentMusicState) return;

    console.log(`[Audio] Music state: ${this.currentMusicState} -> ${state}`);

    // Start ambient if not playing
    this.startAmbient();

    // Determine target track
    let targetTrack: Howl | null = null;

    switch (state) {
      case 'icebreaker':
      case 'engaged':
        targetTrack = this.chillLofi;
        break;
      case 'tension':
        targetTrack = this.tensionJazz;
        break;
      case 'awkward':
        targetTrack = this.awkwardSilence;
        break;
      case 'crash':
      case 'silent':
        targetTrack = null;
        break;
    }

    // Crossfade to new track
    this.crossfadeTo(targetTrack);
    this.currentMusicState = state;
  }

  private crossfadeTo(newTrack: Howl | null): void {
    // Fade out current track
    if (this.currentMusicTrack && this.currentMusicTrack !== newTrack) {
      const oldTrack = this.currentMusicTrack;
      oldTrack.fade(oldTrack.volume(), 0, FADE_DURATION);
      setTimeout(() => {
        if (oldTrack !== this.currentMusicTrack) {
          oldTrack.stop();
        }
      }, FADE_DURATION);
    }

    // Fade in new track
    if (newTrack) {
      if (!newTrack.playing()) {
        newTrack.play();
      }
      newTrack.fade(newTrack.volume(), VOLUME.BGM_MUSIC, FADE_DURATION);
      this.currentMusicTrack = newTrack;
    } else {
      this.currentMusicTrack = null;
    }
  }

  private stopAllBGM(): void {
    this.cafeAmbient?.fade(this.cafeAmbient.volume(), 0, FADE_DURATION / 2);
    this.chillLofi?.fade(this.chillLofi.volume(), 0, FADE_DURATION / 2);
    this.tensionJazz?.fade(this.tensionJazz.volume(), 0, FADE_DURATION / 2);
    this.awkwardSilence?.fade(this.awkwardSilence.volume(), 0, FADE_DURATION / 2);

    setTimeout(() => {
      this.cafeAmbient?.stop();
      this.chillLofi?.stop();
      this.tensionJazz?.stop();
      this.awkwardSilence?.stop();
    }, FADE_DURATION / 2);
  }

  // =========================================================================
  // Control Methods
  // =========================================================================

  /**
   * Mute all audio
   */
  mute(): void {
    this.muted = true;
    Howler.mute(true);
  }

  /**
   * Unmute all audio
   */
  unmute(): void {
    this.muted = false;
    Howler.mute(false);
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Clean up all audio
   */
  destroy(): void {
    Howler.unload();
    this.initialized = false;
  }
}

// Singleton instance
export const audioManager = new AudioManager();
