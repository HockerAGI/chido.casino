"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWalletBalance } from "@/lib/useWalletBalance";
import {
  ChevronLeft,
  Menu,
  Volume2,
  VolumeX,
  Zap,
  Play,
  Pause,
  Sparkles,
  ShieldAlert,
  Ban,
  Info,
  Minus,
  Plus,
  Gift,
} from "lucide-react";

type PromoLimit =
  | { ok: true; hasRollover: false }
  | {
      ok: true;
      hasRollover: true;
      maxBet: number;
      required: number;
      progress: number;
      pct: number;
    }
  | { ok: false; error: string };

type ResponsibleStatus =
  | { ok: true; excluded: boolean; until: string | null; reason: string | null }
  | { ok: false; error: string };

type SpinApi =
  | {
      ok: true;
      spinId: string;
      bet: number;
      payout: number;
      multiplier: number;
      reels: Array<{ key: string; img?: string }> | string[];
      level?: { key: string; label: string; badge: string };
      rtp?: number;
      fair?: { serverSeedHash?: string; serverSeed?: string; nonce?: number };
      message?: string;
    }
  | { ok: false; error: string; message?: string; maxBet?: number };

function money(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}
function safeIso() {
  return new Date().toISOString();
}
function vibrate(ms: number) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      // @ts-ignore
      navigator.vibrate(ms);
    }
  } catch {}
}
function useLocalSetting<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      setValue(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

/** ✅ WebAudio “mex-casino” synth (sin MP3). Si luego agregas MP3, lo tomamos primero. */
class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;

  private spinNoise?: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode };

  async unlock() {
    if (this.unlocked) return;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);

      // “silent tick” para unlock en iOS/Android
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.00001;
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + 0.02);

      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }
  }

  setMuted(muted: boolean) {
    if (!this.master) return;
    this.master.gain.value = muted ? 0 : 0.9;
  }

  private async tryPlayFile(src: string, vol: number, loop = false) {
    try {
      const a = new Audio(src);
      a.volume = Math.max(0, Math.min(1, vol));
      a.loop = loop;
      await a.play();
      return a;
    } catch {
      return null;
    }
  }

  private beep(freq: number, durMs: number, vol: number, type: OscillatorType = "sine") {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + durMs / 1000 + 0.02);
  }

  private noise(durMs: number, vol: number, cutoffHz = 1200) {
    if (!this.ctx || !this.master) return;
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor((durMs / 1000) * sr));
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.65;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoffHz;

    const g = this.ctx.createGain();
    g.gain.value = vol;

    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
    src.stop(this.ctx.currentTime + durMs / 1000);
  }

  async click() {
    // si existe archivo, úsalo; si no, synth
    if ((await this.tryPlayFile("/sounds/ui-click.mp3", 0.35)) !== null) return;
    this.beep(520, 40, 0.08, "square");
  }

  async reelStop() {
    if ((await this.tryPlayFile("/sounds/slot-stop.mp3", 0.25)) !== null) return;
    this.noise(60, 0.06, 900);
    this.beep(210, 50, 0.05, "triangle");
  }

  async lose() {
    if ((await this.tryPlayFile("/sounds/slot-lose.mp3", 0.18)) !== null) return;
    this.beep(210, 90, 0.06, "sine");
    this.beep(160, 120, 0.05, "sine");
  }

  async win(kind: "small" | "big" | "mega") {
    const map: Record<string, string> = {
      small: "/sounds/win-small.mp3",
      big: "/sounds/win-big.mp3",
      mega: "/sounds/win-mega.mp3",
    };
    if ((await this.tryPlayFile(map[kind], 0.35)) !== null) return;

    if (kind === "small") {
      this.beep(660, 90, 0.08, "triangle");
      this.beep(880, 110, 0.07, "triangle");
      return;
    }
    if (kind === "big") {
      this.beep(523, 90, 0.08, "triangle");
      this.beep(659, 120, 0.09, "triangle");
      this.beep(784, 150, 0.10, "triangle");
      return;
    }
    // mega
    this.beep(392, 120, 0.10, "sawtooth");
    this.beep(523, 150, 0.10, "sawtooth");
    this.beep(659, 180, 0.11, "sawtooth");
    this.noise(220, 0.05, 2200);
  }

  startSpinLoop(turbo: boolean) {
    // intenta archivo loop si existe
    this.tryPlayFile("/sounds/slot-spin.mp3", turbo ? 0.22 : 0.18, true).then((a) => {
      if (a) {
        // si hay archivo, no hacemos noise loop
        return;
      }
      if (!this.ctx || !this.master) return;
      if (this.spinNoise) return;

      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 0.25);
      const buf = this.ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.35;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = turbo ? 900 : 720;
      filter.Q.value = 0.8;

      const g = this.ctx.createGain();
      g.gain.value = turbo ? 0.06 : 0.05;

      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start();

      this.spinNoise = { src, gain: g, filter };
    });
  }

  stopSpinLoop() {
    try {
      this.spinNoise?.src.stop();
    } catch {}
    this.spinNoise = undefined;
  }
}

const LEVEL_BADGES: Record<string, string> = {
  verde: "/badge-verde.png",
  jalapeno: "/badge-jalapeno.png",
  serrano: "/badge-serrano.png",
  habanero: "/badge-habanero.png",
};

/** ✅ símbolos del slot (NO badges): usa tus 4 + isotipo + logo como wild/scatter */
const SLOT_SYMBOLS: Record<string, string> = {
  verde: "/slot-verde.png",
  jalapeno: "/slot-jalapeno.png",
  serrano: "/slot-serrano.png",
  habanero: "/slot-habanero.png",
  wild: "/isotipo-color.png",
  scatter: "/chido-logo.png",
};

const SYMBOL_KEYS = Object.keys(SLOT_SYMBOLS);

function seededRand(seedStr: string) {
  // xfnv1a + mulberry32 mini
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Grid = string[]; // 15 symbols (5x3)
const COLS = 5;
const ROWS = 3;

function toGridFromApi(reels: SpinApi extends infer _ ? any : any, spinId: string): Grid {
  const flat: string[] =
    Array.isArray(reels) && typeof reels[0] === "string"
      ? (reels as string[])
      : Array.isArray(reels)
        ? (reels as Array<{ key: string }>).map((x) => x.key)
        : [];

  // si ya vienen 15, perfecto
  if (flat.length >= COLS * ROWS) return flat.slice(0, COLS * ROWS).map((k) => (SLOT_SYMBOLS[k] ? k : "verde"));

  // si vienen 5, los usamos como centro de cada reel
  // si vienen 3, los ponemos en 3 reels centrales y rellenamos
  const rnd = seededRand(spinId || safeIso());
  const grid: string[] = [];
  const centers = new Array(COLS).fill("verde");

  if (flat.length === 5) {
    for (let c = 0; c < COLS; c++) centers[c] = SLOT_SYMBOLS[flat[c]] ? flat[c] : "verde";
  } else if (flat.length === 3) {
    centers[1] = SLOT_SYMBOLS[flat[0]] ? flat[0] : "verde";
    centers[2] = SLOT_SYMBOLS[flat[1]] ? flat[1] : "verde";
    centers[3] = SLOT_SYMBOLS[flat[2]] ? flat[2] : "verde";
    centers[0] = SYMBOL_KEYS[Math.floor(rnd() * SYMBOL_KEYS.length)];
    centers[4] = SYMBOL_KEYS[Math.floor(rnd() * SYMBOL_KEYS.length)];
  } else if (flat.length > 0) {
    // lo que sea: repetimos y rellenamos
    for (let c = 0; c < COLS; c++) centers[c] = SLOT_SYMBOLS[flat[c % flat.length]] ? flat[c % flat.length] : "verde";
  } else {
    for (let c = 0; c < COLS; c++) centers[c] = SYMBOL_KEYS[Math.floor(rnd() * SYMBOL_KEYS.length)];
  }

  // construimos 5x3: fila 0,1,2 por columnas
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 1) grid.push(centers[c]);
      else grid.push(SYMBOL_KEYS[Math.floor(rnd() * SYMBOL_KEYS.length)]);
    }
  }
  return grid.map((k) => (SLOT_SYMBOLS[k] ? k : "verde"));
}

function classifyWin(payout: number, bet: number) {
  const ratio = bet > 0 ? payout / bet : 0;
  if (ratio >= 20) return "mega" as const;
  if (ratio >= 8) return "big" as const;
  return "small" as const;
}

function SymbolTile({ k, spinning }: { k: string; spinning: boolean }) {
  const src = SLOT_SYMBOLS[k] || SLOT_SYMBOLS.verde;
  return (
    <div className="relative w-full h-full grid place-items-center">
      <div className={`relative w-[86%] h-[86%] ${spinning ? "blur-[1px] opacity-95" : ""}`}>
        <Image
          src={src}
          alt={k}
          fill
          className={`object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)] ${spinning ? "animate-slotJitter" : ""}`}
          priority={false}
        />
      </div>
    </div>
  );
}

export default function TacoSlotPragmaticStyle() {
  const { toast } = useToast();
  const { balance, bonusBalance, refresh, formatted, formattedBonus } = useWalletBalance();

  const available = (balance || 0) + (bonusBalance || 0);

  const [soundOn, setSoundOn] = useLocalSetting("chido_sound", true);
  const [turbo, setTurbo] = useLocalSetting("chido_slot_turbo", false);
  const [vfx, setVfx] = useLocalSetting("chido_vfx", true);
  const [haptics, setHaptics] = useLocalSetting("chido_haptics", true);

  const sfxRef = useRef<SoundKit | null>(null);
  if (!sfxRef.current) sfxRef.current = new SoundKit();

  useEffect(() => {
    sfxRef.current?.setMuted(!soundOn);
  }, [soundOn]);

  const [promo, setPromo] = useState<PromoLimit>({ ok: true, hasRollover: false });
  const [resp, setResp] = useState<ResponsibleStatus>({ ok: true, excluded: false, until: null, reason: null });

  const maxBet = promo.ok && promo.hasRollover ? promo.maxBet : Infinity;

  const clampBet = (v: number) => {
    let n = Number(v);
    if (!Number.isFinite(n) || n <= 0) n = 10;
    if (promo.ok && promo.hasRollover) n = Math.min(n, promo.maxBet);
    return Math.max(1, Math.floor(n));
  };

  const [bet, setBet] = useState(10);

  useEffect(() => {
    setBet((b) => clampBet(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo.ok, (promo as any).hasRollover, (promo as any).maxBet]);

  const [loadingSplash, setLoadingSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoadingSplash(false), 1100);
    return () => clearTimeout(t);
  }, []);

  const [spinning, setSpinning] = useState(false);
  const [reelActive, setReelActive] = useState<boolean[]>([false, false, false, false, false]);
  const [grid, setGrid] = useState<Grid>(() => {
    // default: centrado bonito
    return [
      "verde",
      "jalapeno",
      "serrano",
      "habanero",
      "wild",
      "jalapeno",
      "verde",
      "serrano",
      "verde",
      "scatter",
      "serrano",
      "jalapeno",
      "verde",
      "habanero",
      "verde",
    ].slice(0, 15);
  });

  const [autoLeft, setAutoLeft] = useState(0);
  const autoRef = useRef(0);
  autoRef.current = autoLeft;

  const [level, setLevel] = useState<{ key: string; label: string; badge: string } | null>(null);
  const [lastFair, setLastFair] = useState<{ hash?: string; seed?: string; nonce?: number; ts: string } | null>(null);

  const [winOverlay, setWinOverlay] = useState<null | { kind: "small" | "big" | "mega"; payout: number; mult: number }>(null);
  const [anticipation, setAnticipation] = useState(false);

  const durations = useMemo(() => {
    return turbo ? { spin: 650, gap: 140 } : { spin: 1180, gap: 240 };
  }, [turbo]);

  const loadGates = async () => {
    try {
      const [p, r] = await Promise.all([
        fetch("/api/promos/limits", { cache: "no-store" }),
        fetch("/api/responsible/status", { cache: "no-store" }),
      ]);
      const pj = (await p.json().catch(() => ({}))) as PromoLimit;
      const rj = (await r.json().catch(() => ({}))) as any;
      if (p.ok) setPromo(pj);
      if (r.ok) setResp({ ok: true, excluded: !!rj.excluded, until: rj.until ?? null, reason: rj.reason ?? null });
    } catch {}
  };

  useEffect(() => {
    void loadGates();
    const t = setInterval(loadGates, 15000);
    return () => clearInterval(t);
  }, []);

  // reel jitter driver (mientras reelActive[col] = true, actualiza 3 símbolos de esa columna)
  useEffect(() => {
    if (!reelActive.some(Boolean)) return;
    const interval = setInterval(() => {
      setGrid((prev) => {
        const next = prev.slice();
        for (let c = 0; c < COLS; c++) {
          if (!reelActive[c]) continue;
          const k0 = SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
          const k1 = SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
          const k2 = SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
          // filas: r0,r1,r2 (en nuestro grid: r*COLS + c)
          next[0 * COLS + c] = k0;
          next[1 * COLS + c] = k1;
          next[2 * COLS + c] = k2;
        }
        return next;
      });
    }, turbo ? 55 : 85);
    return () => clearInterval(interval);
  }, [reelActive, turbo]);

  const canPlay = !(resp.ok && resp.excluded);

  const toggleAuto = (count = 10) => {
    if (autoLeft > 0) {
      setAutoLeft(0);
      toast({ title: "Auto detenido", description: "Listo. Tú mandas." });
      return;
    }
    const c = clampInt(count, 1, 200);
    setAutoLeft(c);
    toast({ title: "Auto activado", description: `Se arma con ${c} giros.` });
  };

  const doSpin = async (fromAuto = false) => {
    if (spinning) return;

    if (resp.ok && resp.excluded) {
      setAutoLeft(0);
      if (!fromAuto) {
        toast({
          title: "Autoexclusión activa",
          description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "Ahorita no se arma.",
          variant: "destructive",
        });
      }
      return;
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      setAutoLeft(0);
      if (!fromAuto) toast({ title: "Saldo insuficiente", description: "Te falta feria (incluye bono si aplica).", variant: "destructive" });
      return;
    }

    setSpinning(true);
    setWinOverlay(null);
    setAnticipation(false);
    setReelActive([true, true, true, true, true]);

    if (haptics) vibrate(turbo ? 18 : 30);

    // unlock audio por gesto
    await sfxRef.current?.unlock();
    await sfxRef.current?.click();
    sfxRef.current?.startSpinLoop(turbo);

    let api: SpinApi | null = null;
    try {
      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bet: safeBet }),
      });
      api = (await res.json().catch(() => ({}))) as SpinApi;

      if (!res.ok || !api || (api as any).ok !== true) {
        const err = (api as any)?.error || "SPIN_FAILED";
        if (err === "PROMO_MAX_BET") setBet(clampBet(Number((api as any).maxBet || safeBet)));
        if (err === "SELF_EXCLUDED") await loadGates();
        throw new Error((api as any)?.message || err);
      }
    } catch (e: any) {
      sfxRef.current?.stopSpinLoop();
      setReelActive([false, false, false, false, false]);
      setSpinning(false);
      setAutoLeft(0);
      if (!fromAuto) toast({ title: "No se armó", description: e?.message || "Intenta otra vez.", variant: "destructive" });
      return;
    }

    const okApi = api as Extract<SpinApi, { ok: true }>;
    const flat =
      Array.isArray(okApi.reels) && typeof okApi.reels[0] === "string"
        ? (okApi.reels as string[])
        : (okApi.reels as Array<{ key: string }>).map((x) => x.key);

    const finalGrid = toGridFromApi(flat, okApi.spinId);
    const payout = Number(okApi.payout || 0);
    const mult = Number(okApi.multiplier || 0);

    // revelado por reels tipo casino (uno por uno)
    const timers: any[] = [];
    const stopReel = async (col: number) => {
      // set columna a valores finales
      setGrid((prev) => {
        const next = prev.slice();
        next[0 * COLS + col] = finalGrid[0 * COLS + col];
        next[1 * COLS + col] = finalGrid[1 * COLS + col];
        next[2 * COLS + col] = finalGrid[2 * COLS + col];
        return next;
      });
      setReelActive((prev) => {
        const next = prev.slice();
        next[col] = false;
        return next;
      });
      if (haptics) vibrate(12);
      await sfxRef.current?.reelStop();
    };

    // anticipación: si los 2 primeros centros coinciden, prende glow en los demás
    const center0 = finalGrid[1 * COLS + 0];
    const center1 = finalGrid[1 * COLS + 1];
    const willAnticipate = center0 === center1;

    timers.push(
      setTimeout(() => {
        void stopReel(0);
      }, durations.spin),
    );
    timers.push(
      setTimeout(() => {
        void stopReel(1);
        if (willAnticipate) setAnticipation(true);
      }, durations.spin + durations.gap),
    );
    timers.push(setTimeout(() => void stopReel(2), durations.spin + durations.gap * 2));
    timers.push(setTimeout(() => void stopReel(3), durations.spin + durations.gap * 3));
    timers.push(
      setTimeout(async () => {
        await stopReel(4);

        sfxRef.current?.stopSpinLoop();

        if (okApi.level) setLevel(okApi.level);
        setLastFair({ hash: okApi.fair?.serverSeedHash, seed: okApi.fair?.serverSeed, nonce: okApi.fair?.nonce, ts: safeIso() });

        refresh();
        void loadGates();

        if (payout > 0) {
          const kind = classifyWin(payout, safeBet);
          setWinOverlay({ kind, payout, mult });
          await sfxRef.current?.win(kind);
          if (haptics) vibrate(kind === "mega" ? 95 : kind === "big" ? 65 : 40);

          toast({
            title: kind === "mega" ? "MEGA WIN 🔥" : kind === "big" ? "¡Qué chido! Ganaste" : "Pegó 👌",
            description: `x${mult} (+${money(payout)} MXN)`,
          });
        } else {
          await sfxRef.current?.lose();
        }

        setTimeout(() => {
          setAnticipation(false);
          setSpinning(false);
          // auto decrement
          if (autoRef.current > 0) setAutoLeft((n) => Math.max(0, n - 1));
        }, turbo ? 120 : 220);
      }, durations.spin + durations.gap * 4),
    );

    return () => timers.forEach(clearTimeout);
  };

  useEffect(() => {
    if (autoLeft <= 0) return;
    if (spinning) return;
    const t = setTimeout(() => void doSpin(true), turbo ? 200 : 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLeft, spinning, turbo]);

  const showCap = promo.ok && promo.hasRollover;
  const capText = showCap ? `Max por giro: $${promo.maxBet} MXN` : "Sin límite por bono";

  const headline = useMemo(() => {
    const lines = [
      "Dale al giro, a ver si cae chido 😮‍💨",
      "Aguas… hoy puede caer el premio 👀",
      "Puro sabor, puro CHIDO 🔥",
      "Se armó, compa. Tú dale.",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }, []);

  // UI helper: tile border for anticipation reels
  const reelFrameClass = (col: number) => {
    const isActive = reelActive[col];
    const ant = anticipation && isActive && col >= 2;
    return [
      "relative rounded-[18px] overflow-hidden border",
      ant ? "border-[#FFD700]/45 shadow-[0_0_34px_rgba(255,215,0,0.22)]" : "border-white/10",
      isActive ? "shadow-[0_0_26px_rgba(0,240,255,0.10)]" : "shadow-[0_16px_50px_rgba(0,0,0,0.45)]",
      ant ? "animate-anticipatePulse" : "",
    ].join(" ");
  };

  return (
    <div className="relative min-h-[calc(100vh-88px)] pb-24">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-25" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,0,153,0.14),transparent_45%),radial-gradient(circle_at_75%_35%,rgba(0,240,255,0.12),transparent_45%),radial-gradient(circle_at_50%_85%,rgba(50,205,50,0.10),transparent_50%)]" />
      </div>

      {/* Splash (como casinos reales) */}
      {loadingSplash ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black">
          <div className="relative w-full max-w-[520px] px-5">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[32px] border border-white/10 bg-black">
              <Image src="/hero-bg.jpg" alt="Cargando" fill className="object-cover opacity-60" priority />
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/40 to-black/85" />

              <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="relative h-12 w-12">
                  <Image src="/isotipo-color.png" alt="CHIDO" fill className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.7)]" />
                </div>
                <div>
                  <div className="text-white font-black text-xl tracking-tight">Taco Slot</div>
                  <div className="text-white/60 text-xs">Cargando… (se arma en corto)</div>
                </div>
              </div>

              <div className="absolute inset-x-6 bottom-7">
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[62%] bg-gradient-to-r from-[#FF0099] via-[#00F0FF] to-[#32CD32] animate-loadingBar" />
                </div>
                <div className="mt-3 text-center text-white/55 text-xs">“El que no gira, no gana” 😈</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Top Bar */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/lobby"
              className="h-11 w-11 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 transition"
              aria-label="Volver"
            >
              <ChevronLeft size={18} />
            </Link>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
              <div className="relative h-6 w-6">
                <Image src="/isotipo-color.png" alt="CHIDO" fill className="object-contain" />
              </div>
              <div className="leading-tight">
                <div className="text-white font-black text-sm">Taco Slot</div>
                <div className="text-white/55 text-[11px]">{headline}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-xs">
              <div className="text-white/55 font-black uppercase tracking-widest text-[10px]">Saldo</div>
              <div className="text-white font-black tabular-nums">
                {formatted} <span className="text-white/45 text-[11px]">+ bono {formattedBonus}</span>
              </div>
            </div>

            <Link
              href="/wallet"
              className="h-11 px-4 rounded-2xl bg-[#32CD32] text-black font-black inline-flex items-center gap-2 shadow-[0_0_22px_rgba(50,205,50,0.18)] hover:brightness-110 transition"
            >
              Depósito
            </Link>

            <button
              onClick={() => setSoundOn((v: boolean) => !v)}
              className="h-11 w-11 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 transition"
              aria-label="Sonido"
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={() => setTurbo((v: boolean) => !v)}
              className={`h-11 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                turbo ? "bg-[#FFD700] text-black border-[#FFD700]/45" : "bg-black/35 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Turbo"
            >
              <Zap size={16} /> Turbo
            </button>

            <button
              onClick={() => setVfx((v: boolean) => !v)}
              className={`h-11 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                vfx ? "bg-white text-black border-white/35" : "bg-black/35 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="VFX"
            >
              <Sparkles size={16} /> VFX
            </button>

            <button
              onClick={() => setHaptics((v: boolean) => !v)}
              className={`h-11 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                haptics ? "bg-white text-black border-white/35" : "bg-black/35 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Vibración"
            >
              Vibra
            </button>

            <button
              className="h-11 w-11 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 transition"
              aria-label="Menú"
              onClick={() =>
                toast({
                  title: "Menú",
                  description: "Aquí luego metemos: paytable full, historial, reglas, soporte y ajustes finos.",
                })
              }
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Gates: autoexclusión + cap */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {resp.ok && resp.excluded ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/85 flex items-start gap-2">
              <Ban className="mt-0.5 text-red-400" size={18} />
              <div>
                <div className="font-black">Autoexclusión activa</div>
                <div className="text-xs text-white/65">
                  {resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "Ahorita no se puede jugar."}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-white/80 flex items-start gap-2">
              <Info className="mt-0.5 text-[#00F0FF]" size={18} />
              <div>
                <div className="font-black">Regla rápida</div>
                <div className="text-xs text-white/65">
                  Si traes bono activo, respeta el <b>cap por jugada</b> pa’ que todo sea limpio.
                </div>
              </div>
            </div>
          )}

          {showCap ? (
            <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-white/85">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 text-[#FFD700]" size={18} />
                <div className="w-full">
                  <div className="font-black">Bono activo (rollover)</div>
                  <div className="text-xs text-white/65">{capText}</div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#32CD32]" style={{ width: `${promo.ok && promo.hasRollover ? promo.pct : 0}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-white/45">
                    {promo.ok && promo.hasRollover ? `${Math.round(promo.progress)} / ${Math.round(promo.required)} MXN • ${promo.pct}%` : ""}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-white/75 flex items-start gap-2">
              <Gift className="mt-0.5 text-[#FF0099]" size={18} />
              <div>
                <div className="font-black">Sin bono activo</div>
                <div className="text-xs text-white/65">Apuesta libre (igual juega con cabeza, pa’ no llorar luego).</div>
              </div>
            </div>
          )}
        </div>

        {/* Game Frame */}
        <div className="mt-5 relative overflow-hidden rounded-[34px] border border-white/10 bg-black/35">
          {/* chrome */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,153,0.14),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(0,240,255,0.12),transparent_50%),radial-gradient(circle_at_50%_90%,rgba(255,215,0,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/65" />

          <div className="relative z-10 p-4 sm:p-6">
            {/* Title row inside frame */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <Image src="/isotipo-color.png" alt="CHIDO" fill className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)]" />
                </div>
                <div>
                  <div className="text-white font-black text-lg leading-tight">Gira y cae premio</div>
                  <div className="text-white/55 text-xs">5 reels • 3 filas • turbo/auto • VFX</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {level ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    <div className="relative h-7 w-7">
                      <Image src={LEVEL_BADGES[level.key] || level.badge} alt={level.label} fill className="object-contain" />
                    </div>
                    <div className="text-xs text-white/70">
                      Nivel: <b className="text-white">{level.label}</b>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-white/50">Nivel: se ajusta con tu juego</div>
                )}
              </div>
            </div>

            {/* Reels */}
            <div className="mt-4 relative rounded-[26px] border border-white/10 bg-[#0b0b0e] p-3 sm:p-4 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-0 opacity-[0.10] bg-[url('/opengraph-image.jpg')] bg-cover mix-blend-overlay" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />

              {/* paylines subtle glow */}
              <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="absolute left-0 right-0 top-[33.3%] h-[1px] bg-[#00F0FF]/20" />
                <div className="absolute left-0 right-0 top-[66.6%] h-[1px] bg-[#FF0099]/18" />
              </div>

              <div className="relative z-10 grid grid-cols-5 gap-2 sm:gap-3">
                {new Array(COLS).fill(0).map((_, col) => (
                  <div key={col} className={reelFrameClass(col)}>
                    {/* shine */}
                    <div className={`absolute inset-0 ${reelActive[col] ? "animate-reelShine" : ""}`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/55 pointer-events-none" />

                    <div className="relative z-10 grid grid-rows-3 gap-2 p-2">
                      {new Array(ROWS).fill(0).map((__, r) => {
                        const idx = r * COLS + col;
                        return (
                          <div
                            key={r}
                            className={`relative aspect-[1/1] rounded-[14px] border border-white/10 bg-black/35 overflow-hidden ${
                              reelActive[col] ? "shadow-[0_0_24px_rgba(0,240,255,0.10)]" : ""
                            }`}
                          >
                            <SymbolTile k={grid[idx]} spinning={reelActive[col]} />
                          </div>
                        );
                      })}
                    </div>

                    {/* tiny indicator */}
                    <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white/12">
                      <div className={`h-full w-full rounded-full ${reelActive[col] ? "bg-[#00F0FF]/60 animate-pulse" : "bg-white/10"}`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Win Overlay */}
              {winOverlay && vfx ? (
                <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                  <div className="text-center px-5">
                    <div
                      className={`text-6xl sm:text-7xl font-black drop-shadow-2xl ${
                        winOverlay.kind === "mega" ? "text-[#FFD700]" : winOverlay.kind === "big" ? "text-[#00F0FF]" : "text-[#32CD32]"
                      }`}
                    >
                      {winOverlay.kind === "mega" ? "MEGA WIN" : winOverlay.kind === "big" ? "BIG WIN" : "WIN"}
                    </div>
                    <div className="mt-2 text-white text-xl font-black">
                      +{money(winOverlay.payout)} <span className="text-white/60 text-base">MXN</span>
                    </div>
                    <div className="mt-1 text-white/70 text-sm">x{winOverlay.mult}</div>
                    <div className="mt-4 text-[11px] text-white/55">
                      Tip: turbo + auto se siente brutal, pero no te aceleres de más 😅
                    </div>
                  </div>

                  <div className={`absolute inset-0 pointer-events-none ${winOverlay.kind !== "small" ? "animate-confetti" : "animate-sparks"}`} />
                </div>
              ) : null}
            </div>

            {/* Bottom Controls (Pragmatic-like layout vibe) */}
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_340px]">
              {/* Left panel: bet + cap + auto */}
              <div className="rounded-[26px] border border-white/10 bg-black/30 p-4">
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/50 font-black">Apuesta</div>
                    <div className="text-white font-black text-2xl tabular-nums">
                      ${bet} <span className="text-white/45 text-sm">MXN</span>
                    </div>
                    <div className="text-[11px] text-white/55 mt-1">
                      {showCap ? (
                        <>
                          Cap activo: <b className="text-white">${promo.maxBet}</b> MXN
                        </>
                      ) : (
                        <>Cap: <b className="text-white">OFF</b></>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBet((b) => clampBet(b - 10))}
                      disabled={spinning || !canPlay}
                      className="h-12 w-12 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 disabled:opacity-40 transition"
                      aria-label="Bajar apuesta"
                    >
                      <Minus size={18} />
                    </button>
                    <button
                      onClick={() => setBet((b) => clampBet(b + 10))}
                      disabled={spinning || !canPlay}
                      className="h-12 w-12 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 disabled:opacity-40 transition"
                      aria-label="Subir apuesta"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  {[10, 20, 50, 100, 200, 500].map((v) => {
                    const disabled = spinning || !canPlay || (promo.ok && promo.hasRollover && v > promo.maxBet);
                    return (
                      <button
                        key={v}
                        onClick={() => setBet(clampBet(v))}
                        disabled={disabled}
                        className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/85 hover:bg-white/10 disabled:opacity-40 transition"
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => toggleAuto(10)}
                    disabled={spinning || !canPlay}
                    className={`h-12 px-4 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                      autoLeft > 0
                        ? "bg-[#FF0099] text-white border-[#FF0099]/40 shadow-[0_0_22px_rgba(255,0,153,0.18)]"
                        : "bg-black/35 text-white/75 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {autoLeft > 0 ? <Pause size={18} /> : <Play size={18} />}
                    {autoLeft > 0 ? `DETENER AUTO (${autoLeft})` : "AUTO x10"}
                  </button>

                  <button
                    onClick={() =>
                      toast({
                        title: "Paytable",
                        description: "Aquí luego ponemos tabla completa + líneas + símbolos (nivel PRO).",
                      })
                    }
                    className="h-12 px-4 rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 text-sm font-black text-white/75 inline-flex items-center gap-2 transition"
                  >
                    <Info size={16} /> Info
                  </button>
                </div>
              </div>

              {/* Right panel: Spin button big */}
              <div className="rounded-[26px] border border-white/10 bg-black/30 p-4 grid gap-3">
                <Button
                  onClick={() => void doSpin(false)}
                  disabled={spinning || !canPlay}
                  className={`h-16 rounded-[22px] font-black text-lg uppercase tracking-widest transition-all ${
                    spinning
                      ? "bg-zinc-700 text-white/70 cursor-not-allowed"
                      : "bg-gradient-to-b from-[#00F0FF] to-[#0099FF] text-black hover:scale-[1.01] shadow-[0_0_34px_rgba(0,240,255,0.22)]"
                  }`}
                >
                  {spinning ? "GIRANDO..." : "GIRAR"}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTurbo((v: boolean) => !v)}
                    className={`h-12 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                      turbo ? "bg-[#FFD700] text-black border-[#FFD700]/45" : "bg-black/35 text-white/75 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <Zap size={18} /> Turbo
                  </button>

                  <button
                    onClick={() =>
                      toast({
                        title: "Ajustes",
                        description: "Luego metemos: auto avanzado (stop-win/stop-loss), quick bet, música ambiente.",
                      })
                    }
                    className="h-12 rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 text-sm font-black text-white/75 transition"
                  >
                    Menú
                  </button>
                </div>

                <div className="text-[11px] text-white/50">
                  Disponible: <b className="text-white">{formatted}</b> + bono <b className="text-white">{formattedBonus}</b>
                </div>
              </div>
            </div>

            {/* Provably fair */}
            <div className="mt-4 rounded-[26px] border border-white/10 bg-black/25 p-4 text-xs text-white/70">
              <div className="flex items-center gap-2 font-black text-white/85">
                <Info size={14} /> Provably Fair
              </div>
              {lastFair?.hash ? (
                <div className="mt-2 font-mono break-all text-[11px] text-white/65">
                  hash: {lastFair.hash}
                  {lastFair.nonce != null ? <> • nonce: {lastFair.nonce}</> : null}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/55">Se muestra después de un giro.</div>
              )}
            </div>

            {/* Footer brand (info importante -> lenguaje neutro) */}
            <div className="mt-5 flex items-center justify-between gap-3 flex-wrap text-xs text-white/45">
              <div className="inline-flex items-center gap-2">
                <Image src="/isotipo-bw.png" alt="CHIDO" width={18} height={18} className="opacity-70" />
                <span>Chido Casino • Juego responsable • Soporte en /support</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span>© {new Date().getFullYear()} Hocker AGI Technologies</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global anims */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-slotJitter,
          .animate-reelShine,
          .animate-confetti,
          .animate-sparks,
          .animate-loadingBar,
          .animate-anticipatePulse {
            animation: none !important;
          }
        }

        @keyframes slotJitter {
          0% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-2px) scale(1.01); }
          50% { transform: translateY(1px) scale(0.99); }
          75% { transform: translateY(-1px) scale(1.005); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-slotJitter { animation: slotJitter 220ms linear infinite; }

        @keyframes reelShine {
          0% { transform: translateX(-140%) rotate(12deg); opacity: 0; }
          10% { opacity: 0.15; }
          45% { opacity: 0.10; }
          100% { transform: translateX(140%) rotate(12deg); opacity: 0; }
        }
        .animate-reelShine {
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.16) 50%, transparent 65%);
          animation: reelShine 700ms ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes confetti {
          0% { background-position: 0 0; opacity: 0.0; }
          10% { opacity: 1; }
          100% { background-position: 0 900px; opacity: 0; }
        }
        .animate-confetti {
          background-image:
            radial-gradient(circle, rgba(255,0,153,0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(0,240,255,0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(255,215,0,0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(50,205,50,0.9) 0 2px, transparent 3px);
          background-size: 140px 140px;
          animation: confetti 900ms linear infinite;
        }

        @keyframes sparks {
          0% { opacity: 0; transform: scale(0.98); }
          30% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
        .animate-sparks {
          background:
            radial-gradient(circle at 30% 40%, rgba(0,240,255,0.25), transparent 55%),
            radial-gradient(circle at 70% 50%, rgba(255,0,153,0.22), transparent 55%),
            radial-gradient(circle at 50% 70%, rgba(50,205,50,0.18), transparent 55%);
          animation: sparks 520ms ease-in-out infinite;
        }

        @keyframes loadingBar {
          0% { transform: translateX(-40%); }
          100% { transform: translateX(70%); }
        }
        .animate-loadingBar { animation: loadingBar 1.1s ease-in-out infinite; }

        @keyframes anticipatePulse {
          0% { transform: translateY(0); filter: brightness(1); }
          50% { transform: translateY(-1px); filter: brightness(1.12); }
          100% { transform: translateY(0); filter: brightness(1); }
        }
        .animate-anticipatePulse { animation: anticipatePulse 520ms ease-in-out infinite; }
      `}</style>
    </div>
  );
}