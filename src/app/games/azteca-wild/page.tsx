"use client";

import Link from "next/link";
import { Lock, ChevronLeft, Zap, Star, Info } from "lucide-react";

export default function AztecaWildPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-8xl mb-6">🏛️</div>
      <div className="inline-flex items-center gap-2 rounded-full bg-[#32CD32]/10 border border-[#32CD32]/20 px-3 py-1 text-[11px] font-black tracking-widest text-[#32CD32] mb-6">
        <Zap size={12} /> NUEVO JUEGO
      </div>
      <h1 className="text-4xl font-black text-white mb-3">Azteca Wild</h1>
      <p className="text-white/60 max-w-md mb-6 leading-relaxed">
        Pirámides, wilds en cascada y hasta <b className="text-[#FFD700]">5,000x</b> de fortuna te esperan. El poder de los dioses aztecas en tus manos. ¡Que curado!
      </p>

      <div className="flex gap-4 justify-center mb-8">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">RTP</div>
          <div className="text-lg font-black text-white">96.8%</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Max Win</div>
          <div className="text-lg font-black text-[#FFD700]">5,000x</div>
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
          Este juego está en integración final con nuestros proveedores. Muy pronto disponible exclusivamente en Chido Casino. ¡No te vayas, va a estar cañón!
        </p>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-105 transition">
          <ChevronLeft size={16} /> Ver otros juegos
        </Link>
        <Link href="/wallet?tab=deposit" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 text-white px-5 py-3 text-sm font-bold hover:bg-white/15 transition">
          <Star size={16} /> Preparar saldo
        </Link>
      </div>
    </div>
  );
}
