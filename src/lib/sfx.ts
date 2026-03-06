type SfxName =
  | "ui-click"
  | "slot-spin"
  | "slot-stop"
  | "slot-lose"
  | "win-small"
  | "win-big"
  | "win-mega"
  | "crash-tick"
  | "crash-bust"
  | "crash-win";

const FILES: Record<SfxName, string> = {
  "ui-click": "/sounds/ui-click.mp3",
  "slot-spin": "/sounds/slot-spin.mp3",
  "slot-stop": "/sounds/slot-stop.mp3",
  "slot-lose": "/sounds/slot-lose.mp3",
  "win-small": "/sounds/win-small.mp3",
  "win-big": "/sounds/win-big.mp3",
  "win-mega": "/sounds/win-mega.mp3",
  "crash-tick": "/sounds/crash-tick.mp3",
  "crash-bust": "/sounds/crash-bust.mp3",
  "crash-win": "/sounds/crash-win.mp3",
};

function canUseAudio() {
  return typeof window !== "undefined";
}

async function headOk(url: string) {
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

class SfxEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.75;
  private checked = false;
  private hasFile: Partial<Record<SfxName, boolean>> = {};
  private loops: Partial<Record<SfxName, { stop: () => void }>> = {};

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stopAllLoops();
  }

  setVolume(v: number) {
    this.volume = clamp01(v);
  }

  async prime() {
    if (!canUseAudio() || this.checked) return;
    this.checked = true;

    // Checamos si existen MP3 (si no, caemos a WebAudio synth)
    const entries = Object.entries(FILES) as Array<[SfxName, string]>;
    await Promise.all(
      entries.map(async ([k, url]) => {
        this.hasFile[k] = await headOk(url);
      })
    );
  }

  async unlock() {
    if (!canUseAudio()) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      if (this.ctx.state === "suspended") await this.ctx.resume();
    } catch {
      // ignore
    }
  }

  play(name: SfxName, opts?: { volume?: number }) {
    if (!canUseAudio() || !this.enabled) return;

    const vol = clamp01((opts?.volume ?? 1) * this.volume);

    // Si existe archivo, úsalo
    if (this.hasFile[name]) {
      try {
        const a = new Audio(FILES[name]);
        a.volume = vol;
        void a.play().catch(() => {});
        return;
      } catch {
        // fallback synth
      }
    }

    // Fallback synth (WebAudio)
    this.synth(name, vol);
  }

  loop(name: SfxName, opts?: { volume?: number }) {
    if (!canUseAudio() || !this.enabled) return () => {};

    const vol = clamp01((opts?.volume ?? 1) * this.volume);

    // para loop previo
    this.stopLoop(name);

    if (this.hasFile[name]) {
      try {
        const a = new Audio(FILES[name]);
        a.loop = true;
        a.volume = vol;
        void a.play().catch(() => {});
        const stop = () => {
          try {
            a.pause();
            a.currentTime = 0;
          } catch {}
        };
        this.loops[name] = { stop };
        return stop;
      } catch {
        // fallback synth
      }
    }

    const stop = this.synthLoop(name, vol);
    this.loops[name] = { stop };
    return stop;
  }

  stopLoop(name: SfxName) {
    const l = this.loops[name];
    if (l) {
      try {
        l.stop();
      } catch {}
      delete this.loops[name];
    }
  }

  stopAllLoops() {
    (Object.keys(this.loops) as SfxName[]).forEach((k) => this.stopLoop(k));
  }

  // ---------- WebAudio synth ----------
  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  private tone(freq: number, ms: number, vol: number, type: OscillatorType) {
    const ctx = this.ensureCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = type;
    o.frequency.value = freq;

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

    o.connect(g);
    g.connect(ctx.destination);

    o.start(now);
    o.stop(now + ms / 1000);
  }

  private noise(ms: number, vol: number) {
    const ctx = this.ensureCtx();
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * (ms / 1000)));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.65;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

    src.connect(g);
    g.connect(ctx.destination);

    src.start(now);
    src.stop(now + ms / 1000);
  }

  private synth(name: SfxName, vol: number) {
    try {
      // No bloquea si el browser requiere gesto: se “silencia” y ya.
      void this.unlock();
      switch (name) {
        case "ui-click":
          this.tone(880, 70, vol * 0.22, "square");
          this.tone(1320, 45, vol * 0.14, "triangle");
          break;

        case "slot-stop":
          this.tone(740, 90, vol * 0.20, "triangle");
          break;

        case "slot-lose":
          this.tone(180, 180, vol * 0.22, "sawtooth");
          this.tone(120, 220, vol * 0.18, "square");
          break;

        case "win-small":
          this.tone(660, 110, vol * 0.22, "triangle");
          this.tone(990, 140, vol * 0.18, "sine");
          break;

        case "win-big":
          this.tone(520, 140, vol * 0.22, "triangle");
          this.tone(780, 170, vol * 0.20, "sine");
          this.tone(1040, 190, vol * 0.14, "sine");
          break;

        case "win-mega":
          this.tone(440, 170, vol * 0.22, "triangle");
          this.tone(660, 220, vol * 0.22, "sine");
          this.tone(990, 260, vol * 0.18, "sine");
          this.noise(280, vol * 0.12);
          break;

        case "crash-bust":
          this.tone(280, 120, vol * 0.18, "sawtooth");
          this.tone(200, 160, vol * 0.20, "square");
          break;

        case "crash-win":
          this.tone(520, 120, vol * 0.18, "triangle");
          this.tone(780, 150, vol * 0.20, "sine");
          this.tone(1040, 170, vol * 0.16, "sine");
          break;

        case "slot-spin":
        case "crash-tick":
          // los loops se manejan en synthLoop
          this.noise(120, vol * 0.10);
          break;
      }
    } catch {
      // ignore
    }
  }

  private synthLoop(name: SfxName, vol: number) {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;

    // slot-spin: “whoosh” constante suave (ruido filtrado)
    if (name === "slot-spin") {
      const bufferSize = ctx.sampleRate * 1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const biquad = ctx.createBiquadFilter();
      biquad.type = "lowpass";
      biquad.frequency.value = 950;

      const g = ctx.createGain();
      g.gain.value = vol * 0.12;

      src.connect(biquad);
      biquad.connect(g);
      g.connect(ctx.destination);

      src.start(now);

      return () => {
        try {
          src.stop();
        } catch {}
      };
    }

    // crash-tick: beep rápido repetido
    if (name === "crash-tick") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "square";
      o.frequency.value = 850;

      g.gain.value = vol * 0.04;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "square";
      lfo.frequency.value = 12; // “tick rate”
      lfoGain.gain.value = vol * 0.06;

      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);

      o.connect(g);
      g.connect(ctx.destination);

      o.start(now);
      lfo.start(now);

      return () => {
        try {
          o.stop();
          lfo.stop();
        } catch {}
      };
    }

    // fallback
    const stop = () => {};
    return stop;
  }
}

export const sfx = new SfxEngine();