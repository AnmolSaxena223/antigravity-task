import { store } from '../store';

class AudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (browser security block)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Check if sounds are muted in user settings
   */
  private get volume(): number {
    const state = store.getState().ui;
    return state.soundEnabled ? state.soundVolume : 0;
  }

  /**
   * Retro arcade click sound
   */
  public playClick() {
    if (this.volume === 0) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  /**
   * Sound effect for dice rolling (simulated rumbling noise)
   */
  public playDiceRoll() {
    if (this.volume === 0) return;
    const ctx = this.getContext();
    
    // Generate white noise for the dice rumble
    const bufferSize = ctx.sampleRate * 0.3; // 0.3 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Apply lowpass filter to make it sound rumbling/low pitch
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseNode.start();
    noiseNode.stop(ctx.currentTime + 0.3);
  }

  /**
   * Sound effect for token hopping
   */
  public playTokenMove() {
    if (this.volume === 0) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /**
   * Sound effect for capturing an opponent
   */
  public playCapture() {
    if (this.volume === 0) return;
    const ctx = this.getContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.4);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(820, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  }

  /**
   * Sound effect for token reaching home (successful run)
   */
  public playTokenHome() {
    if (this.volume === 0) return;
    const ctx = this.getContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + index * 0.1);

      gain.gain.setValueAtTime(this.volume * 0.4, startTime + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + index * 0.1 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + index * 0.1);
      osc.stop(startTime + index * 0.1 + 0.15);
    });
  }

  /**
   * Triumphant fanfare sound for match wins
   */
  public playWinningFanfare() {
    if (this.volume === 0) return;
    const ctx = this.getContext();
    const startTime = ctx.currentTime;
    
    // Play a victorious major chord progression
    const progression = [
      { notes: [261.63, 329.63, 392.00], duration: 0.15 }, // C4 major
      { notes: [349.23, 440.00, 523.25], duration: 0.15 }, // F4 major
      { notes: [392.00, 493.88, 587.33], duration: 0.15 }, // G4 major
      { notes: [523.25, 659.25, 783.99, 1046.50], duration: 0.5 } // C5 major triumphant
    ];

    let currentOffset = 0;
    progression.forEach((chord) => {
      chord.notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime + currentOffset);

        gain.gain.setValueAtTime(this.volume * 0.2, startTime + currentOffset);
        gain.gain.exponentialRampToValueAtTime(0.005, startTime + currentOffset + chord.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + currentOffset);
        osc.stop(startTime + currentOffset + chord.duration);
      });
      currentOffset += chord.duration - 0.02; // overlap slightly
    });
  }
}

export const audioSynth = new AudioSynthesizer();
export default audioSynth;
