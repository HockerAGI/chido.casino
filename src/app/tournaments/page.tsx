"use client";

import { Trophy, Flame, Swords, Timer, Medal, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TournamentsPage() {
  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      
      {/* HERO SECTION */}
      <div className="relative bg-[#121214] border-b border-white/5 py-12 px-6 overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF0099]/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF0099]/10 text-[#FF0099] text-xs font-black uppercase tracking-widest mb-4 border border-[#FF0099]/20">
              <Trophy size={14} /> Competencia Activa
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter">
              TORNEOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0099] to-[#FF5E00]">CHIDOS</span>
            </h1>
            <p className="text-zinc-400 max-w-xl text-lg font-medium">
              Demuestra quién es el patrón. Entra a los torneos, rompe el ranking y llévate la bolsa acumulada. Cero trucos.
            </p>
          </div>
          
          {/* Bolsa Total Destacada */}
          <div className="bg-black/50 border border-white/10 p-6 rounded-3xl backdrop-blur-md text-center md:text-right flex-shrink-0">
             <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Bolsa de Premios del Mes</div>
             <div className="text-4xl font-black text-[#00F0FF] drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
               $150,000 <span className="text-lg text-white/50">MXN</span>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: Torneos (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="flex items-center gap-3 mb-6">
            <Flame className="text-[#FF5E00]" size={24} />
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Cartelera</h2>
          </div>

          {/* Torneo Activo (Destacado) */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-[#1A1A1D] to-[#121214] border-[#00F0FF]/30 p-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F0FF]/10 blur-3xl rounded-full" />
            <div className="bg-[#121214] rounded-2xl p-6 relative z-10">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#32CD32]/10 text-[#32CD32] text-[10px] font-black uppercase tracking-widest border border-[#32CD32]/20 mb-3 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#32CD32]" /> En Vivo
                  </div>
                  <h3 className="text-2xl font-black text-white">Crash Rush Semanal</h3>
                  <p className="text-sm text-zinc-400 mt-1">Multiplicadores altos te dan más puntos.</p>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Premio Mayor</div>
                  <div className="text-2xl font-black text-[#00F0FF]">$25,000</div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500 mb-6 bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="flex items-center gap-1.5"><Timer size={14}/> Termina en: 2d 14h</span>
                <span className="flex items-center gap-1.5"><Swords size={14}/> 142 Jugadores</span>
                <span className="flex items-center gap-1.5 text-[#00F0FF]">Inscripción: ¡Gratis!</span>
              </div>

              <Button className="w-full bg-[#00F0FF] text-black hover:bg-[#00d6e6] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                ENTRAR AL QUITE
              </Button>
            </div>
          </Card>

          {/* Torneo Próximo */}
          <Card className="relative overflow-hidden bg-[#1A1A1D] border-white/5 p-6 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest border border-white/10 mb-3">
                  Próximamente
                </div>
                <h3 className="text-xl font-black text-white">Taco Slot Fiesta</h3>
                <p className="text-sm text-zinc-400 mt-1">Acumula giros ganadores. El más suertudo se la lleva.</p>
              </div>
              <div className="text-left md:text-right">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Bolsa</div>
                <div className="text-xl font-black text-white">$10,000</div>
              </div>
            </div>
            <Button variant="secondary" className="w-full font-bold uppercase text-xs" disabled>
              Abre el Viernes
            </Button>
          </Card>
        </div>

        {/* COLUMNA DERECHA: Leaderboard (1/3) */}
        <div>
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
               <Medal className="text-[#FFD700]" size={24} />
               <h2 className="text-xl font-black text-white uppercase tracking-tight">Top 5 Perros</h2>
             </div>
           </div>

           <Card className="bg-[#121214] border-white/5 p-2 rounded-3xl overflow-hidden">
             <div className="bg-[#1A1A1D] rounded-2xl p-4">
               <div className="space-y-2">
                 {/* Generamos un leaderboard visualmente pro */}
                 {[
                   { name: "ElPatron99", pts: "14,250", color: "text-[#FFD700]", bg: "bg-[#FFD700]/10", border: "border-[#FFD700]/30" },
                   { name: "SinaloaBoy", pts: "12,100", color: "text-[#E0E0E0]", bg: "bg-[#E0E0E0]/10", border: "border-[#E0E0E0]/30" },
                   { name: "TijuanaBets", pts: "9,850", color: "text-[#CD7F32]", bg: "bg-[#CD7F32]/10", border: "border-[#CD7F32]/30" },
                   { name: "JuanPerez", pts: "8,400", color: "text-zinc-400", bg: "bg-transparent", border: "border-white/5" },
                   { name: "Maria_G", pts: "7,920", color: "text-zinc-400", bg: "bg-transparent", border: "border-white/5" },
                 ].map((player, i) => (
                   <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${player.border} ${player.bg} transition-colors`}>
                     <div className="flex items-center gap-3">
                       <span className={`font-black text-lg ${player.color}`}>#{i + 1}</span>
                       <span className="font-bold text-white text-sm">{player.name}</span>
                     </div>
                     <div className="font-mono font-bold text-[#00F0FF] text-sm">
                       {player.pts} <span className="text-[10px] text-zinc-500 uppercase">pts</span>
                     </div>
                   </div>
                 ))}
               </div>
               
               <button className="w-full mt-4 text-xs font-bold text-zinc-500 hover:text-white flex items-center justify-center gap-1 transition-colors">
                 Ver Ranking Completo <ChevronRight size={14} />
               </button>
             </div>
           </Card>
        </div>

      </div>
    </div>
  );
}
