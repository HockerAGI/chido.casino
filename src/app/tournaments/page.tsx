"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { Trophy, Clock } from "lucide-react";

export default function TournamentsPage() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
         <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3"><Trophy className="text-chido-gold" /> Torneos Activos</h1>
         <div className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-1/3 bg-zinc-800 h-64 md:h-auto flex items-center justify-center"><Trophy size={80} className="text-zinc-700" /></div>
            <div className="p-8 flex-1 flex flex-col justify-center">
               <div className="flex items-center gap-2 text-chido-red font-bold text-xs uppercase mb-2"><Clock size={14} /> Termina en 2 días</div>
               <h2 className="text-3xl font-black text-white mb-2">La Carrera del Millón</h2>
               <p className="text-zinc-400 mb-6">El primer lugar se lleva $50,000 MXN.</p>
               <button className="px-6 py-3 bg-chido-gold text-black font-bold rounded-xl hover:brightness-110 transition-all">Unirse Ahora</button>
            </div>
         </div>
      </div>
    </MainLayout>
  );
}
