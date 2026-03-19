"use client";

import Link from "next/link";
import { ChevronLeft, Star, Info, Zap } from "lucide-react";

export default function CatrinaBonanzaPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-8xl mb-6">💀</div>
      <div className="inline-flex items-center gap-2 rounded-full bg-[#FF5E00]/10 border border-[#FF5E00]/20 px-3 py-1 text-[11px] font-black tracking-widest text-[#FF5E00] mb-6">
        <Zap size={12} /> HOT
      </div>
      <h1 className="text-4xl font-black text-white mb-3">Catrina Bonanza</h1>
      <p className="text-white/60 max-w-md mb-6 leading-relaxed">
        Día de muertos, scatters que resurgen de las tumbas y bonos que te hacen gritar ¡a todo dar! Hasta <b className="text-[#FFD700]">10,000x</b> tu apuesta.
      </p>

      <div className="flex gap-4 justify-center mb-8">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">RTP</div>
          <div className="text-lg font-black text-white">96.0%</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Max Win</div>
          <div className="text-lg font-black text-[#FFD700]">10,000x</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Volatilidad</div>
          <div className="text-lg font-black text-[#FF0099]">Alta</div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 max-w-sm w-full mb-8">
        <div className="flex items-center gap-2 justify-center text-white/50 mb-3">
          <Info size={16} />
          <span className="text-sm font-bold">Integración en progreso</span>
        </div>
        <p className="text-sm text-white/40 leading-relaxed">
          La Catrina ya casi está lista para soltar todos sus bonos. ¡Pronto disponible solo en Chido Casino!
        </p>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-105 transition">
          <ChevronLeft size={16} /> Ver otros juegos
        </Link>
      </div>
    </div>
  );
}
