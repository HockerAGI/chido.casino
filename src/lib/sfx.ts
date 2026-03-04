// src/lib/sfx.ts
/* eslint-disable no-restricted-globals */

type LoopKey = "slotSpin" | "crashTick";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export class SFXEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private enabled = true;
  private volume = 0.6;

  private loops = new Map<LoopKey, { stop: () => void }>();

  /** Llamar en el primer gesto del usuario (click/tap) para desbloquear audio en iOS/Android */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!AC) return;

      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx?.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stopAllLoops();
  }

  setVolume(v: number) {
    this.volume = clamp01(v);
    if (this.master) this.master.gain.value = this.volume;
  }

  private ok(): boolean {
    return !!this.ctx && !!this.master && this.enabled;
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private gainNode(level: number) {
    const g = this.ctx!.createGain();
    g.gain.value = level;
    g.connect(this.master!);
    return g;
  }

  private tone(opts: {
    freq: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    release?: number;
    detune?: number;
    when?: number;
  }) {
    if (!this.ok()) return;

    const {
      freq,
      dur,
      type = "sine",
      gain = 0.15,
      attack = 0.002,
      release = 0.02,
      detune = 0,
      when = 0,
    } = opts;

    const t0 = this.now() + when;
    const t1 = t0 + Math.max(0.01, dur);

    const osc = this.ctx!.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.setValueAtTime(detune, t0);

    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t1 + release);

    osc.connect(g);
    g.connect(this.master!);

    osc.start(t0);
    osc.stop(t1 + release + 0.02);
  }

  private noise(opts: {
    dur: number;
    gain?: number;
    filter?: { type: BiquadFilterType; freq: number; q?: number };
    when?: number;
  }) {
    if (!this.ok()) return;

    const { dur, gain = 0.10, filter, when = 0 } = opts;
    const t0 = this.now() + when;
    const t1 = t0 + Math.max(0.02, dur);

    // buffer de ruido blanco
    const len = Math.max(1, Math.floor(this.ctx!.sampleRate * dur));
    const buffer = this.ctx!.createBuffer(1, len, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.9;

    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;

    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.03);

    let node: AudioNode = src;
    if (filter) {
      const f = this.ctx!.createBiquadFilter();
      f.type = filter.type;
      f.frequency.setValueAtTime(filter.freq, t0);
      f.Q.setValueAtTime(filter.q ?? 0.8, t0);
      node.connect(f);
      node = f;
    }

    node.connect(g);
    g.connect(this.master!);

    src.start(t0);
    src.stop(t1 + 0.05);
  }

  // -------------------------
  // Public SFX
  // -------------------------

  uiClick() {
    this.unlock();
    if (!this.ok()) return;
    // click "crispy"
    this.tone({ freq: 1100, dur: 0.03, type: "square", gain: 0.10 });
    this.tone({ freq: 2400, dur: 0.015, type: "triangle", gain: 0.05, when: 0.01 });
  }

  slotStop() {
    this.unlock();
    if (!this.ok()) return;
    // "thunk" + tick
    this.noise({ dur: 0.05, gain: 0.09, filter: { type: "lowpass", freq: 900 } });
    this.tone({ freq: 620, dur: 0.05, type: "sawtooth", gain: 0.06 });
  }

  slotLose() {
    this.unlock();
    if (!this.ok()) return;
    this.tone({ freq: 220, dur: 0.09, type: "sine", gain: 0.10 });
    this.tone({ freq: 160, dur: 0.10, type: "triangle", gain: 0.06, when: 0.03 });
  }

  winSmall() {
    this.unlock();
    if (!this.ok()) return;
    // jingle corto
    this.tone({ freq: 880, dur: 0.08, type: "sine", gain: 0.10 });
    this.tone({ freq: 1175, dur: 0.10, type: "sine", gain: 0.08, when: 0.05 });
    this.tone({ freq: 1568, dur: 0.12, type: "sine", gain: 0.07, when: 0.10 });
  }

  winBig() {
    this.unlock();
    if (!this.ok()) return;
    // jingle más largo
    this.tone({ freq: 784, dur: 0.10, type: "sine", gain: 0.11 });
    this.tone({ freq: 988, dur: 0.12, type: "sine", gain: 0.10, when: 0.06 });
    this.tone({ freq: 1319, dur: 0.14, type: "sine", gain: 0.09, when: 0.12 });
    this.tone({ freq: 1760, dur: 0.18, type: "sine", gain: 0.08, when: 0.18 });
  }

  winMega() {
    this.unlock();
    if (!this.ok()) return;
    // "jackpot-ish"
    this.winBig();
    this.noise({ dur: 0.35, gain: 0.06, filter: { type: "highpass", freq: 1200 } });
    this.tone({ freq: 2093, dur: 0.25, type: "triangle", gain: 0.07, when: 0.22 });
    this.tone({ freq: 2637, dur: 0.25, type: "triangle", gain: 0.06, when: 0.28 });
  }

  slotSpinStart(turbo = false) {
    this.unlock();
    if (!this.ok()) return;
    this.stopLoop("slotSpin");

    // loop: ruido filtrado + zumbido bajo
    const ctx = this.ctx!;
    const master = this.master!;

    const gain = ctx.createGain();
    gain.gain.value = turbo ? 0.10 : 0.08;
    gain.connect(master);

    // ruido "reel"
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = turbo ? 1300 : 950;
    filt.Q.value = 0.9;

    noise.connect(filt);
    filt.connect(gain);

    // zumbido
    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = turbo ? 95 : 72;

    const humG = ctx.createGain();
    humG.gain.value = turbo ? 0.03 : 0.02;
    hum.connect(humG);
    humG.connect(gain);

    noise.start();
    hum.start();

    this.loops.set("slotSpin", {
      stop: () => {
        try {
          noise.stop();
          hum.stop();
        } catch {}
      },
    });
  }

  crashTickStart(turbo = false) {
    this.unlock();
    if (!this.ok()) return;
    this.stopLoop("crashTick");

    let alive = true;
    const interval = turbo ? 90 : 120;

    const tick = () => {
      if (!alive) return;
      // beep corto
      this.tone({ freq: turbo ? 1700 : 1450, dur: 0.03, type: "square", gain: 0.04 });
      setTimeout(tick, interval);
    };

    tick();

    this.loops.set("crashTick", {
      stop: () => {
        alive = false;
      },
    });
  }

  crashBust() {
    this.unlock();
    if (!this.ok()) return;
    this.noise({ dur: 0.20, gain: 0.12, filter: { type: "lowpass", freq: 700 } });
    this.tone({ freq: 140, dur: 0.18, type: "sawtooth", gain: 0.10 });
    this.tone({ freq: 90, dur: 0.25, type: "triangle", gain: 0.08, when: 0.04 });
  }

  crashWin() {
    this.unlock();
    if (!this.ok()) return;
    this.tone({ freq: 660, dur: 0.09, type: "sine", gain: 0.10 });
    this.tone({ freq: 990, dur: 0.12, type: "sine", gain: 0.09, when: 0.05 });
    this.tone({ freq: 1320, dur: 0.15, type: "sine", gain: 0.08, when: 0.10 });
  }

  stopAllLoops() {
    this.stopLoop("slotSpin");
    this.stopLoop("crashTick");
  }

  stopLoop(key: LoopKey) {
    const h = this.loops.get(key);
    if (!h) return;
    try {
      h.stop();
    } catch {}
    this.loops.delete(key);
  }
}

// singleton
export const sfx = new SFXEngine();