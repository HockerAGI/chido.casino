"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { History, Zap, Loader2, ShieldAlert, Ban, Info } from "lucide-react";

type PromoLimit =
  | { ok: true; hasRollover: false }
  | { ok: true; hasRollover: true; maxBet: number; required: number; progress: number; pct: number }
  | { ok: false; error: string };

type ResponsibleStatus =
  | { ok: true; excluded: boolean; until: string | null; reason: string | null }
  | { ok: false; error: string };

export default function CrashPro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    // si hay cap, clamp inmediato
    setBet((b) => clampBet(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo.ok, (promo as any).hasRollover, (promo as any).maxBet]);

  const startGame = async () => {
    if (resp.ok && resp.excluded) {
      return toast({
        title: "Autoexclusión activa",
        description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes jugar por ahora.",
        variant: "destructive",
      });
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      return toast({ title: "Saldo insuficiente", description: "Tu disponible incluye bono si aplica.", variant: "destructive" });
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
        // Errores “bonitos”
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
            toast({ title: "¡GANASTE!", description: `Cobraste a ${targetPoint.toFixed(2)}x (+${Number(data.payout).toFixed(2)} MXN)` });
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

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.strokeStyle = "#ffffff05";
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

      requestAnimationFrame(draw);
    };
    draw();
  }, [gameState, multiplier]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] p-4 max-w-7xl mx-auto animate-fade-in">
      {/* Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-4 bg-[#1A1A1D] p-6 rounded-3xl border border-white/5 h-fit shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="text-[#00F0FF]" />
          <h2 className="font-bold text-white">Configuración</h2>
        </div>

        {/* Gates UI */}
        {resp.ok && resp.excluded ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/80 flex items-start gap-2">
            <Ban className="mt-0.5 text-red-400" size={18} />
            <div>
              <div className="font-black">Autoexclusión activa</div>
              <div className="text-xs text-white/65">
                {resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes jugar por ahora."}
              </div>
            </div>
          </div>
        ) : null}

        {promo.ok && promo.hasRollover ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 text-[#FFD700]" size={18} />
              <div className="w-full">
                <div className="font-black">Bono activo (rollover)</div>
                <div className="text-xs text-white/65">
                  Apuesta máxima por jugada: <b className="text-white">{promo.maxBet} MXN</b>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#32CD32]" style={{ width: `${promo.pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/45">
                  {Math.round(promo.progress)} / {Math.round(promo.required)} MXN • {promo.pct}%
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="p-3 bg-black/40 rounded-xl mb-2 border border-white/5">
          <div className="text-xs text-zinc-500 uppercase">Disponible</div>
          <div className="text-lg font-mono text-white">{formatted} <span className="text-xs text-white/40">+ bono {formattedBonus}</span></div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase">
            Apuesta {Number.isFinite(maxBet) && maxBet !== Infinity ? `(max ${maxBet})` : ""}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <Input
              type="number"
              value={bet}
              step="0.10"
              min="0.10"
              onChange={(e) => setBet(clampBet(Number(e.target.value)))}
              className="bg-black border-white/10 h-12 pl-8 font-mono text-white focus:ring-[#00F0FF]"
              disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0.10, 1, 10, 50].map((v) => {
              const disabled = (promo.ok && promo.hasRollover && v > promo.maxBet) || (resp.ok && resp.excluded) || gameState === "RUNNING";
              return (
                <button
                  key={v}
                  onClick={() => setBet(clampBet(v))}
                  disabled={disabled}
                  className="bg-white/5 text-xs py-2 rounded hover:bg-white/10 transition disabled:opacity-40"
                >
                  ${v}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 mt-2">
          <label className="text-xs font-bold text-zinc-500 uppercase">Auto Retiro (x)</label>
          <Input
            type="number"
            value={target}
            step="0.10"
            onChange={(e) => setTarget(Number(e.target.value))}
            className="bg-black border-white/10 h-12 font-mono text-white focus:ring-[#00F0FF]"
            disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
          />
        </div>

        <Button
          onClick={startGame}
          disabled={gameState === "RUNNING" || loading || (resp.ok && resp.excluded)}
          className={`h-14 mt-4 text-lg font-black uppercase tracking-widest transition-all
            ${gameState === "RUNNING" ? "bg-zinc-700 opacity-50 cursor-not-allowed" : "bg-[#00F0FF] text-black hover:bg-[#00d6e6] shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:scale-[1.02]"}
          `}
        >
          {loading ? <Loader2 className="animate-spin" /> : gameState === "RUNNING" ? "EN JUEGO..." : "APOSTAR"}
        </Button>

        <div className="text-[11px] text-white/45 flex items-center gap-2">
          <Info size={14} /> Si tienes bono activo, hay límite por jugada para proteger el sistema.
        </div>
      </div>

      {/* Juego */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs text-zinc-500 font-bold border border-white/5">
            <History size={12} /> RECIENTES
          </div>
          {history.map((h, i) => (
            <div
              key={i}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap ${
                h.win
                  ? "bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {h.crash.toFixed(2)}x
            </div>
          ))}
        </div>

        <div className="relative flex-1 bg-[#0f0f11] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          <canvas ref={canvasRef} className="w-full h-full object-cover" />

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div
              className={`text-8xl lg:text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-200 
                ${gameState === "CRASHED" ? "text-[#FF3D00]" : gameState === "WON" ? "text-[#32CD32]" : "text-white"}`}
            >
              {multiplier.toFixed(2)}x
            </div>

            {gameState === "CRASHED" && (
              <div className="mt-4 px-6 py-2 bg-[#FF3D00] text-black font-black text-xl uppercase tracking-widest rounded-full animate-in zoom-in">
                CRASHED
              </div>
            )}

            {gameState === "WON" && (
              <div className="mt-4 px-6 py-2 bg-[#32CD32] text-black font-black text-xl uppercase tracking-widest rounded-full animate-in zoom-in">
                ¡COBRADO!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}