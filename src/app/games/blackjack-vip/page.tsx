"use client";

import Link from "next/link";
import { ChevronLeft, Crown, Sparkles } from "lucide-react";

export default function BlackjackVipPage() {
  return (
    <div className="min-h-screen px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#1a0a2e] to-black p-8 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-1 text-[11px] font-black tracking-[0.25em] uppercase text-[#FFD700] mb-6">
          <Crown size={12} /> VIP
        </div>
        <h1 className="text-5xl font-black text-white mb-4">Blackjack VIP</h1>
        <p className="text-white/65 max-w-2xl leading-relaxed mb-8">
          Mesa privada con look premium y espacio para dealer, side bets, historial de cartas y controles de UX para jugadores de alto valor.
        </p>
        <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black">
          <ChevronLeft size={16} /> Volver al lobby
        </Link>
      </div>
    </div>
  );
}