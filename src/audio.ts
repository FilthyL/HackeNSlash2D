/** Small, gesture-unlocked sound palette. No downloads; the storm bed shares the user-controlled master mute. */
export class Soundscape {
  enabled = false;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private voices = 0;
  private stormStarted = false;
  private paused = false;
  private recent = new Map<string, number>();

  async toggle(): Promise<boolean> {
    if (this.enabled) {
      this.enabled = false;
      if (this.context && this.master) {
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(0, now, 0.025);
      }
      return false;
    }
    try {
      // Called only by an explicit UI gesture, including on Safari.
      if (!this.context) {
        const browser = window as Window & { webkitAudioContext?: typeof AudioContext };
        const Context =
          typeof AudioContext !== 'undefined' ? AudioContext : browser.webkitAudioContext;
        if (!Context) return false;
        const context = new Context();
        this.context = context;
        const master = context.createGain();
        const limiter = context.createDynamicsCompressor();
        master.gain.value = 0;
        limiter.threshold.value = -17;
        limiter.knee.value = 18;
        limiter.ratio.value = 5;
        limiter.attack.value = 0.004;
        limiter.release.value = 0.18;
        master.connect(limiter);
        limiter.connect(context.destination);
        this.master = master;
        const noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
        this.noiseBuffer = noiseBuffer;
        const samples = noiseBuffer.getChannelData(0);
        let seed = 7649;
        for (let i = 0; i < samples.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          samples[i] = seed / 2147483648 - 1;
        }
      }
      const context = this.context;
      if (!context) return false;
      if (context.state === 'suspended') await context.resume();
      if (context.state !== 'running' || !this.master) return false;
      this.enabled = true;
      const now = context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.paused ? 0 : 0.19, now, 0.04);
      this.startStorm();
      this.play('bell');
      return true;
    } catch {
      this.enabled = false;
      return false;
    }
  }

  play(event: string): void {
    if (!this.enabled || !this.context || this.context.state !== 'running' || !this.master) return;
    const now = this.context.currentTime;
    if (now - (this.recent.get(event) ?? -100) < 0.055) return;
    this.recent.set(event, now);
    switch (event) {
      case 'thunder':
        this.air(2.8, 140, 0.8, 'lowpass');
        this.tone(55, 24, 2.5, 0.6);
        this.air(1.8, 320, 0.22, 'lowpass', 0.35);
        break;
      case 'slash':
        this.air(0.15, 1700, 0.42, 'highpass');
        this.tone(720, 240, 0.09, 0.1, 'triangle');
        break;
      case 'draw':
        this.air(0.36, 2300, 0.5, 'highpass');
        this.chime(660, 1, 0.35);
        this.tone(100, 30, 0.5, 0.5);
        break;
      case 'heavy':
        this.air(0.34, 750, 0.45, 'bandpass');
        this.tone(135, 46, 0.36, 0.7, 'sine', 0.1);
        break;
      case 'hit':
        this.air(0.09, 2100, 0.52, 'bandpass');
        this.tone(160, 57, 0.17, 0.65);
        this.tone(1540, 970, 0.075, 0.12, 'triangle');
        break;
      case 'hurt':
        this.tone(94, 32, 0.32, 0.85);
        this.air(0.22, 450, 0.45, 'lowpass');
        break;
      case 'dodge':
        this.air(0.23, 1100, 0.42, 'bandpass');
        break;
      case 'parry':
        this.air(0.06, 3500, 0.55, 'highpass');
        this.chime(880, 0.82, 0.4);
        break;
      case 'bossAttack':
        this.tone(89, 33, 0.48, 0.9);
        this.air(0.26, 850, 0.7, 'bandpass');
        break;
      case 'phase':
        this.tone(72, 29, 1.45, 0.85);
        this.chime(196, 2.6, 0.45);
        this.air(1.2, 540, 0.3, 'lowpass', 0.15);
        break;
      case 'victory':
        this.chime(293.66, 2.8, 0.32);
        this.chime(440, 2.2, 0.22, 0.5);
        this.chime(587.33, 2.5, 0.16, 1.1);
        break;
      case 'defeat':
        this.tone(110, 41, 1.8, 0.45);
        this.chime(146.83, 2.6, 0.2, 0.15);
        break;
      case 'bell':
        this.chime(220, 2.8, 0.32);
        break;
    }
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        this.enabled && !paused ? 0.19 : 0,
        this.context.currentTime,
        0.08,
      );
  }

  private startStorm() {
    if (this.stormStarted || !this.context || !this.noiseBuffer || !this.master) return;
    const ctx = this.context,
      source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.4;
    gain.gain.value = 0.24;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    // A slow oscillator swells the rain bed into gusts without fetching audio assets.
    const gust = ctx.createOscillator(),
      depth = ctx.createGain();
    gust.frequency.value = 0.1;
    depth.gain.value = 0.09;
    gust.connect(depth);
    depth.connect(gain.gain);
    source.start();
    gust.start();
    this.stormStarted = true;
  }

  private chime(frequency: number, duration: number, volume: number, delay = 0) {
    // Inharmonic partials suggest struck bronze without a harsh square-wave tone.
    this.tone(frequency, frequency * 0.996, duration, volume, 'sine', delay);
    this.tone(frequency * 2.76, frequency * 2.75, duration * 0.58, volume * 0.32, 'sine', delay);
    this.tone(frequency * 5.4, frequency * 5.39, duration * 0.27, volume * 0.1, 'sine', delay);
  }

  private tone(
    start: number,
    end: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    delay = 0,
  ) {
    const context = this.context;
    if (!context || !this.master || this.voices >= 32) return;
    this.voices++;
    const source = context.createOscillator();
    const envelope = context.createGain();
    const at = context.currentTime + delay;
    source.type = type;
    source.frequency.setValueAtTime(start, at);
    source.frequency.exponentialRampToValueAtTime(Math.max(end, 1), at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(volume, 0.001), at + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(envelope);
    envelope.connect(this.master);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      this.voices--;
    };
    source.start(at);
    source.stop(at + duration + 0.015);
  }

  private air(
    duration: number,
    frequency: number,
    volume: number,
    type: BiquadFilterType,
    delay = 0,
  ) {
    const context = this.context;
    if (!context || !this.master || !this.noiseBuffer || this.voices >= 32) return;
    this.voices++;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const at = context.currentTime + delay;
    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.65;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.001),
      at + Math.min(0.04, duration / 3),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      this.voices--;
    };
    source.start(at);
    source.stop(at + duration + 0.015);
  }
}
