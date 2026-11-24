export class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
  }

  async init() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  tone(frequency, duration, type = 'sine', volume = 0.2, delay = 0, endFrequency = frequency) {
    if (!this.context || !this.master || this.muted) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  play(event) {
    if (event === 'collect') {
      this.tone(740, 0.11, 'sine', 0.16);
      this.tone(1100, 0.14, 'sine', 0.12, 0.055);
    }
    if (event === 'jump') this.tone(240, 0.2, 'triangle', 0.18, 0, 620);
    if (event === 'hit') {
      this.tone(150, 0.28, 'sawtooth', 0.2, 0, 55);
      this.tone(90, 0.32, 'square', 0.08, 0.03, 40);
    }
    if (event === 'finish') {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => this.tone(note, 0.28, 'triangle', 0.16, index * 0.11));
    }
    if (event === 'gameover') {
      [330, 277, 220].forEach((note, index) => this.tone(note, 0.3, 'triangle', 0.15, index * 0.16));
    }
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.32, this.context.currentTime, 0.02);
    return this.muted;
  }
}
