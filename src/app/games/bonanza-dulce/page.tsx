"use client";

import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";

export default function BonanzaDulcePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-8xl mb-6">🍬</div>
      <div className="inline-flex items-center gap-2 rounded-full bg-[#EC4899]/10 border border-[#EC4899]/20 px-3 py-1 text-[11px] font-black tracking-widest text-[#EC4899] mb-6">
        POPULAR
      </div>
      <h1 className="text-4xl font-black text-white mb-3">Bonanza Dulce</h1>
      <p className="text-white/60 max-w-md mb-6 leading-relaxed">
        Cluster pays con multiplicadores que se ponen locos. Pura dulzura explosiva hasta <b className="text-[#FFD700]">21,100x</b>. ¿Ya te comiste uno? ¡No hay falla!
      </p>
      <div className="flex gap-4 justify-center mb-8">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">RTP</div>
          <div className="text-lg font-black text-white">96.5%</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Max Win</div>
          <div className="text-lg font-black text-[#FFD700]">21,100x</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Tipo</div>
          <div className="text-lg font-black text-[#EC4899]">Cluster</div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 max-w-sm w-full mb-8">
        <p className="text-sm text-white/40 leading-relaxed">Próximamente disponible. ¡La dulce espera va a valer la pena!</p>
      </div>
      <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-105 transition">
        <ChevronLeft size={16} /> Ver otros juegos
      </Link>
    </div>
  );
}
