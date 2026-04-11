"use client";

import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";

export default function BaccaratProPage() {
  return (
    <div className="min-h-screen px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-black/50 p-8 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-3 py-1 text-[11px] font-black tracking-[0.25em] uppercase text-[#00F0FF] mb-6">
          <Sparkles size={12} /> Live Table
        </div>
        <h1 className="text-5xl font-black text-white mb-4">Baccarat Pro</h1>
        <p className="text-white/65 max-w-2xl leading-relaxed mb-8">
          Baccarat de alto nivel con interfaz sobria, grandes apuestas y un layout preparado para integrar dealers, roadmaps y estadísticas.
        </p>
        <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black">
          <ChevronLeft size={16} /> Volver al lobby
        </Link>
      </div>
    </div>
  );
}