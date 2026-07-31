"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Gift, CheckCircle2, X, Loader2, LockKeyhole } from "lucide-react";
import { safeJson } from "@/lib/safeJson";
import { triggerWalletRefresh } from "@/lib/wallet-refresh";

const DAY_REWARDS = [
  { day: 1, reward: "$5", label: "5 MXN de bono" },
  { day: 2, reward: "$10", label: "10 MXN de bono" },
  { day: 3, reward: "$15", label: "15 MXN de bono" },
  { day: 4, reward: "$25", label: "25 MXN de bono" },
  { day: 5, reward: "$50", label: "50 MXN de bono" },
  { day: 6, reward: "2x", label: "100 MXN de bono" },
  { day: 7, reward: "🎰", label: "10 rondas gratis" },
];

type StreakResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  claimed_today?: boolean;
  current_streak?: number;
  next_day?: number;
  can_claim?: boolean;
  awarded?: number;
  free_rounds?: number;
  reward_kind?: string;
  streak?: number;
  wagering_required?: number;
  wagering_progress?: number;
};

export function DailyStreakBar() {
  const [streak, setStreak] = useState(0);
  const [nextDay, setNextDay] = useState(1);
  const [claimed, setClaimed] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [wagerRequired, setWagerRequired] = useState(0);
  const [wagerProgress, setWagerProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await fetch("/api/promos/claim-daily-streak", { cache: "no-store" });
      const data = await safeJson<StreakResponse>(response);
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "No se pudo cargar la racha.");
      setStreak(Math.max(0, Math.min(7, Number(data.current_streak || 0))));
      setNextDay(Math.max(1, Math.min(7, Number(data.next_day || 1))));
      setClaimed(Boolean(data.claimed_today));
      setCanClaim(Boolean(data.can_claim));
      setWagerRequired(Number(data.wagering_required || 0));
      setWagerProgress(Number(data.wagering_progress || 0));
    } catch (error) {
      setCanClaim(false);
      setFeedback(error instanceof Error ? error.message : "No se pudo cargar la racha.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    try {
      const today = new Date().toDateString();
      setDismissed(localStorage.getItem("chido_streak_dismissed") === today);
    } catch {
      // Storage is optional.
    }
  }, []);

  const todayReward = useMemo(
    () => DAY_REWARDS[Math.max(0, Math.min(6, nextDay - 1))],
    [nextDay]
  );

  const claim = async () => {
    setClaiming(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/promos/claim-daily-streak", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const data = await safeJson<StreakResponse>(response);
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "No se pudo reclamar la racha.");

      setShowModal(false);
      setFeedback(data.message || "Recompensa acreditada.");
      triggerWalletRefresh();
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo reclamar la racha.");
    } finally {
      setClaiming(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("chido_streak_dismissed", new Date().toDateString());
    } catch {
      // Storage is optional.
    }
  };

  if (dismissed) return null;

  const rolloverActive = wagerRequired > wagerProgress;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-[#FF5E00]/20 bg-gradient-to-r from-[#1a0a00] via-[#120800] to-black/70 p-4">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(255,94,0,0.15), transparent 60%)" }} />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5E00] to-[#FF0099] shadow-[0_0_20px_rgba(255,94,0,0.4)]">
              <Flame size={24} className="text-white" />
            </div>
            <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#FF5E00] bg-black text-[10px] font-black text-[#FF5E00]">
              {streak}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-black text-white">Racha diaria</span>
              <span className="rounded-full border border-[#FF5E00]/20 bg-[#FF5E00]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF5E00]">Ciclo 7 días</span>
            </div>
            <div className="flex gap-1">
              {DAY_REWARDS.map((day) => {
                const done = streak > 0 && day.day <= streak && !claimed ? day.day < nextDay : day.day <= streak;
                const isToday = day.day === nextDay && !claimed;
                return (
                  <div key={day.day} className={`flex-1 rounded-lg border py-1 text-center ${done ? "border-[#FF5E00]/40 bg-[#FF5E00]/30" : isToday ? "border-[#FFD700]/40 bg-[#FFD700]/15" : "border-white/5 bg-white/5"}`}>
                    <div className="text-[9px] font-black leading-none">
                      {done ? <CheckCircle2 size={9} className="mx-auto text-[#FF5E00]" /> : isToday ? <span className="text-[#FFD700]">HOY</span> : <span className="text-white/20">{day.day}</span>}
                    </div>
                    <div className={`mt-0.5 text-[8px] font-bold leading-none ${done ? "text-[#FF5E00]" : isToday ? "text-[#FFD700]" : "text-white/20"}`}>{day.reward}</div>
                  </div>
                );
              })}
            </div>
            {rolloverActive ? (
              <div className="mt-2 text-[10px] text-[#FFD700]">Rollover: {Math.min(100, Math.round((wagerProgress / wagerRequired) * 100))}% · {wagerProgress.toFixed(0)} / {wagerRequired.toFixed(0)} MXN</div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {loading ? (
              <Loader2 className="animate-spin text-white/50" size={18} />
            ) : claimed ? (
              <div className="flex items-center gap-1 text-xs font-black text-[#32CD32]"><CheckCircle2 size={13} /> Reclamado</div>
            ) : canClaim ? (
              <button onClick={() => setShowModal(true)} className="whitespace-nowrap rounded-xl bg-gradient-to-r from-[#FF5E00] to-[#FF0099] px-4 py-2 text-xs font-black text-white shadow-[0_0_16px_rgba(255,94,0,0.4)] transition hover:scale-105">
                <Gift size={13} className="mr-1 inline" /> Reclamar
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs font-black text-white/40"><LockKeyhole size={13} /> Bloqueado</div>
            )}
            <button onClick={dismiss} className="text-[10px] text-white/20 transition hover:text-white/50">cerrar</button>
          </div>
        </div>
        {feedback ? <div className="relative mt-3 text-[11px] text-white/60">{feedback}</div> : null}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a0a00] to-[#0d0810] p-7 text-center shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-white/30 transition hover:text-white"><X size={18} /></button>
            <div className="mb-4 text-6xl">{todayReward.reward}</div>
            <div className="mb-1 text-2xl font-black text-white">Día {nextDay} de 7</div>
            <div className="mb-6 text-sm text-white/50">Recompensa: <span className="font-black text-[#FFD700]">{todayReward.label}</span></div>
            <button onClick={claim} disabled={claiming} className="w-full rounded-2xl bg-gradient-to-r from-[#FF5E00] to-[#FF0099] py-4 text-base font-black uppercase tracking-wider text-white disabled:opacity-60">
              {claiming ? <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Procesando…</span> : `Reclamar ${todayReward.label}`}
            </button>
            <p className="mt-3 text-xs text-white/25">Bonos en MXN con rollover x10. El día 7 entrega rondas gratis.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
