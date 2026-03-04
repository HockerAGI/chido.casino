"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Info, Volume2, VolumeX, ShieldAlert, Ban } from "lucide-react";

const SYMBOLS: Record<string, string> = {
  verde: "/badge-verde.png",
  jalapeno: "/badge-jalapeno.png",
  serrano: "/badge-serrano.png",
  habanero: "/badge-habanero.png",
};

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

  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(["verde", "verde", "verde"]);
  const [winData, setWinData] = useState<{ amount: number; multiplier: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [promo, setPromo] = useState<PromoLimit>({ ok: true, hasRollover: false });
  const [resp, setResp] = useState<ResponsibleStatus>({ ok: true, excluded: false, until: null, reason: null });

  const clampBet = (v: number) => {
    let n = Number(v);
    if (!Number.isFinite(n) || n <= 0) n = 10;
    if (promo.ok && promo.hasRollover) n = Math.min(n, promo.maxBet);
    return Math.max(1, Math.floor(n));
  };

  const randomSymbol = () => {
    const keys = Object.keys(SYMBOLS);
    return keys[Math.floor(Math.random() * keys.length)];
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

  const handleSpin = async () => {
    if (spinning) return;

    if (resp.ok && resp.excluded) {
      toast({
        title: "Autoexclusión activa",
        description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "No puedes jugar por ahora.",
        variant: "destructive",
      });
      return;
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      toast({ title: "Saldo insuficiente", description: "Tu disponible incluye bono si aplica.", variant: "destructive" });
      return;
    }

    setSpinning(true);
    setWinData(null);

    const interval = setInterval(() => {
      setReels([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, 100);

    try {
      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bet: safeBet }),
      });

      const data = await res.json().catch(() => ({}));
      clearInterval(interval);

      if (!res.ok || !data.ok) {
        if (data?.error === "PROMO_MAX_BET") {
          setBet(clampBet(Number(data.maxBet || safeBet)));
          throw new Error(data?.message || "Apuesta excede el máximo permitido por bono.");
        }
        if (data?.error === "SELF_EXCLUDED") {
          await loadGates();
          throw new Error(data?.message || "Autoexclusión activa.");
        }
        throw new Error(data?.error || "Error al girar");
      }

      setReels(data.reels.map((r: any) => r.key));
      if (data.payout > 0) {
        setWinData({ amount: data.payout, multiplier: data.multiplier });
        toast({ title: "¡Ganaste!", description: `x${data.multiplier} (+${Number(data.payout).toFixed(2)} MXN)` });
      }

      refresh();
      void loadGates();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo girar.", variant: "destructive" });
    } finally {
      clearInterval(interval);
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full animate-fade-in">
      <div className="relative bg-[#1A1A1D] border border-white/10 rounded-3xl p-8 shadow-2xl max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF0099] w-2 h-8 rounded-full shadow-[0_0_15px_#FF0099]" />
            <h1 className="text-2xl font-black italic tracking-tighter text-white">
              TACO SLOT <span className="text-[#00F0FF]">DELUXE</span>
            </h1>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-zinc-500 hover:text-white transition-colors">
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </button>
        </div>

        {/* Gates UI */}
        {resp.ok && resp.excluded ? (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/80 flex items-start gap-2">
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
          <div className="mb-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
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

        {/* Reels */}
        <div className="relative bg-black rounded-xl border-4 border-[#2A2A2E] overflow-hidden p-4 shadow-inner">
          <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] opacity-20 bg-cover mix-blend-overlay" />

          <div className="grid grid-cols-3 gap-4 relative z-10">
            {reels.map((symbol, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-[#121214] rounded-lg border border-white/5 flex items-center justify-center overflow-hidden relative shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none z-20" />
                <div className={`w-3/4 h-3/4 relative ${spinning ? "animate-slot-spin blur-sm" : ""}`}>
                  <Image src={SYMBOLS[symbol]} alt={symbol} fill className="object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
                </div>
              </div>
            ))}
          </div>

          {winData && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
              <div className="text-center animate-win">
                <div className="text-6xl font-black text-[#00F0FF] drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                  x{winData.multiplier}
                </div>
                <div className="text-3xl font-bold text-white mt-2">¡GANASTE ${winData.amount}!</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#121214] p-4 rounded-2xl border border-white/5">
          <div className="text-center md:text-left">
            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Disponible</div>
            <div className="text-xl font-mono text-white">
              {formatted} <span className="text-xs text-white/40">+ bono {formattedBonus}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 bg-black/30 p-2 rounded-xl border border-white/5">
            <button
              onClick={() => setBet(clampBet(Math.max(10, bet - 10)))}
              className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
              disabled={spinning || (resp.ok && resp.excluded)}
            >
              -
            </button>
            <div className="w-24 text-center">
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Apuesta</div>
              <div className="text-lg font-bold text-white">${bet}</div>
            </div>
            <button
              onClick={() => setBet(clampBet(bet + 10))}
              className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
              disabled={spinning || (resp.ok && resp.excluded)}
            >
              +
            </button>
          </div>

          <div>
            <Button
              onClick={handleSpin}
              disabled={spinning || (resp.ok && resp.excluded)}
              className={`w-full h-16 text-xl font-black uppercase tracking-widest rounded-xl transition-all
                ${spinning ? "bg-zinc-700 cursor-not-allowed" : "bg-gradient-to-b from-[#00F0FF] to-[#0099FF] hover:scale-[1.02] shadow-[0_0_20px_rgba(0,240,255,0.3)] text-black border-none"}
              `}
            >
              {spinning ? <Loader2 className="animate-spin" /> : "GIRAR"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row justify-center gap-6 text-xs text-zinc-600 font-medium">
          <span className="flex items-center gap-1">
            <Info size={12} /> Provably Fair
          </span>
          <span>Paytable: x3 verde=3 • jalapeño=5 • serrano=10 • habanero=20 • par=0.82</span>
          <span>RTP esperado: 94.74%</span>
        </div>
      </div>
    </div>
  );
}