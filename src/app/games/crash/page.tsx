"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  History,
  Zap,
  Loader2,
  ShieldAlert,
  Ban,
  Info,
  Sparkles,
  ArrowUpRight,
  Gauge,
  Activity,
  Trophy,
} from "lucide-react";

type PromoLimit =
  | { ok: true; hasRollover: false }
  | { ok: true; hasRollover: true; maxBet: number; required: number; progress: number; pct: number }
  | { ok: false; error: string };

type ResponsibleStatus =
  | { ok: true; excluded: boolean; until: string | null; reason: string | null }
  | { ok: false; error: string };

function formatMXN(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function StatChip({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: "cyan" | "green" | "amber" | "pink";
}) {
  const toneMap = {
    cyan: "border-[#00F0FF]/15 bg-[#00F0FF]/8 text-[#00F0FF]",
    green: "border-[#32CD32]/15 bg-[#32CD32]/8 text-[#32CD32]",
    amber: "border-[#FFD700]/15 bg-[#FFD700]/8 text-[#FFD700]",
    pink: "border-[#FF0099]/15 bg-[#FF0099]/8 text-[#FF0099]",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">{label}</div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

export default function CrashPro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const { balance, bonusBalance, refresh, formatted, formattedBonus } = useWalletBalance();
  const { toast } = useToast();

  const available = (balance || 0) + (bonusBalance || 0);

  const [gameState, setGameState] = useState<"IDLE" | "RUNNING" | "CRASHED" | "WON">("IDLE");
  const [multiplier, setMultiplier] = useState(1.0);
  const [bet, setBet] = useState(1);
  const [target, setTarget] = useState(2.0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ crash: number; win: boolean }[]>([]);

  const [promo, setPromo] = useState<PromoLimit>({ ok: true, hasRollover: false });
  const [resp, setResp] = useState<ResponsibleStatus>({ ok: true, excluded: false, until: null, reason: null });

  const maxBet = promo.ok && promo.hasRollover ? promo.maxBet : Infinity;

  const clampBet = (v: number) => {
    let n = Number(v);
    if (!Number.isFinite(n) || n <= 0) n = 1;
    if (promo.ok && promo.hasRollover) n = Math.min(n, promo.maxBet);
    return Math.max(0.10, Math.round(n * 100) / 100);
  };

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
    } catch {
      // ignore
    }
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

  const startGame = async () => {
    if (resp.ok && resp.excluded) {
      return toast({
        title: "Autoexclusión activa",
        description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes echar jugada por ahora, carnal.",
        variant: "destructive",
      });
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      return toast({
        title: "Saldo insuficiente",
        description: "Tu disponible incluye bono si aplica. Échale lana.",
        variant: "destructive",
      });
    }

    setLoading(true);
    setGameState("IDLE");
    setMultiplier(1.0);

    try {
      const res = await fetch("/api/games/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: safeBet, targetMultiplier: target }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.error === "PROMO_MAX_BET") {
          setBet(clampBet(Number(data.maxBet || safeBet)));
          throw new Error(data?.message || "La apuesta se pasa del máximo permitido por bono.");
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

      const crashPoint = Number(data.crashMultiplier);
      const userWon = Boolean(data.didCashout);
      const targetPoint = Number(data.targetMultiplier);

      let currentM = 1.0;

      const interval = setInterval(() => {
        currentM += currentM * 0.008 + 0.002;
        const stopPoint = userWon ? targetPoint : crashPoint;

        if (currentM >= stopPoint) {
          clearInterval(interval);
          setMultiplier(stopPoint);

          if (userWon) {
            setGameState("WON");
            toast({
              title: "¡GANASTE!",
              description: `Cobraste a ${targetPoint.toFixed(2)}x (+${Number(data.payout).toFixed(2)} MXN)`,
            });
          } else {
            setGameState("CRASHED");
            setMultiplier(crashPoint);
          }

          setHistory((prev) => [{ crash: crashPoint, win: userWon }, ...prev].slice(0, 10));
          refresh();
          void loadGates();
        } else {
          setMultiplier(currentM);
        }
      }, 20);
    } catch (error: any) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return rect;
    };

    let rect = resize();

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      const grid = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grid.addColorStop(0, "rgba(255,255,255,0.02)");
      grid.addColorStop(1, "rgba(255,255,255,0.01)");

      ctx.fillStyle = grid;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.strokeStyle = "#ffffff08";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < rect.width; i += 50) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, rect.height);
      }
      for (let i = 0; i < rect.height; i += 50) {
        ctx.moveTo(0, i);
        ctx.lineTo(rect.width, i);
      }
      ctx.stroke();

      if (gameState !== "IDLE") {
        const t = Math.min(1, (multiplier - 1) / 10);
        const x = t * rect.width * 0.8;
        const y = rect.height - t * rect.height * 0.8;

        ctx.beginPath();
        ctx.moveTo(0, rect.height);
        ctx.quadraticCurveTo(x * 0.5, rect.height, x, y);

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
        grad.addColorStop(0, color + "33");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(draw);
    };

    rafRef.current = window.requestAnimationFrame(draw);

    const onResize = () => {
      rect = resize();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [gameState, multiplier]);

  const isExcluded = resp.ok && resp.excluded;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07070b] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,240,255,0.10),transparent_25%),radial-gradient(circle_at_top_right,rgba(255,0,153,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.06),transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)", backgroundSize: "38px 38px" }} />
      <div className="relative grid gap-6 p-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/15 bg-[#00F0FF]/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#00F0FF]">
                <Sparkles size={12} /> Crash premium
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Crash Pro</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Ritmo limpio, tensión fuerte y UI lista pa' nivel provider-top.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
              <Gauge className="text-[#00F0FF]" size={22} />
            </div>
          </div>

          {isExcluded ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/80 flex items-start gap-2">
              <Ban className="mt-0.5 text-red-400" size={18} />
              <div>
                <div className="font-black">Autoexclusión activa</div>
                <div className="text-xs text-white/65">
                  {resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes echar jugada por ahora, carnal."}
                </div>
              </div>
            </div>
          ) : null}

          {promo.ok && promo.hasRollover ? (
            <div className="rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4 text-sm text-white/80">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 text-[#FFD700]" size={18} />
                <div className="w-full">
                  <div className="font-black text-[#FFD700]">Bono activo (rollover)</div>
                  <div className="text-xs text-white/65">
                    Apuesta máxima por jugada: <b className="text-white">{formatMXN(promo.maxBet)}</b>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FF5E00]" style={{ width: `${promo.pct}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-white/45">
                    {Math.round(promo.progress)} / {Math.round(promo.required)} MXN • {promo.pct}%
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <StatChip label="Disponible" value={formatted} tone="green" />
            <StatChip label="Bono" value={formattedBonus} tone="amber" />
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                Apuesta {Number.isFinite(maxBet) && maxBet !== Infinity ? `(max ${formatMXN(maxBet)})` : ""}
              </label>
              <span className="text-sm font-black text-white">{formatMXN(bet)}</span>
            </div>
            <div className="relative mt-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <Input
                type="number"
                value={bet}
                step="0.10"
                min="0.10"
                onChange={(e) => setBet(clampBet(Number(e.target.value)))}
                className="h-12 border-white/10 bg-black/60 pl-8 font-mono text-white focus:ring-[#00F0FF]"
                disabled={gameState === "RUNNING" || isExcluded}
              />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[0.10, 1, 10, 50].map((v) => {
                const disabled = (promo.ok && promo.hasRollover && v > promo.maxBet) || isExcluded || gameState === "RUNNING";
                return (
                  <button
                    key={v}
                    onClick={() => setBet(clampBet(v))}
                    disabled={disabled}
                    className="rounded-xl border border-white/8 bg-white/5 py-2 text-xs font-black text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    {formatMXN(v)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
            <label className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Auto retiro (x)</label>
            <Input
              type="number"
              value={target}
              step="0.10"
              onChange={(e) => setTarget(Number(e.target.value))}
              className="mt-3 h-12 border-white/10 bg-black/60 font-mono text-white focus:ring-[#00F0FF]"
              disabled={gameState === "RUNNING" || isExcluded}
            />
          </div>

          <Button
            onClick={startGame}
            disabled={gameState === "RUNNING" || loading || isExcluded}
            className={`h-14 w-full rounded-2xl text-lg font-black uppercase tracking-widest transition-all ${
              gameState === "RUNNING"
                ? "cursor-not-allowed bg-zinc-700/80 text-white/60"
                : "bg-gradient-to-r from-[#00F0FF] to-[#32CD32] text-black shadow-[0_0_28px_rgba(0,240,255,0.25)] hover:scale-[1.01] hover:brightness-110"
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : gameState === "RUNNING" ? "EN JUEGO..." : "¡APOSTAR!"}
          </Button>

          <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-[11px] text-white/45">
            <Info size={14} /> Si tienes bono activo, hay tope por jugada pa' cuidar el sistema.
          </div>
        </div>

        <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Activity size={16} className="text-[#00F0FF]" />
              Historial y ejecución
            </div>
            <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
              Provably fair
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs font-black text-white/45">
              <History size={12} /> Recientes
            </div>
            {history.map((h, i) => (
              <div
                key={i}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-mono font-black ${
                  h.win
                    ? "border-[#32CD32]/20 bg-[#32CD32]/10 text-[#32CD32]"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
                }`}
              >
                {h.crash.toFixed(2)}x
              </div>
            ))}
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-[1.75rem] border border-white/8 bg-[#0a0a0d] shadow-[inset_0_0_60px_rgba(0,0,0,0.85)]">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div
                className={`text-center text-7xl font-black tracking-tighter tabular-nums drop-shadow-2xl md:text-8xl ${
                  gameState === "CRASHED" ? "text-[#FF3D00]" : gameState === "WON" ? "text-[#32CD32]" : "text-white"
                }`}
              >
                {multiplier.toFixed(2)}x
              </div>

              {gameState === "CRASHED" && (
                <div className="mt-4 rounded-full bg-[#FF3D00] px-6 py-2 text-xl font-black uppercase tracking-widest text-black shadow-[0_0_28px_rgba(255,61,0,0.35)]">
                  ¡Se fue a la chin!
                </div>
              )}

              {gameState === "WON" && (
                <div className="mt-4 rounded-full bg-[#32CD32] px-6 py-2 text-xl font-black uppercase tracking-widest text-black shadow-[0_0_28px_rgba(50,205,50,0.35)]">
                  ¡Cobrado, a la bolsa!
                </div>
              )}

              {gameState === "IDLE" && (
                <div className="mt-4 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white/50">
                  Listo pa' arrancar
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 bg-black/35 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3 text-[11px] text-white/40">
                <span className="flex items-center gap-1">
                  <Trophy size={12} /> Crash dinámico
                </span>
                <span>RTP 94.74%</span>
                <span>Min apuesta: {formatMXN(0.1)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span className="font-black uppercase tracking-[0.24em]">Sistema</span>
              <span className="font-mono">Sesión viva</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Estado</div>
                <div className="mt-1 text-sm font-black text-white">{gameState}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Apuesta</div>
                <div className="mt-1 text-sm font-black text-white">{formatMXN(bet)}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Target</div>
                <div className="mt-1 text-sm font-black text-white">{target.toFixed(2)}x</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}