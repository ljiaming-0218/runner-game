type Tone = {
  type?: OscillatorType;
  freq: number;
  to?: number;
  dur: number;
  gain: number;
  attack?: number;
  noise?: boolean;
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  private nextBeat = 0;
  private step = 0;

  unlock() {
    const Ctx = window.AudioContext;
    if (!this.ctx) {
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.03);
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  jump() {
    this.tone({ type: "sine", freq: 240, to: 520, dur: 0.12, gain: 0.12 });
  }

  land() {
    this.tone({ type: "triangle", freq: 140, to: 60, dur: 0.1, gain: 0.14 });
    this.tone({ freq: 180, dur: 0.08, gain: 0.08, noise: true });
  }

  slide() {
    this.tone({ freq: 420, to: 180, dur: 0.16, gain: 0.06, noise: true });
  }

  coin(combo: number) {
    const f = 680 + Math.min(combo, 24) * 18;
    this.tone({ type: "square", freq: f, to: f * 1.5, dur: 0.09, gain: 0.05 });
  }

  near() {
    this.tone({ type: "sine", freq: 740, to: 980, dur: 0.1, gain: 0.06 });
  }

  hit() {
    this.tone({ freq: 200, to: 50, dur: 0.28, gain: 0.2, noise: true });
    this.tone({ type: "sine", freq: 180, to: 48, dur: 0.32, gain: 0.16 });
  }

  ui() {
    this.tone({ type: "sine", freq: 520, to: 680, dur: 0.08, gain: 0.06 });
  }

  music(dt: number, rate: number, active: boolean) {
    if (!this.ctx || this.muted || !active) {
      this.nextBeat = 0;
      return;
    }
    this.nextBeat -= dt;
    const interval = Math.max(0.26, 0.5 - rate * 0.22);
    if (this.nextBeat > 0) return;
    this.nextBeat += interval;
    const scale = [220, 262, 294, 330, 392, 330, 294, 262];
    const f = scale[this.step % scale.length]!;
    this.step += 1;
    this.tone({
      type: this.step % 4 === 0 ? "triangle" : "sine",
      freq: f,
      dur: 0.16,
      gain: this.step % 4 === 0 ? 0.035 : 0.02,
    });
  }

  private tone(spec: Tone) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.master);
    const peak = spec.gain * (0.9 + Math.random() * 0.15);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + (spec.attack ?? 0.012));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.dur);

    if (spec.noise) {
      const frames = Math.floor(this.ctx.sampleRate * spec.dur);
      const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(spec.freq, t);
      if (spec.to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, spec.to), t + spec.dur);
      src.connect(filter);
      filter.connect(gain);
      src.start(t);
      src.stop(t + spec.dur + 0.02);
      return;
    }

    const osc = this.ctx.createOscillator();
    osc.type = spec.type ?? "sine";
    osc.frequency.setValueAtTime(spec.freq, t);
    if (spec.to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.to), t + spec.dur);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + spec.dur + 0.02);
  }
}
