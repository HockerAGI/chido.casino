// src/app/games/crash/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { supabaseBrowser } from "@/lib/supabaseClient";
import {
  Loader2,
  Zap,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  History,
  Flame,
} from "lucide-react";

type CrashApi = {
  ok?: boolean;
  crashMultiplier?: number;
  targetMultiplier?: number;
  didCashout?: boolean;
  payout?: number;
  houseEdgeBps?: number;
  serverSeedHash?: string;
  serverSeed?: string;
  refId?: string;
  error?: string;
  message?: string;
  maxBet?: number;
};

function mxn(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function clamp(n: number, a: number, b: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}
function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}
function vibrate(ms: number) {
  try {
    // @ts-ignore
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

/**
 * ✅ SFX “crash casino” por WebAudio (sin MP3)
 * - click, tick loop, win, bust
 */
function useCrashWebAudio(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const tickRef = useRef<{ stop: () => void } | null>(null);

  const ensure = () => {
    if (!enabled) return null;
    if (typeof window === "undefined") return null;
    // @ts-ignore
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current!;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  };

  const tone = (freq: number, ms: number, type: OscillatorType, gain: number) => {
    const ctx = ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

    o.start(now);
    o.stop(now + ms / 1000 + 0.02);
  };

  const sweep = (from: number, to: number, ms: number, gain: number) => {
    const ctx = ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(from, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + ms / 1000);
    g.gain.value = 0.0001;

    o.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

    o.start(now);
    o.stop(now + ms / 1000 + 0.03);
  };

  const noiseBurst = (ms: number, gain: number, bandHz: number) => {
    const ctx = ensure();
    if (!ctx) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * (ms / 1000)));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.7;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = bandHz;
    band.Q.value = 0.9;

    const g = ctx.createGain();
    g.gain.value = 0.0001;

    src.connect(band);
    band.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

    src.start(now);
    src.stop(now + ms / 1000 + 0.02);
  };

  const startTick = (turbo: boolean) => {
    if (!enabled) return;
    stopTick();
    const ctx = ensure();
    if (!ctx) return;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = turbo ? 820 : 640;
    g.gain.value = 0.0001;

    // tremolo
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = turbo ? 14 : 10;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = turbo ? 0.06 : 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);

    o.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(turbo ? 0.05 : 0.04, now + 0.04);

    o.start(now);
    lfo.start(now);

    tickRef.current = {
      stop: () => {
        try {
          const t = ctx.currentTime;
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
          o.stop(t + 0.09);
          lfo.stop(t + 0.09);
        } catch {}
      },
    };
  };

  const stopTick = () => {
    try {
      tickRef.current?.stop();
      tickRef.current = null;
    } catch {}
  };

  return {
    click: () => tone(780, 55, "triangle", 0.06),
    turboOn: () => sweep(240, 980, 120, 0.07),
    turboOff: () => sweep(980, 240, 120, 0.07),
    tickStart: startTick,
    tickStop: stopTick,
    bust: () => {
      noiseBurst(120, 0.10, 1400);
      sweep(520, 160, 240, 0.09);
    },
    win: () => {
      tone(520, 90, "square", 0.06);
      tone(780, 140, "triangle", 0.07);
      tone(1040, 160, "sine", 0.06);
    },
    mega: () => {
      sweep(240, 1400, 340, 0.10);
      noiseBurst(140, 0.09, 1600);
      tone(1320, 180, "sine", 0.07);
    },
  };
}

export default function CrashProPage() {
  const { toast } = useToast();
  const { balance, bonusBalance, formatted, formattedBonus, refresh, loading } = useWalletBalance();
  const available = (balance || 0) + (bonusBalance || 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const [sound, setSound] = useState(true);
  const [vfx, setVfx] = useState(true);
  const [turbo, setTurbo] = useState(false);
  const [haptics, setHaptics] = useState(true);

  const sfx = useCrashWebAudio(sound);

  const [caps, setCaps] = useState<{ maxBet?: number; promoMaxBet?: number } | null>(null);
  const effectiveMaxBet = useMemo(() => {
    const v = caps?.promoMaxBet ?? caps?.maxBet;
    if (!Number.isFinite(Number(v))) return null;
    const n = Number(v);
    return n > 0 ? n : null;
  }, [caps]);

  const clampBet = (value: number) => {
    let n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n <= 0) n = 10;
    if (effectiveMaxBet != null) n = Math.min(n, effectiveMaxBet);
    return Math.max(1, n);
  };

  // load caps if casino_settings exists
  useEffect(() => {
    let cancelled = false;
    const loadCaps = async () => {
      try {
        const sb = supabaseBrowser();
        let r = await sb.from("casino_settings").select("max_bet,promo_max_bet").limit(1).maybeSingle();
        if (r.error) r = await sb.from("casino_settings").select("max_bet").limit(1).maybeSingle();
        if (r.error || !r.data || cancelled) return;

        const row: any = r.data;
        const maxBet = row?.max_bet != null ? Number(row.max_bet) : undefined;
        const promoMaxBet = row?.promo_max_bet != null ? Number(row.promo_max_bet) : undefined;

        const next = {
          maxBet: Number.isFinite(maxBet as any) ? (maxBet as number) : undefined,
          promoMaxBet: Number.isFinite(promoMaxBet as any) ? (promoMaxBet as number) : undefined,
        };
        if (!cancelled) setCaps(next);
      } catch {}
    };
    void loadCaps();
    return () => {
      cancelled = true;
    };
  }, []);

  // persist settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem("chido_crash_settings");
      if (!raw) return;
      const j = JSON.parse(raw);
      if (typeof j.sound === "boolean") setSound(j.sound);
      if (typeof j.vfx === "boolean") setVfx(j.vfx);
      if (typeof j.turbo === "boolean") setTurbo(j.turbo);
      if (typeof j.haptics === "boolean") setHaptics(j.haptics);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("chido_crash_settings", JSON.stringify({ sound, vfx, turbo, haptics }));
    } catch {}
  }, [sound, vfx, turbo, haptics]);

  const QUICK_BETS = useMemo(() => [10, 50, 100, 200, 500, 1000], []);
  const QUICK_TARGETS = useMemo(() => [1.5, 2, 3, 5, 10], []);

  const [bet, setBet] = useState<number>(10);
  const [target, setTarget] = useState<number>(2.0);

  const [state, setState] = useState<"IDLE" | "RUNNING" | "WON" | "CRASHED">("IDLE");
  const [mult, setMult] = useState<number>(1.0);
  const [busy, setBusy] = useState(false);

  const [history, setHistory] = useState<{ crash: number; win: boolean }[]>([]);
  const [lastRound, setLastRound] = useState<{
    crash?: number;
    target?: number;
    payout?: number;
    won?: boolean;
    hash?: string;
    seed?: string;
    edge?: number;
    ref?: string;
    ts: string;
  } | null>(null);

  const timings = useMemo(() => {
    // pragmatic-like: turbo = más rápido
    return turbo
      ? { stepMs: 14, curve: 0.0108, base: 0.0030 }
      : { stepMs: 22, curve: 0.0084, base: 0.0026 };
  }, [turbo]);

  const stopRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const drawCanvas = (multiplier: number, st: typeof state) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // bg grid
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 48) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 48) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // curve
    if (st !== "IDLE") {
      const t = Math.min(1, (multiplier - 1) / 12); // normalize for view
      const x = t * w * 0.86;
      const y = h - t * h * 0.78;

      let color = "#00F0FF";
      if (st === "CRASHED") color = "#FF3D00";
      if (st === "WON") color = "#32CD32";

      // glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.quadraticCurveTo(x * 0.55, h * 0.92, x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      // fill
      ctx.shadowBlur = 0;
      ctx.lineTo(x, h);
      ctx.lineTo(0, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `${color}55`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // “rocket dot”
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.shadowBlur = 0;

      // vfx sparks
      if (vfx && st === "RUNNING") {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "rgba(255,215,0,0.35)";
        for (let i = 0; i < 10; i++) {
          const sx = x + (Math.random() * 22 - 11);
          const sy = y + (Math.random() * 22 - 11);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.random() * 2.2 + 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  // keep canvas anim loop
  useEffect(() => {
    const loop = () => {
      drawCanvas(mult, state);
      rafRef.current = requestAnimationFrame(loop);
    };
    stopRaf();
    rafRef.current = requestAnimationFrame(loop);
    return () => stopRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mult, state, vfx]);

  const toggleTurbo = () => {
    setTurbo((v) => {
      const next = !v;
      if (next) sfx.turboOn();
      else sfx.turboOff();
      toast({
        title: next ? "Turbo ON" : "Turbo OFF",
        description: next ? "Más rápido, más adrenalina." : "Normal, más suave.",
      });
      return next;
    });
  };

  const startRound = async () => {
    if (busy || state === "RUNNING") return;

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (!loading && safeBet > available) {
      toast({
        title: "Saldo insuficiente",
        description: "Te falta feria 😅 (incluye bono si aplica).",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    setState("IDLE");
    setMult(1.0);
    setLastRound(null);

    if (haptics) vibrate(turbo ? 18 : 28);
    sfx.click();

    let data: CrashApi;
    try {
      const res = await fetch("/api/games/crash/play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ betAmount: safeBet, targetMultiplier: target }),
      });

      data = (await res.json().catch(() => ({}))) as CrashApi;

      if (!res.ok) {
        const msg = data?.message || data?.error || "CRASH_ERROR";
        throw new Error(msg);
      }

      refresh();
    } catch (e: any) {
      setBusy(false);
      toast({
        title: "No se armó la ronda",
        description: e?.message || "Inténtale otra vez.",
        variant: "destructive",
      });
      return;
    }

    const crashPoint = Number(data.crashMultiplier || 1);
    const didWin = Boolean(data.didCashout);
    const targetPoint = Number(data.targetMultiplier || target);
    const payout = Number(data.payout || 0);

    setLastRound({
      crash: crashPoint,
      target: targetPoint,
      payout,
      won: didWin,
      hash: data.serverSeedHash,
      seed: data.serverSeed,
      edge: data.houseEdgeBps,
      ref: data.refId,
      ts: new Date().toISOString(),
    });

    setBusy(false);
    setState("RUNNING");
    sfx.tickStart(turbo);

    // simulate multiplier growth until stop point
    let current = 1.0;
    const stopAt = didWin ? targetPoint : crashPoint;
    const step = () => {
      // growth curve
      current += current * timings.curve + timings.base;
      if (current >= stopAt) {
        current = stopAt;
        setMult(current);
        sfx.tickStop();

        if (didWin) {
          setState("WON");
          if (payout / safeBet >= 15) sfx.mega();
          else sfx.win();
          if (haptics) vibrate(60);

          toast({
            title: "¡Se armó! Cobraste ✅",
            description: `${targetPoint.toFixed(2)}x • +${mxn(payout)} MXN`,
          });
        } else {
          setState("CRASHED");
          sfx.bust();
          if (haptics) vibrate(45);

          toast({
            title: "CRASH 💥",
            description: `Tronó en ${crashPoint.toFixed(2)}x… ni modo, a la otra.`,
            variant: "destructive",
          });
        }

        setHistory((prev) => [{ crash: crashPoint, win: didWin }, ...prev].slice(0, 12));
        refresh();
        return;
      }

      setMult(current);
      setTimeout(step, timings.stepMs);
    };

    setTimeout(step, timings.stepMs);
  };

  const canPlay = state !== "RUNNING" && !busy;

  return (
    <div className="relative min-h-[calc(100vh-90px)] w-full pb-24">
      {/* BG */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-18" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(0,240,255,0.12),transparent_55%),radial-gradient(circle_at_75%_35%,rgba(255,0,153,0.14),transparent_55%),radial-gradient(circle_at_55%_85%,rgba(255,215,0,0.10),transparent_55%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <Image src="/isotipo-color.png" alt="CHIDO" fill className="object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">
                Chido Crash <span className="text-[#00F0FF]">PRO</span>
              </div>
              <div className="text-xs text-white/55">
                Auto-cobro real por target • vibe casino sin saturar
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSound((v) => !v)}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 flex items-center justify-center"
              aria-label="Sonido"
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={() => setVfx((v) => !v)}
              className={`h-10 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                vfx ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="VFX"
            >
              <Sparkles size={16} />
              VFX
            </button>

            <button
              onClick={toggleTurbo}
              className={`h-10 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                turbo ? "bg-[#FFD700] text-black border-[#FFD700]/40" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Turbo"
            >
              <Zap size={16} />
              Turbo
            </button>

            <button
              onClick={() => setHaptics((v) => !v)}
              className={`h-10 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                haptics ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Haptics"
            >
              <Flame size={16} />
              Vibra
            </button>
          </div>
        </div>

        {/* layout */}
        <div className="mt-5 flex flex-col lg:flex-row gap-5">
          {/* Sidebar */}
          <div className="w-full lg:w-[360px] rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl h-fit">
            {/* Balance */}
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Disponible</div>
              <div className="mt-1 text-lg font-black tabular-nums">
                {loading ? "..." : formatted}{" "}
                <span className="text-xs text-white/45">+ bono {loading ? "..." : formattedBonus}</span>
              </div>
            </div>

            {/* Bet */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-black text-white/55 uppercase tracking-widest">
                  Apuesta {effectiveMaxBet != null ? `(max ${effectiveMaxBet})` : ""}
                </label>
                <div className="mt-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 font-black">$</span>
                  <Input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(clampBet(Number(e.target.value)))}
                    className="bg-black/40 border-white/10 h-12 pl-8 font-mono text-white"
                    disabled={state === "RUNNING"}
                  />
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {QUICK_BETS.map((v) => {
                    const disabled = state === "RUNNING" || (effectiveMaxBet != null && v > effectiveMaxBet);
                    return (
                      <button
                        key={v}
                        onClick={() => setBet(clampBet(v))}
                        disabled={disabled}
                        className="bg-white/5 text-xs py-2 rounded-2xl border border-white/10 hover:bg-white/10 transition disabled:opacity-40"
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target */}
              <div>
                <label className="text-[10px] font-black text-white/55 uppercase tracking-widest">Auto-cobro (x)</label>
                <Input
                  type="number"
                  value={target}
                  step="0.10"
                  onChange={(e) => setTarget(clamp(Number(e.target.value), 1.01, 1000))}
                  className="bg-black/40 border-white/10 h-12 font-mono text-white"
                  disabled={state === "RUNNING"}
                />
                <div className="mt-2 flex gap-2 flex-wrap">
                  {QUICK_TARGETS.map((x) => (
                    <button
                      key={x}
                      onClick={() => setTarget(x)}
                      disabled={state === "RUNNING"}
                      className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/80 hover:bg-white/10 disabled:opacity-40 transition"
                    >
                      {x}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Play */}
              <Button
                onClick={startRound}
                disabled={!canPlay}
                className={`h-14 rounded-3xl text-lg font-black uppercase tracking-widest transition-all ${
                  state === "RUNNING"
                    ? "bg-zinc-700 opacity-60 cursor-not-allowed"
                    : "bg-[#00F0FF] text-black hover:bg-[#00d6e6] shadow-[0_0_30px_rgba(0,240,255,0.22)] hover:scale-[1.01]"
                }`}
              >
                {busy ? <Loader2 className="animate-spin" /> : state === "RUNNING" ? "EN JUEGO..." : "APOSTAR"}
              </Button>

              <div className="text-[11px] text-white/45 flex items-center gap-2">
                <Info size={14} /> Si no cae hoy, no te agüites. Esto es de paciencia 😮‍💨
              </div>
            </div>

            {/* Provably fair */}
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4 text-xs text-white/70">
              <div className="flex items-center gap-2 font-black text-white/85">
                <Info size={14} /> Provably Fair
              </div>
              {lastRound?.hash ? (
                <div className="mt-2 font-mono break-all text-[11px] text-white/65">
                  hash: {lastRound.hash}
                  {typeof lastRound.edge === "number" ? <> • edge: {lastRound.edge} bps</> : null}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/55">Se muestra después de una ronda.</div>
              )}
            </div>
          </div>

          {/* Game stage */}
          <div className="flex-1 flex flex-col gap-4">
            {/* history pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs text-white/55 font-black border border-white/10">
                <History size={12} /> RECIENTES
              </div>
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-black whitespace-nowrap border ${
                    h.win
                      ? "bg-[#32CD32]/10 text-[#32CD32] border-[#32CD32]/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {h.crash.toFixed(2)}x
                </div>
              ))}
            </div>

            {/* canvas */}
            <div className="relative flex-1 min-h-[420px] bg-[#0f0f11] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-18">
                <Image src="/opengraph-image.jpg" alt="Overlay" fill className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/75" />
              {vfx ? (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(0,240,255,0.12),transparent_45%),radial-gradient(circle_at_35%_70%,rgba(255,0,153,0.10),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,215,0,0.10),transparent_55%)]" />
              ) : null}

              <canvas ref={canvasRef} className="relative z-10 w-full h-full" />

              {/* HUD */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                <div
                  className={`text-7xl sm:text-8xl lg:text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-150 ${
                    state === "CRASHED" ? "text-[#FF3D00]" : state === "WON" ? "text-[#32CD32]" : "text-white"
                  }`}
                >
                  {mult.toFixed(2)}x
                </div>

                {state === "CRASHED" ? (
                  <div className="mt-4 px-6 py-2 bg-[#FF3D00] text-black font-black text-lg uppercase tracking-widest rounded-full animate-in zoom-in">
                    CRASH 💥
                  </div>
                ) : null}

                {state === "WON" ? (
                  <div className="mt-4 px-6 py-2 bg-[#32CD32] text-black font-black text-lg uppercase tracking-widest rounded-full animate-in zoom-in">
                    COBRADO ✅
                  </div>
                ) : null}

                {state === "RUNNING" ? (
                  <div className="mt-4 text-xs text-white/60 font-black uppercase tracking-widest">
                    Auto-cobro en {target.toFixed(2)}x
                  </div>
                ) : null}

                {/* payout line */}
                {lastRound?.won && state === "WON" ? (
                  <div className="mt-2 text-sm text-white/80 font-black">
                    +{mxn(lastRound.payout || 0)} MXN
                  </div>
                ) : null}
              </div>
            </div>

            {/* footer note */}
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/45">
              <div className="inline-flex items-center gap-2">
                <Flame size={14} className="text-[#FF5E00]" />
                Tip: si traes mala racha, bájale tantito y juega con cabeza.
              </div>
              <div className="inline-flex items-center gap-2">
                <Image src="/isotipo-bw.png" alt="CHIDO" width={18} height={18} className="opacity-70" />
                <span>CHIDO Originals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* small global note */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}