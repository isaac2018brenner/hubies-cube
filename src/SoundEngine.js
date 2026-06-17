/**
 * SoundEngine.js
 * Pure Web Audio API sound generation — no files needed.
 * Pixel-art / chiptune style bleeps and tones.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._init();
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      console.warn('Web Audio not supported');
      this.enabled = false;
    }
  }

  // Resume context on first user interaction (browser requirement)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ── Core tone generator ────────────────────────────────────────────────────

  _tone(freq, duration, type = 'square', volume = 0.15, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  _noise(duration, volume = 0.05, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    source.start(t);
  }

  // ── Sound events ──────────────────────────────────────────────────────────

  // Game loads — ascending arpeggio
  playLoad() {
    [262, 330, 392, 523].forEach((freq, i) => {
      this._tone(freq, 0.12, 'square', 0.12, i * 0.08);
    });
  }

  // Move up
  playMoveUp() {
    this._tone(330, 0.06, 'square', 0.12);
    this._tone(440, 0.06, 'square', 0.10, 0.06);
  }

  // Move down
  playMoveDown() {
    this._tone(440, 0.06, 'square', 0.12);
    this._tone(330, 0.06, 'square', 0.10, 0.06);
  }

  // Move left
  playMoveLeft() {
    this._tone(349, 0.07, 'square', 0.12);
    this._tone(294, 0.07, 'square', 0.10, 0.05);
  }

  // Move right
  playMoveRight() {
    this._tone(294, 0.07, 'square', 0.12);
    this._tone(349, 0.07, 'square', 0.10, 0.05);
  }

  // Face transition — whoosh feel
  playFaceTransition() {
    this._tone(220, 0.18, 'sine', 0.10);
    this._tone(330, 0.12, 'sine', 0.08, 0.10);
    this._noise(0.15, 0.04);
  }

  // Swap color — distinct click + tone
  playSwap() {
    this._tone(523, 0.05, 'square', 0.15);
    this._tone(659, 0.08, 'square', 0.12, 0.05);
  }

  // Blocked — low buzzer
  playBlocked() {
    this._tone(110, 0.12, 'sawtooth', 0.12);
    this._tone(98,  0.10, 'sawtooth', 0.10, 0.06);
  }

  // Face completed — short fanfare
  playFaceComplete() {
    [392, 523, 659, 784].forEach((freq, i) => {
      this._tone(freq, 0.10, 'square', 0.14, i * 0.07);
    });
  }

  // Game won — full victory jingle
  playWin() {
    const melody = [
      [523, 0.10], [659, 0.10], [784, 0.10],
      [1047, 0.20], [784, 0.10], [1047, 0.30]
    ];
    let t = 0;
    melody.forEach(([freq, dur]) => {
      this._tone(freq, dur, 'square', 0.15, t);
      t += dur + 0.02;
    });
  }

  // Direction helper — plays correct move sound based on direction
  playMove(direction) {
    switch(direction) {
      case 'UP':    this.playMoveUp();    break;
      case 'DOWN':  this.playMoveDown();  break;
      case 'LEFT':  this.playMoveLeft();  break;
      case 'RIGHT': this.playMoveRight(); break;
    }
  }
}

window.SoundEngine = SoundEngine;
