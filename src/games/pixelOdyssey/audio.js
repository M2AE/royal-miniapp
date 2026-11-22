// Pure Web Audio API 16-bit Chiptune SFX & Retro Adventure Music Engine

class PixelAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicEnabled = true;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bossMode = false;
  }

  unlock() {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (_) {
      /* ignore */
    }
  }

  setMuted(m) {
    this.muted = Boolean(m);
    if (this.muted) this.stopMusic();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (!this.musicEnabled) this.stopMusic();
  }

  _tone({ freq = 440, endFreq = null, dur = 0.1, type = 'square', vol = 0.075, delay = 0 }) {
    if (this.muted || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (_) {
      /* ignore */
    }
  }

  _noise({ dur = 0.1, vol = 0.06, delay = 0 }) {
    if (this.muted || !this.ctx) return;
    try {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.max(1, Math.floor(sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      const t0 = this.ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(t0);
    } catch (_) {
      /* ignore */
    }
  }

  play(sfx) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    switch (sfx) {
      case 'jump':
        this._tone({ freq: 240, endFreq: 560, dur: 0.11, type: 'square', vol: 0.055 });
        break;
      case 'doubleJump':
        this._tone({ freq: 380, endFreq: 780, dur: 0.09, type: 'triangle', vol: 0.075 });
        this._tone({ freq: 560, endFreq: 980, dur: 0.09, type: 'square', vol: 0.045, delay: 0.04 });
        break;
      case 'spring':
        this._tone({ freq: 180, endFreq: 960, dur: 0.22, type: 'triangle', vol: 0.095 });
        break;
      case 'coin':
        this._tone({ freq: 988, endFreq: 1318, dur: 0.06, type: 'square', vol: 0.045 });
        this._tone({ freq: 1318, endFreq: 1568, dur: 0.11, type: 'square', vol: 0.045, delay: 0.05 });
        break;
      case 'gem':
        this._tone({ freq: 784, dur: 0.07, type: 'triangle', vol: 0.065 });
        this._tone({ freq: 1046, dur: 0.07, type: 'triangle', vol: 0.065, delay: 0.05 });
        this._tone({ freq: 1568, dur: 0.15, type: 'sine', vol: 0.075, delay: 0.1 });
        break;
      case 'sword':
        this._noise({ dur: 0.08, vol: 0.06 });
        this._tone({ freq: 440, endFreq: 140, dur: 0.09, type: 'sawtooth', vol: 0.045 });
        break;
      case 'bow':
        this._tone({ freq: 640, endFreq: 260, dur: 0.08, type: 'triangle', vol: 0.06 });
        break;
      case 'fire':
        this._noise({ dur: 0.14, vol: 0.07 });
        this._tone({ freq: 290, endFreq: 90, dur: 0.15, type: 'sawtooth', vol: 0.06 });
        break;
      case 'frost':
        this._tone({ freq: 1200, endFreq: 680, dur: 0.09, type: 'sine', vol: 0.055 });
        this._tone({ freq: 1520, endFreq: 920, dur: 0.08, type: 'triangle', vol: 0.05, delay: 0.03 });
        break;
      case 'thunder':
        this._noise({ dur: 0.13, vol: 0.08 });
        this._tone({ freq: 920, endFreq: 180, dur: 0.16, type: 'sawtooth', vol: 0.055 });
        break;
      case 'cannon':
        this._noise({ dur: 0.16, vol: 0.085 });
        this._tone({ freq: 220, endFreq: 65, dur: 0.18, type: 'square', vol: 0.075 });
        this._tone({ freq: 680, endFreq: 220, dur: 0.12, type: 'triangle', vol: 0.055, delay: 0.02 });
        break;
      case 'ultimate':
        this._noise({ dur: 0.35, vol: 0.1 });
        [330, 440, 659, 880, 1318, 1760].forEach((f, idx) => {
          this._tone({ freq: f, endFreq: f * 1.15, dur: 0.16, type: 'sawtooth', vol: 0.055, delay: idx * 0.045 });
        });
        break;
      case 'stomp':
        this._tone({ freq: 320, endFreq: 140, dur: 0.08, type: 'square', vol: 0.075 });
        this._tone({ freq: 440, endFreq: 680, dur: 0.08, type: 'triangle', vol: 0.06, delay: 0.04 });
        break;
      case 'hit':
        this._tone({ freq: 240, endFreq: 90, dur: 0.07, type: 'square', vol: 0.055 });
        break;
      case 'enemyDie':
        this._noise({ dur: 0.11, vol: 0.07 });
        this._tone({ freq: 360, endFreq: 80, dur: 0.14, type: 'sawtooth', vol: 0.055 });
        break;
      case 'chest':
        [523, 659, 784, 1046].forEach((f, idx) => {
          this._tone({ freq: f, dur: 0.11, type: 'square', vol: 0.055, delay: idx * 0.06 });
        });
        break;
      case 'powerup':
        [440, 554, 659, 880, 1108].forEach((f, idx) => {
          this._tone({ freq: f, dur: 0.09, type: 'triangle', vol: 0.065, delay: idx * 0.045 });
        });
        break;
      case 'dash':
        this._noise({ dur: 0.09, vol: 0.05 });
        this._tone({ freq: 340, endFreq: 760, dur: 0.09, type: 'sine', vol: 0.06 });
        break;
      case 'hurt':
        this._noise({ dur: 0.15, vol: 0.09 });
        this._tone({ freq: 180, endFreq: 70, dur: 0.2, type: 'sawtooth', vol: 0.085 });
        break;
      case 'bossWarn':
        [220, 185, 220, 165].forEach((f, idx) => {
          this._tone({ freq: f, dur: 0.18, type: 'sawtooth', vol: 0.065, delay: idx * 0.19 });
        });
        break;
      case 'bossDefeat':
        [523, 659, 784, 1046, 988, 1046, 1318, 1568].forEach((f, idx) => {
          this._tone({ freq: f, dur: 0.14, type: 'square', vol: 0.06, delay: idx * 0.075 });
        });
        break;
      case 'gameOver':
        [392, 349, 311, 261, 196].forEach((f, idx) => {
          this._tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.07, delay: idx * 0.12 });
        });
        break;
      case 'buy':
        this._tone({ freq: 659, dur: 0.08, type: 'triangle', vol: 0.065 });
        this._tone({ freq: 880, dur: 0.08, type: 'triangle', vol: 0.065, delay: 0.07 });
        this._tone({ freq: 1318, dur: 0.16, type: 'sine', vol: 0.075, delay: 0.14 });
        break;
      default:
        break;
    }
  }

  startMusic(bossMode = false) {
    this.bossMode = bossMode;
    if (this.muted || !this.musicEnabled) return;
    this.unlock();
    if (this.bgmTimer) return;

    const adventureMelody = [
      293.66, 0, 349.23, 440.0, 523.25, 0, 440.0, 392.0,
      349.23, 0, 329.63, 293.66, 329.63, 0, 261.63, 0,
      293.66, 0, 349.23, 440.0, 587.33, 0, 523.25, 440.0,
      392.0, 440.0, 349.23, 329.63, 293.66, 0, 0, 0,
    ];
    const adventureBass = [
      146.83, 146.83, 174.61, 174.61, 130.81, 130.81, 196.0, 196.0,
      116.54, 116.54, 130.81, 130.81, 146.83, 146.83, 110.0, 110.0,
    ];
    const bossMelody = [
      220.0, 233.08, 220.0, 196.0, 261.63, 246.94, 220.0, 0,
      293.66, 277.18, 261.63, 220.0, 329.63, 0, 311.13, 293.66,
    ];

    const tick = () => {
      if (this.muted || !this.musicEnabled || !this.ctx) return;
      const idx = this.bgmStep;
      const mel = this.bossMode ? bossMelody : adventureMelody;
      const note = mel[idx % mel.length];
      if (note > 0) {
        this._tone({
          freq: note,
          dur: this.bossMode ? 0.11 : 0.14,
          type: this.bossMode ? 'sawtooth' : 'square',
          vol: this.bossMode ? 0.022 : 0.018,
        });
      }
      if (idx % 2 === 0) {
        const bass = adventureBass[(idx >> 1) % adventureBass.length];
        this._tone({
          freq: this.bossMode ? bass * 0.75 : bass,
          dur: 0.22,
          type: 'triangle',
          vol: 0.028,
        });
      }
      this.bgmStep = (this.bgmStep + 1) % 64;
    };

    this.bgmTimer = window.setInterval(tick, 170);
  }

  setBossMode(isBoss) {
    this.bossMode = Boolean(isBoss);
  }

  stopMusic() {
    if (this.bgmTimer) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const pixelAudio = new PixelAudioEngine();
