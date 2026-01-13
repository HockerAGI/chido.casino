"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Users, TrendingUp, DollarSign } from "lucide-react";

export default function AffiliatesPage() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto text-center py-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-chido-cyan/30 bg-chido-cyan/10 text-chido-cyan text-xs font-black tracking-widest uppercase mb-6">
           Socios Chido
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
          GANA HASTA EL <br/> <span className="text-chido-green">45% DE COMISIÓN</span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
          Invita amigos a Chido Casino y gana dinero por cada apuesta que hagan. De por vida.
        </p>

        <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
           <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
              <Users className="text-chido-pink mb-4" size={32} />
              <h3 className="font-bold text-white text-lg">Invita</h3>
              <p className="text-sm text-zinc-400">Comparte tu enlace único en redes.</p>
           </div>
           <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
              <TrendingUp className="text-chido-cyan mb-4" size={32} />
              <h3 className="font-bold text-white text-lg">Ellos Juegan</h3>
              <p className="text-sm text-zinc-400">Tus referidos se divierten en el casino.</p>
           </div>
           <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
              <DollarSign className="text-chido-green mb-4" size={32} />
              <h3 className="font-bold text-white text-lg">Tú Cobras</h3>
              <p className="text-sm text-zinc-400">Recibe pagos semanales automáticos.</p>
           </div>
        </div>

        <button className="px-10 py-4 rounded-full bg-white text-black font-black text-xl hover:scale-105 transition-transform">
          CONVERTIRME EN SOCIO
        </button>
      </div>
    </MainLayout>
  );
}
