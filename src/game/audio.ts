export class YardAudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private hydroOsc: OscillatorNode | null = null;
  private hydroGain: GainNode | null = null;
  private muted = false;
  private started = false;
  private lastBeepTime = 0;

  public unlock(): void {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Diesel/Hydrostatic engine hum
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 54;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;

      const gain = ctx.createGain();
      gain.gain.value = 0.0;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      // Hydraulic mast motor whine
      const hOsc = ctx.createOscillator();
      hOsc.type = 'triangle';
      hOsc.frequency.value = 210;
      const hGain = ctx.createGain();
      hGain.gain.value = 0;
      hOsc.connect(hGain);
      hGain.connect(ctx.destination);
      hOsc.start();

      this.engineOsc = osc;
      this.engineFilter = filter;
      this.engineGain = gain;
      this.hydroOsc = hOsc;
      this.hydroGain = hGain;
      this.started = true;
    } catch {
      // Ignore if audio context is blocked
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.ctx) {
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      if (this.hydroGain) this.hydroGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public update(speedRatio: number, reversing: boolean, hydraulicMoving: boolean, elapsed: number): void {
    if (!this.started || !this.ctx || !this.engineOsc || !this.engineGain || !this.engineFilter || !this.hydroGain || !this.hydroOsc) {
      return;
    }

    const now = this.ctx.currentTime;
    if (this.muted || this.ctx.state !== 'running') {
      this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      this.hydroGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const absSpeed = Math.min(1, Math.abs(speedRatio));
    const targetFreq = 48 + absSpeed * 58;
    const targetCutoff = 160 + absSpeed * 260;
    const targetVol = 0.032 + absSpeed * 0.035;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.08);

    // Hydraulic whine when mast moves
    this.hydroOsc.frequency.setTargetAtTime(hydraulicMoving ? 245 : 190, now, 0.05);
    this.hydroGain.gain.setTargetAtTime(hydraulicMoving ? 0.025 : 0, now, 0.04);

    // Reverse safety beeper (every 0.62s)
    if (reversing && elapsed - this.lastBeepTime > 0.62) {
      this.lastBeepTime = elapsed;
      this.playTone(1150, 0.14, 0.038, 'square');
    }
  }

  public playHorn(): void {
    this.unlock();
    if (this.muted || !this.ctx) return;
    this.playTone(310, 0.24, 0.06, 'sawtooth');
    this.playTone(392, 0.24, 0.05, 'sawtooth');
  }

  public playPickup(): void {
    if (this.muted || !this.ctx) return;
    this.playTone(190, 0.09, 0.07, 'triangle');
    setTimeout(() => this.playTone(280, 0.11, 0.06, 'triangle'), 70);
  }

  public playDelivery(): void {
    if (this.muted || !this.ctx) return;
    this.playTone(523.25, 0.14, 0.06, 'sine');
    setTimeout(() => this.playTone(659.25, 0.16, 0.06, 'sine'), 100);
    setTimeout(() => this.playTone(783.99, 0.24, 0.07, 'sine'), 210);
  }

  public playBump(): void {
    if (this.muted || !this.ctx) return;
    this.playTone(95, 0.08, 0.05, 'triangle');
  }

  private playTone(freq: number, duration: number, volume: number, type: OscillatorType): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.started = false;
  }
}
