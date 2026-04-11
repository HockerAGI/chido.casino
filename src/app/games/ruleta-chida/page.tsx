"use client";

import Link from "next/link";
import { ChevronLeft, Radio, ShieldCheck, Sparkles } from "lucide-react";

export default function RuletaChidaPage() {
  return (
    <div className="min-h-screen px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-black/50 p-8 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black tracking-[0.25em] uppercase text-white/60 mb-6">
          <Radio size={12} /> Live Casino
        </div>
        <h1 className="text-5xl font-black text-white mb-4">Ruleta Chida</h1>
        <p className="text-white/65 max-w-2xl leading-relaxed mb-8">
          Mesa en vivo con dirección visual premium, telemetry light, y un layout listo para integrar dealer, historial, bets y feed de resultados.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            ["Modo", "En Vivo"],
            ["Mesa", "HD"],
            ["Estado", "Coming Soon"],
          ].map(([a, b]) => (
            <div key={a} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-1">{a}</div>
              <div className="text-lg font-black text-white">{b}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black">
            <ChevronLeft size={16} /> Volver al lobby
          </Link>
          <Link href="/support" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-sm font-bold text-white">
            <ShieldCheck size={16} /> Validar integración
          </Link>
        </div>
      </div>
    </div>
  );
}