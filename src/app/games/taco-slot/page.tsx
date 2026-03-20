"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Info, Volume2, VolumeX, ShieldAlert, Ban, ChevronUp, ChevronDown, Zap } from "lucide-react";

/* ─── Símbolos estilo Pragmatic ─── */
const SYMBOLS: Record<string, { emoji: string; label: string; color: string; glow: string }> = {
  verde:    { emoji: "🌮", label: "Taco",    color: "#32CD32", glow: "rgba(50,205,50,0.5)"   },
  jalapeno: { emoji: "🌶️", label: "Chile",   color: "#FF5E00", glow: "rgba(255,94,0,0.5)"   },
  serrano:  { emoji: "💎", label: "Diamante",color: "#00F0FF", glow: "rgba(0,240,255,0.5)"  },
  habanero: { emoji: "🔥", label: "Fuego",   color: "#FF0099", glow: "rgba(255,0,153,0.5)"  },
  wild:     { emoji: "⭐", label: "WILD",    color: "#FFD700", glow: "rgba(255,215,0,0.7)"  },
  scatter:  { emoji: "💰", label: "SCATTER", color: "#FFD700", glow: "rgba(255,215,0,0.7)"  },
};
const SYMBOL_KEYS = Object.keys(SYMBOLS);

/* Paytable visual */
const PAYTABLE = [
  { sym: "⭐", label: "WILD x3", mult: "x25", color: "#FFD700" },
  { sym: "💰", label: "SCATTER x3", mult: "x20", color: "#FFD700" },
  { sym: "🔥", label: "Fuego x3", mult: "x20", color: "#FF0099" },
  { sym: "💎", label: "Diamante x3", mult: "x10", color: "#00F0FF" },
  { sym: "🌶️", label: "Chile x3", mult: "x5", color: "#FF5E00"  },
  { sym: "🌮", label: "Taco x3", mult: "x3", color: "#32CD32"  },
  { sym: "Any",  label: "Par mixto", mult: "x0.82",color: "#aaa" },
];

const BET_PRESETS = [0.10, 0.50, 1, 5, 10, 50];

type PromoLimit =
  | { ok: true; hasRollover: false }
  | { ok: true; hasRollover: true; maxBet: number; required: number; progress: number; pct: number }
  | { ok: false; error: string };

type ResponsibleStatus =
  | { ok: true; excluded: boolean; until: string | null; reason: string | null }
  | { ok: false; error: string };

export default function TacoSlotPro() {
  const { balance, bonusBalance, refresh, formatted, formattedBonus } = useWalletBalance();
  const { toast } = useToast();

  const available = (balance || 0) + (bonusBalance || 0);

  const [bet, setBet] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(["verde", "jalapeno", "serrano"]);
  const [winData, setWinData] = useState<{ amount: number; multiplier: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPaytable, setShowPaytable] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [bigWin, setBigWin] = useState(false);

  const [promo, setPromo] = useState<PromoLimit>({ ok: true, hasRollover: false });
  const [resp, setResp] = useState<ResponsibleStatus>({ ok: true, excluded: false, until: null, reason: null });

  const animRef = useRef<NodeJS.Timeout | null>(null);

  const clampBet = (v: number) => {
    let n = Number(v);
    if (!Number.isFinite(n) || n <= 0) n = 1;
    if (promo.ok && promo.hasRollover) n = Math.min(n, promo.maxBet);
    return Math.max(0.10, Math.round(n * 100) / 100);
  };

  const randomSymbol = () => SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];

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
    } catch { /* ignore */ }
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

  const handleSpin = async () => {
    if (spinning) return;

    if (resp.ok && resp.excluded) {
      toast({ title: "Autoexclusión activa", description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes jugar por ahora.", variant: "destructive" });
      return;
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      toast({ title: "Saldo insuficiente ¡Deposita!", description: "Tu disponible incluye bono si aplica.", variant: "destructive" });
      return;
    }

    setSpinning(true);
    setWinData(null);
    setBigWin(false);

    /* Animación de giro */
    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      setReels([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, 80);

    try {
      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bet: safeBet }),
      });

      const data = await res.json().catch(() => ({}));
      clearInterval(animRef.current!);

      if (!res.ok || !data.ok) {
        if (data?.error === "PROMO_MAX_BET") {
          setBet(clampBet(Number(data.maxBet || safeBet)));
          throw new Error(data?.message || "Apuesta excede el máximo por bono.");
        }
        if (data?.error === "SELF_EXCLUDED") {
          await loadGates();
          throw new Error(data?.message || "Autoexclusión activa.");
        }
        throw new Error(data?.error || "Error al girar");
      }

      const resultReels = data.reels?.map((r: any) => r.key) ?? [randomSymbol(), randomSymbol(), randomSymbol()];
      setReels(resultReels);
      setSpinCount((c) => c + 1);

      if (data.payout > 0) {
        setWinData({ amount: data.payout, multiplier: data.multiplier });
        const isBig = data.multiplier >= 10;
        setBigWin(isBig);
        toast({
          title: isBig ? "💥 ¡CHINGÓN! ¡BIG WIN!" : "¡Ganaste!",
          description: `x${data.multiplier} — +$${Number(data.payout).toFixed(2)} MXN`,
        });
      }

      refresh();
      void loadGates();
    } catch (e: any) {
      clearInterval(animRef.current!);
      toast({ title: "Error", description: e?.message || "No se pudo girar.", variant: "destructive" });
    } finally {
      setSpinning(false);
    }
  };

  const isExcluded = resp.ok && resp.excluded;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full animate-fade-in px-2">
      <div className="relative bg-gradient-to-b from-[#18181c] to-[#0d0d10] border border-white/8 rounded-3xl shadow-[0_0_80px_rgba(255,0,153,0.08)] max-w-2xl w-full overflow-hidden">

        {/* Header bar */}
        <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-[#FF0099] to-[#FF5E00] shadow-[0_0_12px_#FF0099]" />
            <div>
              <h1 className="text-xl font-black italic tracking-tight text-white">
                TACO SLOT <span className="text-[#FF0099]">DELUXE</span>
              </h1>
              <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">Provably Fair • RTP 94.74%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPaytable(!showPaytable)}
              className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all font-bold uppercase tracking-wider"
            >
              Pagos
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-white/30 hover:text-white transition-colors">
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        {/* Paytable dropdown */}
        {showPaytable && (
          <div className="bg-black/60 px-6 py-4 border-b border-white/5 grid grid-cols-2 gap-2">
            {PAYTABLE.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-white/3 border border-white/5">
                <span className="text-base mr-2">{row.sym}</span>
                <span className="text-white/60 flex-1">{row.label}</span>
                <span className="font-black" style={{ color: row.color }}>{row.mult}</span>
              </div>
            ))}
          </div>
        )}

        {/* Gates */}
        {isExcluded && (
          <div className="mx-6 mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/80 flex items-start gap-2">
            <Ban className="mt-0.5 text-red-400 shrink-0" size={18} />
            <div>
              <div className="font-black">Autoexclusión activa</div>
              <div className="text-xs text-white/65">{resp.ok && resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes jugar por ahora."}</div>
            </div>
          </div>
        )}

        {promo.ok && promo.hasRollover && (
          <div className="mx-6 mt-4 rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4 text-sm text-white/80">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 text-[#FFD700] shrink-0" size={18} />
              <div className="w-full">
                <div className="font-black text-[#FFD700]">Bono activo</div>
                <div className="text-xs text-white/65">Apuesta máxima: <b className="text-white">${promo.maxBet} MXN</b></div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FF5E00] transition-all duration-700" style={{ width: `${promo.pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/45">{Math.round(promo.progress)} / {Math.round(promo.required)} MXN • {promo.pct}%</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── REELS ─── */}
        <div className="px-6 pt-6 pb-4">
          <div className="relative bg-black rounded-2xl border border-white/8 overflow-hidden p-5 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
            {/* Grid lines overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-10"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: "33.33% 100%" }} />

            {/* Winning highlight line */}
            <div className={`pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] transition-opacity duration-500 ${winData ? "opacity-100" : "opacity-0"}`}
              style={{ background: `linear-gradient(90deg, transparent, ${winData ? SYMBOLS[reels[0]]?.glow ?? "#FFD700" : "#FFD700"}, transparent)` }} />

            <div className="grid grid-cols-3 gap-4 relative z-10">
              {reels.map((sym, i) => {
                const s = SYMBOLS[sym] ?? SYMBOLS.verde;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl border flex items-center justify-center relative overflow-hidden transition-all duration-150 ${spinning ? "border-white/10 bg-[#0a0a0c]" : winData ? "border-white/20 bg-[#111115]" : "border-white/5 bg-[#0d0d10]"}`}
                    style={winData && !spinning ? { boxShadow: `0 0 30px ${s.glow}` } : undefined}
                  >
                    {/* Symbol glow bg */}
                    {!spinning && (
                      <div className="absolute inset-0 opacity-10 rounded-xl"
                        style={{ background: `radial-gradient(circle at center, ${s.color}, transparent 70%)` }} />
                    )}
                    <span
                      className={`text-5xl select-none transition-all duration-100 ${spinning ? "blur-[3px] scale-90" : "scale-100"}`}
                      style={!spinning ? { filter: `drop-shadow(0 0 12px ${s.glow})` } : undefined}
                    >
                      {s.emoji}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* BIG WIN overlay */}
            {bigWin && winData && !spinning && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                <div className="text-5xl font-black bg-gradient-to-r from-[#FFD700] to-[#FF5E00] bg-clip-text text-transparent drop-shadow-2xl animate-pulse">
                  💥 BIG WIN
                </div>
                <div className="text-3xl font-black text-white mt-2">+${winData.amount.toFixed(2)}</div>
                <div className="text-lg text-[#FFD700] font-bold">x{winData.multiplier}</div>
              </div>
            )}
          </div>

          {/* Spin counter */}
          {spinCount > 0 && (
            <div className="mt-2 text-center text-[11px] text-white/25 font-medium">
              {spinCount} giros esta sesión
            </div>
          )}
        </div>

        {/* ─── CONTROLS ─── */}
        <div className="px-6 pb-6 space-y-4">
          {/* Balance row */}
          <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-white/5">
            <div>
              <div className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Disponible</div>
              <div className="text-lg font-mono font-bold text-white">{formatted}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Bono</div>
              <div className="text-sm font-mono text-[#FFD700]">{formattedBonus}</div>
            </div>
          </div>

          {/* Bet selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Apuesta por giro</label>
              <span className="text-sm font-black text-white">${bet.toFixed(2)} MXN</span>
            </div>

            {/* Bet stepper */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBet((b) => clampBet(b - 0.10))}
                disabled={spinning || isExcluded || bet <= 0.10}
                className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-white font-black text-xl flex items-center justify-center disabled:opacity-30"
              >
                <ChevronDown size={20} />
              </button>
              <div className="flex-1 grid grid-cols-6 gap-1">
                {BET_PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setBet(clampBet(v))}
                    disabled={spinning || isExcluded || (promo.ok && promo.hasRollover && v > promo.maxBet)}
                    className={`h-11 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-30 ${bet === v ? "bg-gradient-to-b from-[#FF0099] to-[#FF5E00] text-white shadow-[0_0_16px_rgba(255,0,153,0.4)]" : "bg-white/5 border border-white/8 text-white/60 hover:bg-white/10 hover:text-white"}`}
                  >
                    ${v < 1 ? v.toFixed(2) : v}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setBet((b) => clampBet(b + 0.10))}
                disabled={spinning || isExcluded}
                className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-white font-black text-xl flex items-center justify-center disabled:opacity-30"
              >
                <ChevronUp size={20} />
              </button>
            </div>
          </div>

          {/* SPIN button */}
          <button
            onClick={handleSpin}
            disabled={spinning || isExcluded}
            className={`relative w-full h-16 rounded-2xl font-black text-xl tracking-widest uppercase overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group`}
          >
            <div className={`absolute inset-0 transition-all duration-300 ${spinning ? "bg-[#1a1a1e]" : "bg-gradient-to-r from-[#FF0099] via-[#FF5E00] to-[#FF0099] bg-[length:200%_100%] hover:bg-[length:150%_100%]"}`} />
            {!spinning && <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />}
            {!spinning && <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.08), transparent 70%)" }} />}
            <span className="relative text-white flex items-center justify-center gap-3">
              {spinning ? (
                <><Loader2 className="animate-spin" size={22} /><span>GIRANDO...</span></>
              ) : (
                <><Zap size={22} className="text-white/80" /><span>¡GIRAR!</span></>
              )}
            </span>
          </button>

          {/* Info footer */}
          <div className="flex justify-center gap-6 text-[11px] text-white/20 font-medium">
            <span className="flex items-center gap-1"><Info size={11} /> Provably Fair</span>
            <span>RTP 94.74%</span>
            <span>Min apuesta: $0.10</span>
          </div>
        </div>
      </div>
    </div>
  );
}
