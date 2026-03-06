// src/app/games/taco-slot/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { supabaseBrowser } from "@/lib/supabaseClient";
import {
  Loader2,
  Zap,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  Trophy,
  Settings2,
  X,
} from "lucide-react";

type SymbolKey = "verde" | "jalapeno" | "serrano" | "habanero";

type SpinApi =
  | {
      ok: true;
      spinId: string;
      bet: number;
      payout: number;
      multiplier: number;
      reels: Array<{ key: SymbolKey; img?: string }>;
      level?: { key: SymbolKey; label: string; badge: string };
      rtp?: number;
      fair?: {
        serverSeedHash?: string;
        serverSeed?: string;
        clientSeed?: string;
        nonce?: number;
      };
    }
  | { ok: false; error: string };

const LEVEL_BADGES: Record<SymbolKey, string> = {
  verde: "/badge-verde.png",
  jalapeno: "/badge-jalapeno.png",
  serrano: "/badge-serrano.png",
  habanero: "/badge-habanero.png",
};

const SYMBOL_KEYS: SymbolKey[] = ["verde", "jalapeno", "serrano", "habanero"];

function mxn(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function pickRandomSymbol() {
  return SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
}

/**
 * ✅ Símbolos PRO SIN assets extra:
 * - No usa badges en los reels.
 * - Genera iconos tipo “slot symbol” con SVG (data URI).
 * - Badges quedan SOLO para “nivel”.
 */
function svgData(svg: string) {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

const SLOT_SYMBOL_SVG: Record<SymbolKey, string> = {
  verde: svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="35%" cy="30%" r="70%">
      <stop offset="0" stop-color="#1bff9f" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pep" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#37ff7b"/>
      <stop offset="0.55" stop-color="#1bbf4a"/>
      <stop offset="1" stop-color="#0b5d22"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffefad"/>
      <stop offset="0.35" stop-color="#ffd56a"/>
      <stop offset="0.7" stop-color="#d19a25"/>
      <stop offset="1" stop-color="#fff2b8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="none"/>
  <g>
    <path d="M256 38c80 0 138 25 170 68 30 40 36 95 18 156-29 98-109 200-188 248-79-48-159-150-188-248-18-61-12-116 18-156 32-43 90-68 170-68z"
      fill="rgba(0,0,0,0.38)" stroke="url(#gold)" stroke-width="18"/>
    <ellipse cx="256" cy="190" rx="190" ry="160" fill="url(#bg)"/>
    <g transform="translate(86,120) rotate(-12)">
      <path d="M260 55c25 0 43 18 43 41 0 18-11 32-26 39-4 2-7 7-7 11
               0 78-66 169-166 201-39 13-77-7-92-40-14-32-5-74 30-97
               68-45 141-106 155-171 2-9 10-16 20-16h43z"
            fill="url(#pep)"/>
      <path d="M257 61c-3-22 10-44 33-52 17-6 33-3 45 6"
            fill="none" stroke="#32ffcd" stroke-width="10" stroke-linecap="round" opacity="0.7"/>
      <path d="M118 211c58-45 109-63 142-143" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="12" stroke-linecap="round"/>
      <circle cx="265" cy="72" r="10" fill="rgba(255,255,255,0.35)"/>
    </g>
  </g>
</svg>`),
  jalapeno: svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="75%">
      <stop offset="0" stop-color="#00f0ff" stop-opacity="0.20"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pep" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2cff6a"/>
      <stop offset="0.5" stop-color="#14a83a"/>
      <stop offset="1" stop-color="#0a4a1c"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff0b6"/>
      <stop offset="0.35" stop-color="#ffd56a"/>
      <stop offset="0.7" stop-color="#c98e20"/>
      <stop offset="1" stop-color="#fff7c9"/>
    </linearGradient>
    <linearGradient id="cut" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffefc9"/>
      <stop offset="1" stop-color="#ffe08a"/>
    </linearGradient>
  </defs>
  <path d="M256 38c80 0 138 25 170 68 30 40 36 95 18 156-29 98-109 200-188 248-79-48-159-150-188-248-18-61-12-116 18-156 32-43 90-68 170-68z"
      fill="rgba(0,0,0,0.38)" stroke="url(#gold)" stroke-width="18"/>
  <ellipse cx="256" cy="190" rx="190" ry="160" fill="url(#bg)"/>
  <g transform="translate(90,132)">
    <path d="M286 48c20 8 30 27 24 48-6 20-24 34-46 31-8-1-12 3-15 10
             -33 92-108 171-195 183-38 5-71-21-78-56-7-35 14-70 50-84
             74-28 151-71 187-154 3-7 10-12 18-12 26 0 40 0 55 0z"
          fill="url(#pep)"/>
    <g transform="translate(165,105) rotate(12)">
      <path d="M0 0c36 8 66 7 88-10 16-12 19-30 6-44-10-11-27-10-44-1
               C31-43 11-18 0 0z" fill="url(#cut)" opacity="0.95"/>
      <circle cx="18" cy="-10" r="6" fill="#caa052"/>
      <circle cx="32" cy="-18" r="6" fill="#caa052"/>
      <circle cx="46" cy="-22" r="6" fill="#caa052"/>
      <circle cx="25" cy="-30" r="5" fill="#b78c42"/>
      <circle cx="55" cy="-12" r="5" fill="#b78c42"/>
    </g>
    <path d="M92 214c48-38 105-60 142-140" fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="12" stroke-linecap="round"/>
  </g>
</svg>`),
  serrano: svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="30%" cy="35%" r="75%">
      <stop offset="0" stop-color="#32cd32" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pep" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7dff4f"/>
      <stop offset="0.5" stop-color="#21c24a"/>
      <stop offset="1" stop-color="#0d5b27"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff0b6"/>
      <stop offset="0.35" stop-color="#ffd56a"/>
      <stop offset="0.7" stop-color="#c98e20"/>
      <stop offset="1" stop-color="#fff7c9"/>
    </linearGradient>
  </defs>
  <path d="M256 38c80 0 138 25 170 68 30 40 36 95 18 156-29 98-109 200-188 248-79-48-159-150-188-248-18-61-12-116 18-156 32-43 90-68 170-68z"
      fill="rgba(0,0,0,0.38)" stroke="url(#gold)" stroke-width="18"/>
  <ellipse cx="256" cy="190" rx="190" ry="160" fill="url(#bg)"/>
  <g transform="translate(92,125) rotate(-8)">
    <path d="M292 60c22 9 33 33 22 56-8 18-29 29-49 24-8-2-13 2-16 10
             -35 101-129 175-228 174-35 0-61-28-60-63 1-35 27-58 61-65
             85-18 170-56 209-143 4-10 13-15 23-15h38z"
          fill="url(#pep)"/>
    <path d="M120 220c64-20 128-54 160-146" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="12" stroke-linecap="round"/>
    <circle cx="275" cy="86" r="10" fill="rgba(255,255,255,0.32)"/>
  </g>
</svg>`),
  habanero: svgData(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="60%" cy="30%" r="80%">
      <stop offset="0" stop-color="#ff0099" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pep" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffb000"/>
      <stop offset="0.25" stop-color="#ff6a00"/>
      <stop offset="0.6" stop-color="#ff2d2d"/>
      <stop offset="1" stop-color="#8a0d0d"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff0b6"/>
      <stop offset="0.35" stop-color="#ffd56a"/>
      <stop offset="0.7" stop-color="#c98e20"/>
      <stop offset="1" stop-color="#fff7c9"/>
    </linearGradient>
  </defs>
  <path d="M256 38c80 0 138 25 170 68 30 40 36 95 18 156-29 98-109 200-188 248-79-48-159-150-188-248-18-61-12-116 18-156 32-43 90-68 170-68z"
      fill="rgba(0,0,0,0.38)" stroke="url(#gold)" stroke-width="18"/>
  <ellipse cx="256" cy="190" rx="190" ry="160" fill="url(#bg)"/>
  <g transform="translate(150,112)">
    <path d="M88 52c42-30 98-16 128 22 33 42 23 106-18 149
             -22 23-44 43-58 74-7 15-23 25-41 25-18 0-34-10-41-25
             -14-31-36-51-58-74-41-43-51-107-18-149 30-38 86-52 128-22z"
          fill="url(#pep)"/>
    <path d="M148 48c-6-26 6-44 26-56 19-12 42-12 60-1"
          fill="none" stroke="rgba(255,215,0,0.55)" stroke-width="10" stroke-linecap="round"/>
    <path d="M116 126c-20 26-17 55 9 78" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="12" stroke-linecap="round"/>
    <circle cx="170" cy="92" r="10" fill="rgba(255,255,255,0.28)"/>
  </g>
</svg>`),
};

/**
 * ✅ SFX “mex-casino” por WebAudio (sin bajar MP3)
 * - Click, Spin loop, Stop, Win, Mega, Lose, Anticipation
 * - Si luego metes MP3, lo hacemos después. Ahorita esto ya suena.
 */
function useWebAudioSfx(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const spinRef = useRef<{ stop: () => void } | null>(null);

  const ensure = () => {
    if (!enabled) return null;
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      // @ts-ignore
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();
    }
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
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.65;

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

  const startSpinLoop = () => {
    if (!enabled) return;
    stopSpinLoop();

    const ctx = ensure();
    if (!ctx) return;

    // loop de “rodado” (ruido bandpass + leve tremolo)
    const bufferSize = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900;
    band.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.value = 0.0001;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 9.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06;

    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);

    src.connect(band);
    band.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.03);

    src.start(now);
    lfo.start(now);

    spinRef.current = {
      stop: () => {
        try {
          const t = ctx.currentTime;
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
          src.stop(t + 0.07);
          lfo.stop(t + 0.07);
        } catch {}
      },
    };
  };

  const stopSpinLoop = () => {
    try {
      spinRef.current?.stop();
      spinRef.current = null;
    } catch {}
  };

  return {
    click: () => tone(780, 55, "triangle", 0.06),
    turboOn: () => sweep(220, 980, 120, 0.07),
    turboOff: () => sweep(980, 220, 120, 0.07),
    stop: () => noiseBurst(90, 0.09, 1200),
    lose: () => sweep(420, 160, 220, 0.08),
    winSmall: () => {
      tone(660, 90, "sine", 0.07);
      tone(990, 120, "sine", 0.06);
    },
    winBig: () => {
      tone(520, 100, "square", 0.06);
      tone(780, 140, "triangle", 0.07);
      tone(1040, 160, "sine", 0.06);
    },
    winMega: () => {
      sweep(240, 1200, 320, 0.09);
      tone(1320, 160, "sine", 0.07);
      noiseBurst(120, 0.08, 1600);
    },
    anticipation: () => {
      tone(420, 100, "sine", 0.05);
      tone(520, 100, "sine", 0.05);
      tone(620, 120, "sine", 0.06);
    },
    spinStart: startSpinLoop,
    spinStop: stopSpinLoop,
  };
}

function vibrate(ms: number) {
  try {
    // @ts-ignore
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

export default function TacoSlotProPage() {
  const { toast } = useToast();
  const { balance, bonusBalance, formatted, formattedBonus, refresh, loading } = useWalletBalance();

  const available = (balance || 0) + (bonusBalance || 0);

  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [turbo, setTurbo] = useState(false);
  const [autoLeft, setAutoLeft] = useState(0);
  const [vfx, setVfx] = useState(true);

  const sfx = useWebAudioSfx(sound);

  const [bet, setBet] = useState<number>(10);
  const [spinning, setSpinning] = useState(false);
  const [stopPhase, setStopPhase] = useState<0 | 1 | 2 | 3>(0); // cuántos reels ya “pararon”
  const [anticipating, setAnticipating] = useState(false);

  const [level, setLevel] = useState<{ key: SymbolKey; label: string; badge: string } | null>(null);

  // 3 reels x 3 rows: [top, mid(payline), bottom]
  const [grid, setGrid] = useState<SymbolKey[][]>(() => [
    [pickRandomSymbol(), "verde", pickRandomSymbol()],
    [pickRandomSymbol(), "jalapeno", pickRandomSymbol()],
    [pickRandomSymbol(), "serrano", pickRandomSymbol()],
  ]);

  const spinIntervalRef = useRef<number | null>(null);
  const autoRef = useRef<number>(0);
  autoRef.current = autoLeft;

  const [last, setLast] = useState<{
    spinId?: string;
    payout: number;
    multiplier: number;
    winKind: "none" | "small" | "big" | "mega";
    fairHash?: string;
    fairNonce?: number;
  } | null>(null);

  const [showPaytable, setShowPaytable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // “Cap” solo si existe en tu DB. No invento columnas: si no existe, se oculta.
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

  // Cargar caps si existe casino_settings
  useEffect(() => {
    let cancelled = false;

    const loadCaps = async () => {
      try {
        const sb = supabaseBrowser();
        // intento 1: max_bet + promo_max_bet
        let r = await sb.from("casino_settings").select("max_bet,promo_max_bet").limit(1).maybeSingle();
        if (r.error) {
          // intento 2: solo max_bet
          r = await sb.from("casino_settings").select("max_bet").limit(1).maybeSingle();
        }
        if (r.error || !r.data || cancelled) return;

        const row: any = r.data;
        const maxBet = row?.max_bet != null ? Number(row.max_bet) : undefined;
        const promoMaxBet = row?.promo_max_bet != null ? Number(row.promo_max_bet) : undefined;

        const next = {
          maxBet: Number.isFinite(maxBet as any) ? (maxBet as number) : undefined,
          promoMaxBet: Number.isFinite(promoMaxBet as any) ? (promoMaxBet as number) : undefined,
        };

        if (!cancelled) setCaps(next);
      } catch {
        // ignore
      }
    };

    void loadCaps();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist settings (simple)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("chido_taco_slot_settings");
      if (!raw) return;
      const j = JSON.parse(raw);
      if (typeof j.sound === "boolean") setSound(j.sound);
      if (typeof j.haptics === "boolean") setHaptics(j.haptics);
      if (typeof j.turbo === "boolean") setTurbo(j.turbo);
      if (typeof j.vfx === "boolean") setVfx(j.vfx);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "chido_taco_slot_settings",
        JSON.stringify({ sound, haptics, turbo, vfx })
      );
    } catch {}
  }, [sound, haptics, turbo, vfx]);

  const QUICK_BETS = useMemo(() => [10, 20, 50, 100, 200, 500], []);
  const AUTO_CHOICES = useMemo(() => [10, 25, 50, 100], []);

  const spinTimings = useMemo(() => {
    // turbo: más rápido y “seco”
    return turbo
      ? { total: 820, stopGap: 110, tick: 45 }
      : { total: 1250, stopGap: 170, tick: 75 };
  }, [turbo]);

  const stopSpinVisuals = () => {
    if (spinIntervalRef.current != null) {
      window.clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
  };

  const startSpinVisuals = () => {
    stopSpinVisuals();
    spinIntervalRef.current = window.setInterval(() => {
      setGrid([
        [pickRandomSymbol(), pickRandomSymbol(), pickRandomSymbol()],
        [pickRandomSymbol(), pickRandomSymbol(), pickRandomSymbol()],
        [pickRandomSymbol(), pickRandomSymbol(), pickRandomSymbol()],
      ]);
    }, spinTimings.tick);
  };

  const classifyWin = (payout: number, betAmount: number) => {
    const ratio = betAmount > 0 ? payout / betAmount : 0;
    if (ratio >= 20) return "mega" as const;
    if (ratio >= 8) return "big" as const;
    if (ratio > 0) return "small" as const;
    return "none" as const;
  };

  const doSpin = async (byAuto = false) => {
    if (spinning) return;

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (!loading && safeBet > available) {
      setAutoLeft(0);
      toast({
        title: "Saldo insuficiente",
        description: "Te falta feria 😅 (incluye bono si aplica).",
        variant: "destructive",
      });
      return;
    }

    setSpinning(true);
    setStopPhase(0);
    setAnticipating(false);
    setLast(null);

    if (haptics) vibrate(turbo ? 18 : 30);
    sfx.click();
    sfx.spinStart();

    startSpinVisuals();

    let data: SpinApi;
    try {
      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bet: safeBet }),
      });
      data = (await res.json().catch(() => ({ ok: false, error: "BAD_JSON" }))) as SpinApi;

      if (!res.ok || !data || (data as any).ok !== true) {
        const err = (data as any)?.error || "SPIN_ERROR";
        throw new Error(err);
      }
    } catch (e: any) {
      stopSpinVisuals();
      sfx.spinStop();
      setSpinning(false);
      setAutoLeft(0);

      toast({
        title: "No se armó el giro",
        description: e?.message || "Inténtale otra vez.",
        variant: "destructive",
      });
      return;
    }

    const ok = data as Extract<SpinApi, { ok: true }>;
    const keys = ok.reels?.map((r) => r.key) || ["verde", "verde", "verde"];

    // Anticipación: si los 2 primeros del payline se parecen
    const willAnticipate = keys[0] === keys[1] && keys[2] !== keys[0];
    if (willAnticipate) {
      setAnticipating(true);
      if (sound) sfx.anticipation();
    }

    const finalReels: SymbolKey[][] = [
      [pickRandomSymbol(), keys[0] || "verde", pickRandomSymbol()],
      [pickRandomSymbol(), keys[1] || "verde", pickRandomSymbol()],
      [pickRandomSymbol(), keys[2] || "verde", pickRandomSymbol()],
    ];

    // Stop sequence tipo “slot comercial”: 1, 2, 3
    const t0 = window.setTimeout(() => {
      setStopPhase(1);
      setGrid((prev) => [[finalReels[0][0], finalReels[0][1], finalReels[0][2]], prev[1], prev[2]]);
      if (sound) sfx.stop();
      if (haptics) vibrate(12);
    }, spinTimings.total - spinTimings.stopGap * 2);

    const t1 = window.setTimeout(() => {
      setStopPhase(2);
      setGrid((prev) => [prev[0], [finalReels[1][0], finalReels[1][1], finalReels[1][2]], prev[2]]);
      if (sound) sfx.stop();
      if (haptics) vibrate(12);
    }, spinTimings.total - spinTimings.stopGap);

    const t2 = window.setTimeout(() => {
      stopSpinVisuals();
      sfx.spinStop();
      setStopPhase(3);
      setGrid((prev) => [prev[0], prev[1], [finalReels[2][0], finalReels[2][1], finalReels[2][2]]]);
      if (sound) sfx.stop();
      if (haptics) vibrate(12);

      // Resultado
      const payout = Number(ok.payout || 0);
      const mult = Number(ok.multiplier || 0);
      const kind = classifyWin(payout, safeBet);

      setLevel(ok.level || null);

      setLast({
        spinId: ok.spinId,
        payout,
        multiplier: mult,
        winKind: kind,
        fairHash: ok.fair?.serverSeedHash,
        fairNonce: ok.fair?.nonce,
      });

      // SFX win/lose
      if (kind === "mega") sfx.winMega();
      else if (kind === "big") sfx.winBig();
      else if (kind === "small") sfx.winSmall();
      else sfx.lose();

      // Toast mex-casino (comercial / entendible)
      if (payout > 0) {
        toast({
          title: kind === "mega" ? "MEGA WIN 🔥" : kind === "big" ? "¡Qué chido! Pegó" : "Ganaste 👌",
          description: `+${mxn(payout)} MXN • x${mult}`,
        });
      } else if (!byAuto) {
        toast({
          title: "Nada esta vez",
          description: "No cayó… pero ya merito 😮‍💨",
        });
      }

      // Refresh wallet
      refresh();

      // Autoplay driver
      window.setTimeout(() => {
        setSpinning(false);
        setAnticipating(false);

        if (autoRef.current > 0) {
          setAutoLeft((n) => Math.max(0, n - 1));
        }
      }, turbo ? 120 : 220);
    }, spinTimings.total);

    // cleanup if unmount mid-spin
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  };

  // Autoplay effect
  useEffect(() => {
    if (autoLeft <= 0) return;
    if (spinning) return;

    const t = window.setTimeout(() => {
      void doSpin(true);
    }, turbo ? 190 : 280);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLeft, spinning, turbo]);

  const toggleAuto = (count: number) => {
    if (spinning) return;

    if (autoLeft > 0) {
      setAutoLeft(0);
      toast({ title: "Auto detenido", description: "Listo. Tú mandas 😎" });
      return;
    }
    const c = clampInt(count, 1, 200);
    setAutoLeft(c);
    toast({ title: "Auto activado", description: `Se arma con ${c} giros.` });
  };

  const setTurboSafe = () => {
    setTurbo((v) => {
      const next = !v;
      if (next) sfx.turboOn();
      else sfx.turboOff();
      toast({ title: next ? "Turbo ON" : "Turbo OFF", description: next ? "Más rápido, más seco." : "Normal, más suave." });
      return next;
    });
  };

  const canSpin = !spinning && (!loading ? bet <= available : true);

  const payline = useMemo(() => [grid[0][1], grid[1][1], grid[2][1]] as SymbolKey[], [grid]);

  return (
    <div className="relative w-full min-h-[72vh] overflow-hidden rounded-[28px] border border-white/10 bg-black/40">
      {/* BG */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-25" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/55 to-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,0,153,0.18),transparent_55%),radial-gradient(circle_at_70%_35%,rgba(0,240,255,0.16),transparent_55%),radial-gradient(circle_at_55%_85%,rgba(50,205,50,0.12),transparent_55%)]" />
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image src="/isotipo-color.png" alt="CHIDO" fill className="object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight">
                Taco Slot <span className="text-[#00F0FF]">PRO</span>
              </div>
              <div className="text-[11px] text-white/60">
                Payline centro • 3x3 • vibe casino (sin “badges” en reels)
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
              onClick={() => setShowPaytable(true)}
              className="h-10 px-3 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 text-xs font-black inline-flex items-center gap-2"
            >
              <Trophy size={16} />
              Paytable
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="h-10 px-3 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 text-xs font-black inline-flex items-center gap-2"
            >
              <Settings2 size={16} />
              Ajustes
            </button>
          </div>
        </div>

        {/* Content grid */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* MACHINE */}
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-4 sm:p-6">
            {/* frame glow */}
            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,215,0,0.10),transparent_60%),radial-gradient(circle_at_20%_80%,rgba(255,0,153,0.16),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(0,240,255,0.14),transparent_55%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/65" />

            <div className="relative z-10">
              {/* Payline header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-black text-white/90">
                  Payline centro{" "}
                  <span className="text-[11px] text-white/45 font-bold">
                    {turbo ? "• turbo" : "• normal"}
                    {autoLeft > 0 ? ` • auto ${autoLeft}` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {level ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                      <div className="relative h-7 w-7">
                        <Image
                          src={LEVEL_BADGES[level.key] || level.badge}
                          alt={level.label}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="text-xs text-white/70">
                        Nivel: <b className="text-white">{level.label}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-white/50">Nivel: se calcula por apuesta</div>
                  )}
                </div>
              </div>

              {/* REELS */}
              <div className="mt-4 relative rounded-[28px] border border-[#ffd56a33] bg-[#0b0b0e] p-4 sm:p-5 overflow-hidden shadow-[0_35px_110px_rgba(0,0,0,0.65)]">
                {/* gold-ish inner frame */}
                <div className="absolute inset-0 rounded-[28px] border border-[#ffd56a22] pointer-events-none" />
                {/* subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />

                {/* Payline highlight */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-20 sm:h-24 bg-[#00F0FF]/10 border-y border-[#00F0FF]/15 pointer-events-none" />
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-[#00F0FF]/35 blur-[0.2px] pointer-events-none" />

                <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-4">
                  {grid.map((reel, reelIndex) => {
                    const isStopping = stopPhase >= reelIndex + 1;
                    const isAnticipateReel = anticipating && reelIndex === 2 && stopPhase < 3;

                    return (
                      <div
                        key={reelIndex}
                        className={[
                          "relative rounded-2xl border border-white/10 bg-black/35 overflow-hidden",
                          "shadow-[0_0_35px_rgba(0,0,0,0.35)]",
                          isAnticipateReel ? "ring-2 ring-[#FFD700]/40 shadow-[0_0_40px_rgba(255,215,0,0.15)]" : "",
                        ].join(" ")}
                      >
                        {/* shine */}
                        <div className={spinning && !isStopping ? "absolute inset-0 animate-reelShine" : "absolute inset-0"} />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/55 pointer-events-none" />

                        <div className="relative z-10 grid grid-rows-3 gap-2 p-3 sm:p-4">
                          {reel.map((sym, rowIndex) => {
                            const isPayline = rowIndex === 1;
                            return (
                              <div
                                key={`${reelIndex}-${rowIndex}`}
                                className={[
                                  "relative flex items-center justify-center rounded-xl border border-white/10 bg-black/25",
                                  "aspect-square",
                                  isPayline ? "border-[#00F0FF]/25 bg-[#00F0FF]/[0.06]" : "",
                                  spinning && !isStopping ? "animate-slotJitter" : "",
                                  isStopping && isPayline ? "animate-stopPop" : "",
                                ].join(" ")}
                              >
                                {/* icon */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={SLOT_SYMBOL_SVG[sym]}
                                  alt={sym}
                                  className="w-[82%] h-[82%] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)]"
                                  draggable={false}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* stop dot */}
                        <div
                          className={[
                            "absolute top-2 right-2 h-2.5 w-2.5 rounded-full",
                            spinning && !isStopping ? "bg-[#00F0FF]/70 animate-pulse" : "bg-white/15",
                          ].join(" ")}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* WIN overlay */}
                {last && last.winKind !== "none" && vfx ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="text-center px-6">
                      <div
                        className={[
                          "text-5xl sm:text-6xl font-black drop-shadow-2xl",
                          last.winKind === "mega"
                            ? "text-[#FFD700]"
                            : last.winKind === "big"
                              ? "text-[#00F0FF]"
                              : "text-[#32CD32]",
                        ].join(" ")}
                      >
                        {last.winKind === "mega" ? "MEGA WIN" : last.winKind === "big" ? "BIG WIN" : "WIN"}
                      </div>
                      <div className="mt-2 text-white text-xl font-black">
                        +{mxn(last.payout)} <span className="text-white/60 text-base">MXN</span>
                      </div>
                      <div className="mt-1 text-white/70 text-sm">x{last.multiplier}</div>
                      <div className="mt-4 text-[11px] text-white/55">
                        Tip: turbo = más rápido. Auto = se arma solo. (sin saturar, pero sí se siente PRO)
                      </div>
                    </div>

                    {/* particles */}
                    <div className={`absolute inset-0 pointer-events-none ${last.winKind !== "small" ? "animate-confetti" : "animate-sparks"}`} />
                  </div>
                ) : null}
              </div>

              {/* Bottom controls (Pragmatic-like) */}
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr] items-center">
                {/* Left: bet & quick */}
                <div className="rounded-[26px] border border-white/10 bg-black/30 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Saldo</div>
                      <div className="text-lg font-black tabular-nums">
                        {loading ? "..." : formatted}{" "}
                        <span className="text-xs text-white/45">+ bono {loading ? "..." : formattedBonus}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Apuesta</div>
                      <div className="text-lg font-black tabular-nums">
                        ${bet}
                        {effectiveMaxBet != null ? (
                          <span className="text-xs text-white/45"> / max {effectiveMaxBet}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {QUICK_BETS.map((v) => {
                        const disabled = spinning || (effectiveMaxBet != null && v > effectiveMaxBet);
                        return (
                          <button
                            key={v}
                            onClick={() => setBet(clampBet(v))}
                            disabled={disabled}
                            className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/80 hover:bg-white/10 disabled:opacity-40 transition"
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBet(clampBet(bet - 10))}
                        disabled={spinning}
                        className="h-10 w-10 rounded-2xl bg-black/40 border border-white/10 text-white font-black hover:bg-white/5 disabled:opacity-40 transition"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setBet(clampBet(bet + 10))}
                        disabled={spinning}
                        className="h-10 w-10 rounded-2xl bg-black/40 border border-white/10 text-white font-black hover:bg-white/5 disabled:opacity-40 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Center: SPIN */}
                <div className="flex items-center justify-center">
                  <Button
                    onClick={() => void doSpin(false)}
                    disabled={!canSpin}
                    className={[
                      "h-16 w-56 sm:w-64 rounded-[999px] font-black text-lg uppercase tracking-widest transition-all",
                      spinning
                        ? "bg-zinc-700 text-white/70 cursor-not-allowed"
                        : "bg-gradient-to-b from-[#00F0FF] to-[#0099FF] text-black hover:scale-[1.01] shadow-[0_0_40px_rgba(0,240,255,0.22)]",
                    ].join(" ")}
                  >
                    {spinning ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="animate-spin" /> Girando…
                      </span>
                    ) : (
                      "GIRAR"
                    )}
                  </Button>
                </div>

                {/* Right: turbo + auto */}
                <div className="rounded-[26px] border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={setTurboSafe}
                      className={`h-12 px-4 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                        turbo ? "bg-[#FFD700] text-black border-[#FFD700]/40" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <Zap size={18} />
                      Turbo
                    </button>

                    <button
                      onClick={() => toggleAuto(10)}
                      disabled={spinning}
                      className={`h-12 px-4 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                        autoLeft > 0
                          ? "bg-[#FF0099] text-white border-[#FF0099]/40 shadow-[0_0_20px_rgba(255,0,153,0.18)]"
                          : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {autoLeft > 0 ? <Pause size={18} /> : <Play size={18} />}
                      {autoLeft > 0 ? `Auto ${autoLeft}` : "Auto x10"}
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2 flex-wrap">
                    {AUTO_CHOICES.map((n) => (
                      <button
                        key={n}
                        onClick={() => toggleAuto(n)}
                        disabled={spinning}
                        className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/75 hover:bg-white/10 disabled:opacity-40 transition"
                      >
                        Auto {n}
                      </button>
                    ))}
                  </div>

                  {/* Payline preview */}
                  <div className="mt-3 text-[11px] text-white/55">
                    Payline:{" "}
                    <span className="font-mono font-black text-white/80">
                      {payline[0]} • {payline[1]} • {payline[2]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Provably fair: si existe */}
              <div className="mt-4 rounded-[26px] border border-white/10 bg-black/25 p-4 text-xs text-white/70">
                <div className="flex items-center gap-2 font-black text-white/85">
                  <Info size={14} /> Provably Fair
                </div>
                {last?.fairHash ? (
                  <div className="mt-2 font-mono break-all text-[11px] text-white/65">
                    hash: {last.fairHash}
                    {last.fairNonce != null ? <> • nonce: {last.fairNonce}</> : null}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-white/55">Se muestra después de un giro.</div>
                )}
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="rounded-[30px] border border-white/10 bg-black/30 p-5 h-fit">
            <div className="text-sm font-black text-white/85">Panel rápido</div>

            <div className="mt-4 grid gap-2">
              <button
                onClick={() => setHaptics((v) => !v)}
                className={`h-11 rounded-2xl border text-xs font-black inline-flex items-center justify-center gap-2 transition ${
                  haptics ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                }`}
              >
                <Sparkles size={16} />
                Vibración: {haptics ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => setBet((b) => clampBet(b))}
                className="h-11 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 text-xs font-black text-white/80 transition"
              >
                Ajustar apuesta al máximo (si aplica)
              </button>
            </div>

            <div className="mt-4 rounded-[26px] border border-white/10 bg-black/30 p-4">
              <div className="text-xs font-black text-white/80">Pagos (simple)</div>
              <div className="mt-2 text-[11px] text-white/60 leading-relaxed">
                3 iguales en payline = pago según símbolo:
                <br />
                verde: x3 • jalapeño: x5 • serrano: x10 • habanero: x20
                <br />
                (El cálculo real lo hace tu backend por `multiplier`.)
              </div>
            </div>

            <div className="mt-4 rounded-[26px] border border-white/10 bg-black/30 p-4">
              <div className="text-xs font-black text-white/80">Tip mex-casino</div>
              <div className="mt-2 text-[11px] text-white/60 leading-relaxed">
                Si hoy anda “de malas”, bájale tantito a la apuesta y dale en turbo con auto… a veces cae cuando menos lo esperas 👀
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paytable Modal */}
      {showPaytable ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowPaytable(false)} />
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#0b0b0e] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black">Paytable</div>
                <div className="text-[11px] text-white/55">Pago basado en el centro (payline).</div>
              </div>
              <button
                onClick={() => setShowPaytable(false)}
                className="h-10 w-10 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {SYMBOL_KEYS.map((k) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-black/35 p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SLOT_SYMBOL_SVG[k]} alt={k} className="h-10 w-10 object-contain" />
                  <div className="text-sm">
                    <div className="font-black capitalize">{k}</div>
                    <div className="text-[11px] text-white/55">
                      {k === "verde" ? "x3" : k === "jalapeno" ? "x5" : k === "serrano" ? "x10" : "x20"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/60">
              Nota: el backend manda `multiplier` y `payout`. Esto es UI para que se entienda rápido (tipo casino real).
            </div>
          </div>
        </div>
      ) : null}

      {/* Settings Modal */}
      {showSettings ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#0b0b0e] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black">Ajustes</div>
                <div className="text-[11px] text-white/55">Rápido y sin saturar.</div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="h-10 w-10 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              <button
                onClick={() => setSound((v) => !v)}
                className={`h-12 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                  sound ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                }`}
              >
                {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                Sonido: {sound ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => setVfx((v) => !v)}
                className={`h-12 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                  vfx ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                }`}
              >
                <Sparkles size={18} />
                VFX: {vfx ? "ON" : "OFF"}
              </button>

              <button
                onClick={setTurboSafe}
                className={`h-12 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                  turbo ? "bg-[#FFD700] text-black border-[#FFD700]/40" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                }`}
              >
                <Zap size={18} />
                Turbo: {turbo ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => setHaptics((v) => !v)}
                className={`h-12 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                  haptics ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                }`}
              >
                <Sparkles size={18} />
                Vibración: {haptics ? "ON" : "OFF"}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/60">
              Sonidos ya se generan por código (WebAudio). Si luego quieres MP3 estilo Pragmatic, lo montamos encima sin tocar tu API.
            </div>
          </div>
        </div>
      ) : null}

      {/* Animations */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-slotJitter,
          .animate-reelShine,
          .animate-confetti,
          .animate-sparks,
          .animate-stopPop {
            animation: none !important;
          }
        }

        @keyframes slotJitter {
          0% {
            transform: translateY(0) scale(1);
          }
          25% {
            transform: translateY(-2px) scale(1.01);
          }
          50% {
            transform: translateY(1px) scale(0.99);
          }
          75% {
            transform: translateY(-1px) scale(1.005);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
        .animate-slotJitter {
          animation: slotJitter 220ms linear infinite;
        }

        @keyframes stopPop {
          0% {
            transform: scale(0.98);
          }
          60% {
            transform: scale(1.03);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-stopPop {
          animation: stopPop 180ms ease-out;
        }

        @keyframes reelShine {
          0% {
            transform: translateX(-140%) rotate(12deg);
            opacity: 0;
          }
          10% {
            opacity: 0.15;
          }
          45% {
            opacity: 0.1;
          }
          100% {
            transform: translateX(140%) rotate(12deg);
            opacity: 0;
          }
        }
        .animate-reelShine {
          background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.16) 50%, transparent 65%);
          animation: reelShine 700ms ease-in-out infinite;
        }

        @keyframes confetti {
          0% {
            background-position: 0 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            background-position: 0 900px;
            opacity: 0;
          }
        }
        .animate-confetti {
          background-image: radial-gradient(circle, rgba(255, 0, 153, 0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(0, 240, 255, 0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(255, 215, 0, 0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(50, 205, 50, 0.9) 0 2px, transparent 3px);
          background-size: 140px 140px;
          animation: confetti 900ms linear infinite;
        }

        @keyframes sparks {
          0% {
            opacity: 0;
            transform: scale(0.98);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.02);
          }
        }
        .animate-sparks {
          background: radial-gradient(circle at 30% 40%, rgba(0, 240, 255, 0.25), transparent 55%),
            radial-gradient(circle at 70% 50%, rgba(255, 0, 153, 0.22), transparent 55%),
            radial-gradient(circle at 50% 70%, rgba(50, 205, 50, 0.18), transparent 55%);
          animation: sparks 520ms ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}