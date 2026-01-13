"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { Gift, Zap } from "lucide-react";

export default function PromosPage() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <h1 className="text-4xl font-black text-white mb-8 flex items-center gap-3"><Gift className="text-chido-gold" /> Promociones Activas</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden">
             <div className="h-40 bg-gradient-to-r from-chido-pink to-chido-red flex items-center justify-center"><Gift size={60} className="text-white" /></div>
             <div className="p-6">
                <h3 className="text-2xl font-black text-white mb-2">200% Primer Depósito</h3>
                <p className="text-sm text-zinc-400 mb-6">Te damos hasta $5,000 MXN extra para jugar.</p>
                <button className="w-full py-3 rounded-xl border border-white/20 font-bold hover:bg-white hover:text-black transition-colors">Reclamar</button>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
