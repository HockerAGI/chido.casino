// src/lib/sfx.ts
/* eslint-disable no-restricted-globals */

type LoopKey = "slotSpin" | "crashTick" | "ambient";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

type ToneOpts = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  detune?: number;
  when?: number;
  glideTo?: number; // optional pitch glide
  glideMs?: number;
};

type NoiseOpts = {
  dur: number;
  gain?: number;
  when?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
};

export class SFXEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private enabled = true;
  private volume = 0.65; // default mex-casino level

  private loops = new Map<LoopKey, { stop: () => void }>();

  /** Llamar en el primer gesto del usuario (tap/click) para desbloquear audio en iOS/Android */
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

  private tone(opts: ToneOpts) {
    if (!this.ok()) return;

    const {
      freq,
      dur,
      type = "sine",
      gain = 0.12,
      attack = 0.003,
      release = 0.03,
      detune = 0,
      when = 0,
      glideTo,
      glideMs = 80,
    } = opts;

    const ctx = this.ctx!;
    const t0 = this.now() + when;
    const t1 = t0 + Math.max(0.01, dur);

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.setValueAtTime(detune, t0);
    osc.frequency.setValueAtTime(freq, t0);

    if (typeof glideTo === "number") {
      const gt = t0 + Math.max(0.01, glideMs / 1000);
      osc.frequency.linearRampToValueAtTime(glideTo, gt);
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t1 + release);

    // pequeño compresor para "pegada" (casino vibes)
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-20, t0);
    comp.knee.setValueAtTime(18, t0);
    comp.ratio.setValueAtTime(3.5, t0);
    comp.attack.setValueAtTime(0.006, t0);
    comp.release.setValueAtTime(0.12, t0);

    osc.connect(g);
    g.connect(comp);
    comp.connect(this.master!);

    osc.start(t0);
    osc.stop(t1 + release + 0.03);
  }

  private noise(opts: NoiseOpts) {
    if (!this.ok()) return;

    const { dur, gain = 0.10, when = 0, filter } = opts;
    const ctx = this.ctx!;
    const t0 = this.now() + when;
    const t1 = t0 + Math.max(0.02, dur);

    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.9;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.035);

    let node: AudioNode = src;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type;
      f.frequency.setValueAtTime(filter.freq, t0);
      f.Q.setValueAtTime(filter.q ?? 0.9, t0);
      node.connect(f);
      node = f;
    }

    node.connect(g);
    g.connect(this.master!);

    src.start(t0);
    src.stop(t1 + 0.06);
  }

  // -------------------------
  // Mex-Casino palette
  // -------------------------

  /** click con "monedita" */
  uiClick() {
    this.unlock();
    if (!this.ok()) return;

    // “tap”
    this.tone({ freq: 1200, dur: 0.03, type: "square", gain: 0.08 });
    // “coin ping”
    this.tone({ freq: 2200, dur: 0.05, type: "triangle", gain: 0.04, when: 0.01 });
  }

  /** clack tipo palanca / carrete */
  slotStop() {
    this.unlock();
    if (!this.ok()) return;

    // "clack" (wood-ish) = ruido + tono corto
    this.noise({ dur: 0.05, gain: 0.09, filter: { type: "bandpass", freq: 1400, q: 1.2 } });
    this.tone({ freq: 520, dur: 0.06, type: "sine", gain: 0.06 });
  }

  /** “uy no” corto */
  slotLose() {
    this.unlock();
    if (!this.ok()) return;

    this.tone({ freq: 240, dur: 0.11, type: "triangle", gain: 0.09, glideTo: 180, glideMs: 90 });
    this.noise({ dur: 0.10, gain: 0.04, filter: { type: "lowpass", freq: 800 } });
  }

  /** jingle mex-chiquito (trompeta synth) */
  winSmall() {
    this.unlock();
    if (!this.ok()) return;

    // triada mayor: C-E-G (aprox)
    const c = 523.25;
    const e = 659.25;
    const g = 783.99;

    // trompeta synth = saw + un poquito de detune
    this.tone({ freq: c, dur: 0.08, type: "sawtooth", gain: 0.07, detune: -6 });
    this.tone({ freq: e, dur: 0.09, type: "sawtooth", gain: 0.06, detune: 5, when: 0.06 });
    this.tone({ freq: g, dur: 0.10, type: "sawtooth", gain: 0.055, detune: -3, when: 0.12 });

    // campanita
    this.tone({ freq: 1760, dur: 0.06, type: "triangle", gain: 0.04, when: 0.09 });
  }

  /** jingle más largo con “remate” */
  winBig() {
    this.unlock();
    if (!this.ok()) return;

    const c = 523.25;
    const e = 659.25;
    const g = 783.99;
    const c2 = 1046.5;

    this.tone({ freq: c, dur: 0.10, type: "sawtooth", gain: 0.08, detune: -8 });
    this.tone({ freq: e, dur: 0.12, type: "sawtooth", gain: 0.07, detune: 6, when: 0.07 });
    this.tone({ freq: g, dur: 0.13, type: "sawtooth", gain: 0.06, detune: -4, when: 0.14 });
    this.tone({ freq: c2, dur: 0.16, type: "sawtooth", gain: 0.055, detune: 3, when: 0.22 });

    // “gritito” sutil (whistle up)
    this.tone({
      freq: 900,
      glideTo: 1600,
      glideMs: 140,
      dur: 0.16,
      type: "triangle",
      gain: 0.04,
      when: 0.18,
    });

    // shaker
    this.noise({ dur: 0.22, gain: 0.04, when: 0.12, filter: { type: "highpass", freq: 1800 } });
  }

  /** MEGA win con hype + “¡eh!” synth */
  winMega() {
    this.unlock();
    if (!this.ok()) return;

    this.winBig();

    // golpe de bombo synth
    this.tone({ freq: 90, glideTo: 55, glideMs: 120, dur: 0.18, type: "sine", gain: 0.10, when: 0.05 });
    this.noise({ dur: 0.20, gain: 0.06, when: 0.05, filter: { type: "lowpass", freq: 650 } });

    // brass hit
    this.tone({ freq: 988, dur: 0.18, type: "sawtooth", gain: 0.06, detune: -7, when: 0.30 });
    this.tone({ freq: 1319, dur: 0.18, type: "sawtooth", gain: 0.05, detune: 6, when: 0.30 });

    // “¡eh!” (quick formant-ish)
    this.tone({ freq: 520, glideTo: 740, glideMs: 80, dur: 0.12, type: "square", gain: 0.035, when: 0.36 });

    // confetti hiss
    this.noise({ dur: 0.35, gain: 0.05, when: 0.26, filter: { type: "highpass", freq: 1600 } });
  }

  /** Loop de spin: güiro/ruido filtrado + hum bajo */
  slotSpinStart(turbo = false) {
    this.unlock();
    if (!this.ok()) return;
    this.stopLoop("slotSpin");

    const ctx = this.ctx!;
    const master = this.master!;

    const gain = ctx.createGain();
    gain.gain.value = turbo ? 0.12 : 0.10;
    gain.connect(master);

    // ruido base (güiro-ish)
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // un poquito más "granular"
      const r = (Math.random() * 2 - 1) * 0.45;
      data[i] = r * (i % 2 === 0 ? 1 : 0.85);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = turbo ? 1500 : 1100;
    bp.Q.value = 0.85;

    // "raspado" (LFO en frecuencia)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = turbo ? 9.5 : 7.0;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = turbo ? 260 : 190;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);

    // hum bajo
    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = turbo ? 92 : 74;

    const humG = ctx.createGain();
    humG.gain.value = turbo ? 0.025 : 0.018;

    noise.connect(bp);
    bp.connect(gain);

    hum.connect(humG);
    humG.connect(gain);

    noise.start();
    hum.start();
    lfo.start();

    this.loops.set("slotSpin", {
      stop: () => {
        try {
          noise.stop();
          hum.stop();
          lfo.stop();
        } catch {}
      },
    });
  }

  /** Tick loop crash: beep + “monitor” casino */
  crashTickStart(turbo = false) {
    this.unlock();
    if (!this.ok()) return;
    this.stopLoop("crashTick");

    let alive = true;
    const interval = turbo ? 85 : 115;

    const tick = () => {
      if (!alive) return;

      // beep
      this.tone({ freq: turbo ? 1650 : 1420, dur: 0.025, type: "square", gain: 0.035 });
      // mini click
      this.noise({ dur: 0.02, gain: 0.02, filter: { type: "highpass", freq: 2400 } });

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

    // “truenazo” + caída
    this.noise({ dur: 0.22, gain: 0.11, filter: { type: "lowpass", freq: 750 } });
    this.tone({ freq: 180, glideTo: 90, glideMs: 160, dur: 0.22, type: "sawtooth", gain: 0.085 });
    this.tone({ freq: 120, dur: 0.18, type: "triangle", gain: 0.06, when: 0.06 });
  }

  crashWin() {
    this.unlock();
    if (!this.ok()) return;

    // mini fanfarria mex
    this.tone({ freq: 659.25, dur: 0.09, type: "sawtooth", gain: 0.06, detune: -6 });
    this.tone({ freq: 783.99, dur: 0.11, type: "sawtooth", gain: 0.055, detune: 5, when: 0.06 });
    this.tone({ freq: 1046.5, dur: 0.14, type: "sawtooth", gain: 0.05, detune: -3, when: 0.12 });

    // “grito” sutil
    this.tone({ freq: 950, glideTo: 1550, glideMs: 120, dur: 0.14, type: "triangle", gain: 0.035, when: 0.10 });
  }

  // -------------------------
  // Loop controls
  // -------------------------

  stopAllLoops() {
    this.stopLoop("slotSpin");
    this.stopLoop("crashTick");
    this.stopLoop("ambient");
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

export const sfx = new SFXEngine();