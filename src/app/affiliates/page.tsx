"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { Users } from "lucide-react";

export default function AffiliatesPage() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto text-center py-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-chido-cyan/30 bg-chido-cyan/10 text-chido-cyan text-xs font-black tracking-widest uppercase mb-6">Socios Chido</div>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6">GANA HASTA EL <br/> <span className="text-chido-green">45% DE COMISIÓN</span></h1>
        <button className="px-10 py-4 rounded-full bg-white text-black font-black text-xl hover:scale-105 transition-transform">CONVERTIRME EN SOCIO</button>
      </div>
    </MainLayout>
  );
}
