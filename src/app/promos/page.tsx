"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Gift, Zap, ShieldCheck, Flame } from "lucide-react";

export default function PromosPage() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
          <Gift className="text-chido-gold" /> Promociones Activas
        </h1>
        <p className="text-zinc-400 mb-8">Recompensas diseñadas para que ganes más.</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* BONO 1 */}
          <div className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden group hover:border-chido-pink/50 transition-colors">
             <div className="h-40 bg-gradient-to-r from-chido-pink to-chido-red flex items-center justify-center">
                <Gift size={60} className="text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
             </div>
             <div className="p-6">
                <div className="text-xs font-bold text-chido-pink uppercase mb-2">Bienvenida</div>
                <h3 className="text-2xl font-black text-white mb-2">200% Primer Depósito</h3>
                <p className="text-sm text-zinc-400 mb-6">Te damos hasta $5,000 MXN extra para jugar. Rollover x35.</p>
                <button className="w-full py-3 rounded-xl border border-white/20 font-bold hover:bg-white hover:text-black transition-colors">Reclamar</button>
             </div>
          </div>

          {/* BONO 2 */}
          <div className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden group hover:border-chido-cyan/50 transition-colors">
             <div className="h-40 bg-gradient-to-r from-chido-cyan to-blue-600 flex items-center justify-center">
                <Zap size={60} className="text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
             </div>
             <div className="p-6">
                <div className="text-xs font-bold text-chido-cyan uppercase mb-2">Cashback</div>
                <h3 className="text-2xl font-black text-white mb-2">1% Rakeback Diario</h3>
                <p className="text-sm text-zinc-400 mb-6">Te devolvemos el 1% de todas tus apuestas, ganen o pierdan. Sin límites.</p>
                <button className="w-full py-3 rounded-xl border border-white/20 font-bold hover:bg-white hover:text-black transition-colors">Activar</button>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
