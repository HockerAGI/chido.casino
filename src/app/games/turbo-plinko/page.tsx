"use client";

import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";

export default function TurboPlinkoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-8xl mb-6">⚡</div>
      <div className="inline-flex items-center gap-2 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/20 px-3 py-1 text-[11px] font-black tracking-widest text-[#06B6D4] mb-6">
        <Sparkles size={12} /> NUEVO
      </div>
      <h1 className="text-4xl font-black text-white mb-3">Turbo Plinko</h1>
      <p className="text-white/60 max-w-md mb-6 leading-relaxed">
        Suelta la bolita y espera que llueva el dinero. Multiplicadores hasta <b className="text-[#FFD700]">1,000x</b>. Rápido, emocionante y totalmente provably fair. ¡Está cañón!
      </p>
      <div className="flex gap-4 justify-center mb-8">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">RTP</div>
          <div className="text-lg font-black text-white">97%</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Max Win</div>
          <div className="text-lg font-black text-[#FFD700]">1,000x</div>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <div className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Tipo</div>
          <div className="text-lg font-black text-[#06B6D4]">Arcade</div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 max-w-sm w-full mb-8">
        <p className="text-sm text-white/40 leading-relaxed">¡Próximamente! Turbo Plinko llegará con modo demo gratuito para que pruebes la estrategia.</p>
      </div>
      <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-105 transition">
        <ChevronLeft size={16} /> Ver otros juegos
      </Link>
    </div>
  );
}
