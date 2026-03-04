"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { sfx } from "@/lib/sfx";
import {
  History,
  Zap,
  Loader2,
  ShieldAlert,
  Ban,
  Info,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
} from "lucide-react";

type PromoLimit =
  | { ok: true; hasRollover: false }
  | { ok: true; hasRollover: true; maxBet: number; required: number; progress: number; pct: number }
  | { ok: false; error: string };

type ResponsibleStatus =
  | { ok: true; excluded: boolean; until: string | null; reason: string | null }
  | { ok: false; error: string };

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

function clamp(n: number, a: number, b: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

function money(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function vibrate(ms: number) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      // @ts-ignore
      navigator.vibrate(ms);
    }
  } catch {}
}

export default function CrashPro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { balance, bonusBalance, refresh, formatted, formattedBonus } = useWalletBalance();
  const { toast } = useToast();

  const available = (balance || 0) + (bonusBalance || 0);

  const [soundEnabled, setSoundEnabled] = useLocalSetting<boolean>("chido_sound", true);
  const [turbo, setTurbo] = useLocalSetting<boolean>("chido_crash_turbo", false);
  const [vfx, setVfx] = useLocalSetting<boolean>("chido_vfx", true);
  const [haptics, setHaptics] = useLocalSetting<boolean>("chido_haptics", true);

  const [promo, setPromo] = useState<PromoLimit>({ ok: true, hasRollover: false });
  const [resp, setResp] = useState<ResponsibleStatus>({ ok: true, excluded: false, until: null, reason: null });

  const maxBet = promo.ok && promo.hasRollover ? promo.maxBet : Infinity;

  const clampBet = (v: number) => {
    let n = Number(v);
    if (!Number.isFinite(n) || n <= 0) n = 10;
    if (promo.ok && promo.hasRollover) n = Math.min(n, promo.maxBet);
    return Math.max(1, Math.floor(n));
  };

  const [gameState, setGameState] = useState<"IDLE" | "RUNNING" | "CRASHED" | "WON">("IDLE");
  const [multiplier, setMultiplier] = useState(1.0);
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(2.0);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<{ crash: number; win: boolean }[]>([]);
  const [lastRound, setLastRound] = useState<{ hash?: string; seed?: string; edge?: number; ref?: string; ts: string } | null>(
    null
  );

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

  useEffect(() => {
    setBet((b) => clampBet(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo.ok, (promo as any).hasRollover, (promo as any).maxBet]);

  useEffect(() => {
    sfx.setEnabled(soundEnabled);
    if (!soundEnabled) sfx.stopAllLoops();
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      sfx.stopAllLoops();
    };
  }, []);

  const durations = useMemo(() => {
    return turbo ? { stepMs: 14, curve: 0.0105 } : { stepMs: 22, curve: 0.0082 };
  }, [turbo]);

  const startGame = async () => {
    sfx.setEnabled(soundEnabled);
    sfx.unlock();

    if (resp.ok && resp.excluded) {
      return toast({
        title: "Autoexclusión activa",
        description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "Ahorita no se arma.",
        variant: "destructive",
      });
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      return toast({
        title: "Saldo insuficiente",
        description: "Tu disponible incluye bono si aplica.",
        variant: "destructive",
      });
    }

    setLoading(true);
    setGameState("IDLE");
    setMultiplier(1.0);
    setLastRound(null);

    if (haptics) vibrate(turbo ? 18 : 28);
    if (soundEnabled) sfx.uiClick();

    try {
      const res = await fetch("/api/games/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: safeBet, targetMultiplier: target }),
      });

      const data = (await res.json().catch(() => ({}))) as CrashApi;

      if (!res.ok) {
        if (data?.error === "PROMO_MAX_BET") {
          setBet(clampBet(Number(data.maxBet || safeBet)));
          throw new Error(data?.message || "Apuesta excede el máximo permitido por bono.");
        }
        if (data?.error === "SELF_EXCLUDED") {
          await loadGates();
          throw new Error(data?.message || "Autoexclusión activa.");
        }
        throw new Error(data?.error || "Error al procesar apuesta");
      }

      refresh();
      setLoading(false);
      setGameState("RUNNING");

      const crashPoint = Number(data.crashMultiplier || 1);
      const userWon = Boolean(data.didCashout);
      const targetPoint = Number(data.targetMultiplier || target);

      setLastRound({
        hash: data.serverSeedHash,
        seed: data.serverSeed,
        edge: data.houseEdgeBps,
        ref: data.refId,
        ts: new Date().toISOString(),
      });

      if (soundEnabled) sfx.crashTickStart(turbo);

      let currentM = 1.0;
      const stopPoint = userWon ? targetPoint : crashPoint;

      const interval = setInterval(() => {
        currentM += currentM * durations.curve + 0.0028;

        if (currentM >= stopPoint) {
          clearInterval(interval);
          setMultiplier(stopPoint);
          sfx.stopLoop("crashTick");

          if (userWon) {
            setGameState("WON");
            if (soundEnabled) sfx.crashWin();
            if (haptics) vibrate(60);

            toast({
              title: "¡Se armó! Cobraste ✅",
              description: `${targetPoint.toFixed(2)}x (+${money(Number(data.payout || 0))} MXN)`,
            });
          } else {
            setGameState("CRASHED");
            setMultiplier(crashPoint);
            if (soundEnabled) sfx.crashBust();
            if (haptics) vibrate(45);
          }

          setHistory((prev) => [{ crash: crashPoint, win: userWon }, ...prev].slice(0, 10));
          refresh();
          void loadGates();
        } else {
          setMultiplier(currentM);
        }
      }, durations.stepMs);
    } catch (error: any) {
      sfx.stopLoop("crashTick");
      setLoading(false);
      toast({ title: "No se armó", description: error.message || "Error", variant: "destructive" });
    }
  };

  // Canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < rect.width; i += 48) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, rect.height);
      }
      for (let i = 0; i < rect.height; i += 48) {
        ctx.moveTo(0, i);
        ctx.lineTo(rect.width, i);
      }
      ctx.stroke();

      if (gameState !== "IDLE") {
        const t = Math.min(1, (multiplier - 1) / 10);
        const x = t * rect.width * 0.86;
        const y = rect.height - t * rect.height * 0.82;

        ctx.beginPath();
        ctx.moveTo(0, rect.height);
        ctx.quadraticCurveTo(x * 0.52, rect.height, x, y);

        let color = "#00F0FF";
        if (gameState === "CRASHED") color = "#FF3D00";
        if (gameState === "WON") color = "#32CD32";

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.lineTo(x, rect.height);
        ctx.lineTo(0, rect.height);
        const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
        grad.addColorStop(0, `${color}55`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [gameState, multiplier]);

  const showCap = promo.ok && promo.hasRollover;

  return (
    <div className="relative min-h-[calc(100vh-90px)] px-4 pb-24">
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-20" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(0,240,255,0.12),transparent_45%),radial-gradient(circle_at_70%_40%,rgba(255,0,153,0.14),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(50,205,50,0.10),transparent_50%)]" />
      </div>

      <div className="mx-auto max-w-7xl pt-6 animate-fade-in">
        {/* top */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <Image src="/isotipo-color.png" alt="CHIDO" fill className="object-contain" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">
                Chido Crash <span className="text-[#00F0FF]">PRO</span>
              </div>
              <div className="text-xs text-white/55">Auto-cobro real (tu backend ya opera con target).</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTurbo((v) => !v)}
              className={`h-10 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                turbo ? "bg-[#FFD700] text-black border-[#FFD700]/40" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Turbo"
            >
              <Zap size={16} />
              Turbo
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
              onClick={() => setHaptics((v) => !v)}
              className={`h-10 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                haptics ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Haptics"
            >
              <Flame size={16} />
              Vibra
            </button>

            <button
              onClick={() => {
                setSoundEnabled((v) => !v);
                sfx.unlock();
                sfx.uiClick();
              }}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 flex items-center justify-center"
              aria-label="Sonido"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        {/* layout */}
        <div className="mt-5 flex flex-col lg:flex-row gap-5">
          {/* Sidebar */}
          <div className="w-full lg:w-[360px] rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl h-fit">
            {resp.ok && resp.excluded ? (
              <div className="mb-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/80 flex items-start gap-2">
                <Ban className="mt-0.5 text-red-400" size={18} />
                <div>
                  <div className="font-black">Autoexclusión activa</div>
                  <div className="text-xs text-white/65">
                    {resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes jugar por ahora."}
                  </div>
                </div>
              </div>
            ) : null}

            {showCap ? (
              <div className="mb-4 rounded-3xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 text-[#FFD700]" size={18} />
                  <div className="w-full">
                    <div className="font-black">Bono activo (rollover)</div>
                    <div className="text-xs text-white/65">
                      Máximo por jugada: <b className="text-white">{promo.ok && promo.hasRollover ? promo.maxBet : 0} MXN</b>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#32CD32]" style={{ width: `${promo.ok && promo.hasRollover ? promo.pct : 0}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-white/45">
                      {promo.ok && promo.hasRollover
                        ? `${Math.round(promo.progress)} / ${Math.round(promo.required)} MXN • ${promo.pct}%`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Disponible</div>
              <div className="mt-1 text-lg font-black tabular-nums">
                {formatted} <span className="text-xs text-white/45">+ bono {formattedBonus}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-black text-white/55 uppercase tracking-widest">
                  Apuesta {Number.isFinite(maxBet) && maxBet !== Infinity ? `(max ${maxBet})` : ""}
                </label>
                <div className="mt-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 font-black">$</span>
                  <Input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(clampBet(Number(e.target.value)))}
                    className="bg-black/40 border-white/10 h-12 pl-8 font-mono text-white"
                    disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
                  />
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map((v) => {
                    const disabled =
                      (promo.ok && promo.hasRollover && v > promo.maxBet) || (resp.ok && resp.excluded) || gameState === "RUNNING";
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

              <div>
                <label className="text-[10px] font-black text-white/55 uppercase tracking-widest">Auto-cobro (x)</label>
                <Input
                  type="number"
                  value={target}
                  step="0.10"
                  onChange={(e) => setTarget(clamp(Number(e.target.value), 1.01, 1000))}
                  className="bg-black/40 border-white/10 h-12 font-mono text-white"
                  disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
                />
                <div className="mt-2 flex gap-2">
                  {[1.5, 2, 3, 5].map((x) => (
                    <button
                      key={x}
                      onClick={() => setTarget(x)}
                      disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
                      className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/80 hover:bg-white/10 disabled:opacity-40 transition"
                    >
                      {x}x
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={startGame}
                disabled={gameState === "RUNNING" || loading || (resp.ok && resp.excluded)}
                className={`h-14 rounded-3xl text-lg font-black uppercase tracking-widest transition-all ${
                  gameState === "RUNNING"
                    ? "bg-zinc-700 opacity-60 cursor-not-allowed"
                    : "bg-[#00F0FF] text-black hover:bg-[#00d6e6] shadow-[0_0_30px_rgba(0,240,255,0.25)] hover:scale-[1.01]"
                }`}
              >
                {loading ? <Loader2 className="animate-spin" /> : gameState === "RUNNING" ? "EN JUEGO..." : "APOSTAR"}
              </Button>

              <div className="text-[11px] text-white/45 flex items-center gap-2">
                <Info size={14} /> Si hay bono activo, aplicamos cap por jugada (anti-abuso).
              </div>
            </div>

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
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs text-white/55 font-black border border-white/10">
                <History size={12} /> RECIENTES
              </div>
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-black whitespace-nowrap border ${
                    h.win ? "bg-[#32CD32]/10 text-[#32CD32] border-[#32CD32]/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {h.crash.toFixed(2)}x
                </div>
              ))}
            </div>

            <div className="relative flex-1 min-h-[420px] bg-[#0f0f11] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-20">
                <Image src="/opengraph-image.jpg" alt="Overlay" fill className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/70" />
              {vfx ? (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,240,255,0.10),transparent_45%),radial-gradient(circle_at_40%_70%,rgba(255,0,153,0.10),transparent_50%)]" />
              ) : null}

              <canvas ref={canvasRef} className="relative z-10 w-full h-full" />

              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                <div
                  className={`text-7xl sm:text-8xl lg:text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-150 ${
                    gameState === "CRASHED" ? "text-[#FF3D00]" : gameState === "WON" ? "text-[#32CD32]" : "text-white"
                  }`}
                >
                  {multiplier.toFixed(2)}x
                </div>

                {gameState === "CRASHED" ? (
                  <div className="mt-4 px-6 py-2 bg-[#FF3D00] text-black font-black text-lg uppercase tracking-widest rounded-full animate-in zoom-in">
                    CRASH
                  </div>
                ) : null}

                {gameState === "WON" ? (
                  <div className="mt-4 px-6 py-2 bg-[#32CD32] text-black font-black text-lg uppercase tracking-widest rounded-full animate-in zoom-in">
                    COBRADO ✅
                  </div>
                ) : null}

                {gameState === "RUNNING" ? (
                  <div className="mt-4 text-xs text-white/60 font-black uppercase tracking-widest">
                    Auto-cobro en {target.toFixed(2)}x
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/45">
              <div className="inline-flex items-center gap-2">
                <Flame size={14} className="text-[#FF5E00]" />
                Tip: si traes bono, juega inteligente y no te pases del cap.
              </div>
              <div className="inline-flex items-center gap-2">
                <Image src="/isotipo-bw.png" alt="CHIDO" width={18} height={18} className="opacity-70" />
                <span>CHIDO Originals</span>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @media (prefers-reduced-motion: reduce) {
            * {
              scroll-behavior: auto !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}