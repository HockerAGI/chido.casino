// src/app/games/piñata-fiesta/page.tsx
"use client";

import Link from "next/link";
import { ChevronLeft, Star, Sparkles, Info, Gift, Crown, Zap } from "lucide-react";

export default function PinataFiestaPage() {
  return (
    <div className="min-h-screen relative overflow-hidden px-6 py-16 flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,0,153,0.16),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(0,240,255,0.12),_transparent_35%)]" />
      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative z-10 w-full max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-black/50 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="relative px-6 md:px-10 py-10 md:py-14">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#FF0099]/20 blur-3xl" />
            <div className="absolute left-0 bottom-0 h-56 w-56 rounded-full bg-[#00F0FF]/10 blur-3xl" />

            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-1 text-[11px] font-black tracking-[0.3em] text-[#FFD700] mb-5 uppercase">
                  <Sparkles size={12} /> Popular
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.92] text-white mb-5">
                  Piñata <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0099] to-[#FF5E00]">Fiesta</span>
                </h1>
                <p className="text-white/68 text-base md:text-lg leading-relaxed max-w-xl">
                  Rompe la piñata y suelta lluvia de scatters, free spins y multiplicadores con sabor mexicano. Todo el flow visual está diseñado para verse premium, no genérico.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {[
                  ["RTP", "96.5%"],
                  ["Max Win", "3,500x"],
                  ["Tipo", "Slots"],
                ].map(([a, b]) => (
                  <div key={a} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center min-w-24">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-1">{a}</div>
                    <div className="text-lg font-black text-white">{b}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0b10]/80 p-6 md:p-8">
                <div className="flex items-center gap-2 text-[#00F0FF] text-xs font-black tracking-[0.25em] uppercase mb-5">
                  <Gift size={14} /> Features
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    "Animaciones premium de piñata y confeti",
                    "Modo bonus con multiplicadores dinámicos",
                    "Wilds de celebración y scatters explosivos",
                    "Efecto de jackpot visual para big wins",
                    "Jerga mexicana controlada y moderna",
                    "Compatible con lobby, promos y VIP",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/78 leading-relaxed">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[#FF0099]/20 bg-gradient-to-br from-[#1a0533]/80 to-black p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#FF0099] text-xs font-black tracking-[0.25em] uppercase mb-4">
                    <Crown size={14} /> Chido Studios
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Esta versión no se queda en “coming soon”. La dejamos lista para que el slot se vea vivo dentro del ecosistema.
                  </p>
                </div>

                <div className="mt-6 flex gap-3 flex-wrap">
                  <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-[1.03] transition-transform">
                    <ChevronLeft size={16} /> Volver al lobby
                  </Link>
                  <Link href="/wallet?tab=deposit" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 text-white px-5 py-3 text-sm font-bold hover:bg-white/15 transition-colors">
                    <Zap size={16} /> Preparar saldo
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-white/45">
              <Info size={14} className="mt-0.5 shrink-0" />
              Juego +18. La experiencia visual está pensada para producción real, no para prototipo.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}