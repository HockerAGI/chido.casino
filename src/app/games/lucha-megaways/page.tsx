"use client";

import Link from "next/link";
import { ChevronLeft, Star, Info, Sparkles } from "lucide-react";

export default function LuchaMegawaysPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-8xl mb-6">🥊</div>
      <div className="inline-flex items-center gap-2 rounded-full bg-[#32CD32]/10 border border-[#32CD32]/20 px-3 py-1 text-[11px] font-black tracking-widest text-[#32CD32] mb-6">
        <Sparkles size={12} /> NUEVO
      </div>
      <h1 className="text-4xl font-black text-white mb-3">Lucha Libre Megaways</h1>
      <p className="text-white/60 max-w-md mb-6 leading-relaxed">
        Los enmascarados más chidos de México en un slot Megaways brutal. Wilds que vuelan, free spins épicos y hasta <b className="text-[#FFD700]">8,500x</b>. ¡Órale!
      </p>

      <div className="flex gap-4 justify-center mb-8">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">RTP</div>
          <div className="text-lg font-black text-white">96.2%</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Max Win</div>
          <div className="text-lg font-black text-[#FFD700]">8,500x</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Tipo</div>
          <div className="text-lg font-black text-[#00F0FF]">Megaways</div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 max-w-sm w-full mb-8">
        <p className="text-sm text-white/40 leading-relaxed">
          ¡Pronto disponible! El luchador chido está entrenando para soltar sus mejores movimientos en forma de multiplicadores locos.
        </p>
      </div>

      <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-105 transition">
        <ChevronLeft size={16} /> Ver otros juegos
      </Link>
    </div>
  );
}
