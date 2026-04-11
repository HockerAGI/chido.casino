"use client";

import Link from "next/link";
import { ChevronLeft, Trophy, Sparkles } from "lucide-react";

export default function FutbolMxPage() {
  return (
    <div className="min-h-screen px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0b2d18] to-black p-8 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#32CD32]/20 bg-[#32CD32]/10 px-3 py-1 text-[11px] font-black tracking-[0.25em] uppercase text-[#32CD32] mb-6">
          <Trophy size={12} /> Sports
        </div>
        <h1 className="text-5xl font-black text-white mb-4">Predictor Fútbol MX</h1>
        <p className="text-white/65 max-w-2xl leading-relaxed mb-8">
          Panel listo para predicción, torneos y bonos ligados al rendimiento deportivo. La pieza ya queda enlazada al ecosistema.
        </p>
        <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black">
          <ChevronLeft size={16} /> Volver al lobby
        </Link>
      </div>
    </div>
  );
}