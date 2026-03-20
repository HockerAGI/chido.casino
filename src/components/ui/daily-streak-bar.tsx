"use client";

import { useState, useEffect } from "react";
import { Flame, Gift, CheckCircle2, X } from "lucide-react";

const DAY_REWARDS = [
  { day: 1, reward: "$5",   label: "5 MXN" },
  { day: 2, reward: "$10",  label: "10 MXN" },
  { day: 3, reward: "$15",  label: "15 MXN" },
  { day: 4, reward: "$25",  label: "25 MXN" },
  { day: 5, reward: "$50",  label: "50 MXN" },
  { day: 6, reward: "2x",   label: "Bono x2" },
  { day: 7, reward: "🎰",   label: "Giros gratis" },
];

export function DailyStreakBar() {
  const [streak, setStreak] = useState(3);
  const [claimed, setClaimed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("chido_streak") || "{}");
      if (saved.streak) setStreak(Math.min(7, saved.streak));
      const today = new Date().toDateString();
      if (saved.lastClaim === today) setClaimed(true);
      if (saved.dismissed === today) setDismissed(true);
    } catch { /* ignore */ }
  }, []);

  const claim = () => {
    const today = new Date().toDateString();
    const next = Math.min(7, streak + 1);
    setStreak(next);
    setClaimed(true);
    setShowModal(false);
    try {
      localStorage.setItem("chido_streak", JSON.stringify({ streak: next, lastClaim: today }));
    } catch { /* ignore */ }
  };

  const dismiss = () => {
    setDismissed(true);
    const today = new Date().toDateString();
    try {
      const saved = JSON.parse(localStorage.getItem("chido_streak") || "{}");
      localStorage.setItem("chido_streak", JSON.stringify({ ...saved, dismissed: today }));
    } catch { /* ignore */ }
  };

  if (dismissed) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-[#FF5E00]/20 bg-gradient-to-r from-[#1a0a00] via-[#120800] to-black/70 p-4">
        <div className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(255,94,0,0.15), transparent 60%)" }} />

        <div className="relative flex items-center gap-4">
          {/* Streak badge */}
          <div className="shrink-0 relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF5E00] to-[#FF0099] flex items-center justify-center shadow-[0_0_20px_rgba(255,94,0,0.4)]">
              <Flame size={24} className="text-white drop-shadow" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border-2 border-[#FF5E00] flex items-center justify-center text-[10px] font-black text-[#FF5E00]">
              {streak}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-black text-white">¡{streak} días seguidos! 🔥</span>
              <span className="text-[10px] font-bold text-[#FF5E00] bg-[#FF5E00]/10 border border-[#FF5E00]/20 rounded-full px-2 py-0.5">RACHA</span>
            </div>

            {/* Days mini bar */}
            <div className="flex gap-1">
              {DAY_REWARDS.map((d) => {
                const done = d.day <= streak;
                const isToday = d.day === streak + 1 && !claimed;
                return (
                  <div
                    key={d.day}
                    className={`flex-1 rounded-lg py-1 text-center transition-all ${
                      done ? "bg-[#FF5E00]/30 border border-[#FF5E00]/40" :
                      isToday ? "bg-[#FFD700]/15 border border-[#FFD700]/40 animate-pulse" :
                      "bg-white/5 border border-white/5"
                    }`}
                  >
                    <div className="text-[9px] font-black leading-none">
                      {done ? <CheckCircle2 size={9} className="text-[#FF5E00] mx-auto" /> :
                       isToday ? <span className="text-[#FFD700]">HOY</span> :
                       <span className="text-white/20">{d.day}</span>}
                    </div>
                    <div className={`text-[8px] font-bold mt-0.5 leading-none ${done ? "text-[#FF5E00]" : isToday ? "text-[#FFD700]" : "text-white/20"}`}>
                      {d.reward}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="shrink-0 flex flex-col gap-1.5 items-end">
            {!claimed ? (
              <button
                onClick={() => setShowModal(true)}
                className="rounded-xl bg-gradient-to-r from-[#FF5E00] to-[#FF0099] text-white px-4 py-2 text-xs font-black shadow-[0_0_16px_rgba(255,94,0,0.4)] hover:scale-105 transition-all active:scale-95 whitespace-nowrap"
              >
                <Gift size={13} className="inline mr-1" />
                Reclamar
              </button>
            ) : (
              <div className="text-xs text-[#32CD32] font-black flex items-center gap-1">
                <CheckCircle2 size={13} /> Reclamado
              </div>
            )}
            <button onClick={dismiss} className="text-[10px] text-white/20 hover:text-white/50 transition-colors">cerrar</button>
          </div>
        </div>
      </div>

      {/* Claim modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a0a00] to-[#0d0810] p-7 shadow-2xl text-center">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
              <X size={18} />
            </button>

            <div className="text-6xl mb-4 animate-bounce">{DAY_REWARDS[Math.min(streak, 6)].reward}</div>
            <div className="text-2xl font-black text-white mb-1">¡Día {streak + 1} de racha!</div>
            <div className="text-white/50 text-sm mb-6">
              Tu recompensa de hoy: <span className="font-black text-[#FFD700]">{DAY_REWARDS[Math.min(streak, 6)].label}</span> en bono
            </div>

            <button
              onClick={claim}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#FF5E00] to-[#FF0099] text-white font-black text-base uppercase tracking-wider shadow-[0_0_30px_rgba(255,94,0,0.4)] hover:scale-[1.02] transition-all active:scale-[0.98] py-4"
            >
              ¡Reclamar {DAY_REWARDS[Math.min(streak, 6)].label}! 🎉
            </button>

            <p className="mt-3 text-xs text-white/25">Bono con rollover x10 • Ver T&C</p>
          </div>
        </div>
      )}
    </>
  );
}
