"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useState } from "react";
import { Zap, TrendingUp, Users } from "lucide-react";

export default function CrashGamePage() {
  const [betAmount, setBetAmount] = useState("10");
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameStatus, setGameStatus] = useState<"idle" | "running" | "crashed">("idle");

  return (
    <MainLayout>
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 h-[calc(100vh-140px)] min-h-[600px]">
        
        {/* === ZONA DE JUEGO (IZQUIERDA) === */}
        <div className="flex flex-col gap-4">
          
          {/* CANVAS DEL JUEGO (VISUALIZADOR) */}
          <div className="flex-1 bg-zinc-900 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-center group shadow-2xl">
            {/* Fondo Grilla */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            {/* Multiplicador Central */}
            <div className="relative z-10 text-center">
              <div className="text-7xl lg:text-9xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                {multiplier.toFixed(2)}x
              </div>
              <div className="text-chido-cyan font-bold uppercase tracking-widest mt-2 animate-pulse">
                {gameStatus === 'running' ? 'VOLANDO...' : 'LISTO PARA DESPEGUE'}
              </div>
            </div>

            {/* Curva (Simulada con CSS por ahora) */}
            <svg className="absolute bottom-0 left-0 w-full h-full pointer-events-none opacity-50">
               <path d="M0,600 Q300,500 600,100" fill="none" stroke="#00F0FF" strokeWidth="4" className="drop-shadow-[0_0_10px_#00F0FF]" />
            </svg>
          </div>

          {/* CONTROLES DE APUESTA */}
          <div className="bg-zinc-900 rounded-2xl p-4 lg:p-6 border border-white/5 flex flex-col md:flex-row gap-4 items-center">
             <div className="flex-1 w-full">
               <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Importe Apuesta</label>
               <div className="relative mt-1">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">$</span>
                 <input 
                   type="number" 
                   value={betAmount}
                   onChange={(e) => setBetAmount(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-lg focus:border-chido-cyan outline-none transition-colors"
                 />
               </div>
               <div className="flex gap-2 mt-2">
                 {['10', '50', '100', 'MAX'].map(val => (
                   <button key={val} onClick={() => val !== 'MAX' && setBetAmount(val)} className="flex-1 bg-white/5 hover:bg-white/10 rounded-lg py-1 text-xs font-bold text-zinc-400 transition-colors">
                     {val === 'MAX' ? 'MAX' : `$${val}`}
                   </button>
                 ))}
               </div>
             </div>

             <button className="w-full md:w-auto md:px-12 h-16 bg-chido-green hover:brightness-110 text-black font-black text-xl rounded-xl shadow-[0_0_20px_rgba(50,205,50,0.3)] transition-all active:scale-95 flex flex-col items-center justify-center gap-0 leading-none">
               <span>APOSTAR</span>
               <span className="text-[10px] opacity-60 font-bold uppercase">Próxima Ronda</span>
             </button>
          </div>
        </div>

        {/* === SIDEBAR JUEGO (DERECHA - CHAT/HISTORIAL) === */}
        <div className="hidden lg:flex flex-col bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            <button className="flex-1 py-4 text-sm font-bold text-white border-b-2 border-chido-cyan bg-white/5">Bets</button>
            <button className="flex-1 py-4 text-sm font-bold text-zinc-500 hover:text-white">Chat</button>
          </div>

          {/* Lista de Apuestas (Simulada) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded hover:bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                    <Users size={12} className="text-zinc-400" />
                  </div>
                  <span className="text-zinc-300 font-medium">User{900+i}</span>
                </div>
                <div className="flex gap-4">
                   <span className="text-white font-bold">$100</span>
                   <span className="text-zinc-600">-</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Stats */}
          <div className="p-4 bg-black/20 border-t border-white/5 text-xs text-zinc-500 flex justify-between">
             <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Online: 142</div>
             <div>Total: $45,200</div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}