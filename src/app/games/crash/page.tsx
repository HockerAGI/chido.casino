"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useState } from "react";
import { Zap, Users, TrendingUp } from "lucide-react";

export default function CrashGamePage() {
  const [betAmount, setBetAmount] = useState("10");
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameStatus, setGameStatus] = useState<"idle" | "running" | "crashed">("idle");

  return (
    <MainLayout>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in">
        
        {/* ZONA DE JUEGO */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-zinc-900 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-center group shadow-2xl">
            {/* Fondo Cyber-Mex */}
            <div className="absolute inset-0 bg-mexican-pattern opacity-10" />
            <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-chido-pink/10 to-transparent" />
            
            <div className="relative z-10 text-center">
              <div className="text-8xl lg:text-9xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                {multiplier.toFixed(2)}x
              </div>
              <div className="text-chido-cyan font-bold uppercase tracking-[0.3em] mt-4 animate-pulse flex items-center justify-center gap-2">
                <Zap size={16} /> {gameStatus === 'running' ? 'VOLANDO...' : 'LISTO PARA DESPEGUE'}
              </div>
            </div>
            
            {/* Curva SVG */}
            <svg className="absolute bottom-0 left-0 w-full h-full pointer-events-none opacity-60">
               <path d="M0,600 Q400,500 800,100" fill="none" stroke="#FF0099" strokeWidth="4" className="drop-shadow-[0_0_10px_#FF0099]" />
            </svg>
          </div>

          {/* CONTROLES */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row gap-4 items-center shadow-lg">
             <div className="flex-1 w-full">
               <div className="flex justify-between mb-1">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Tu Apuesta</label>
                 <span className="text-[10px] font-bold text-zinc-500">Saldo: $---</span>
               </div>
               <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">$</span>
                 <input 
                   type="number" 
                   value={betAmount}
                   onChange={(e) => setBetAmount(e.target.value)}
                   className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-chido-pink outline-none transition-colors"
                 />
               </div>
             </div>

             <button className="w-full md:w-auto md:px-16 h-14 bg-gradient-to-r from-chido-green to-emerald-600 hover:scale-105 text-white font-black text-xl rounded-xl shadow-[0_0_20px_rgba(50,205,50,0.4)] transition-all active:scale-95">
               APOSTAR
             </button>
          </div>
        </div>

        {/* SIDEBAR JUEGO */}
        <div className="hidden lg:flex flex-col bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden">
          <div className="flex border-b border-white/5">
            <button className="flex-1 py-3 text-xs font-bold text-white border-b-2 border-chido-cyan bg-white/5 uppercase">Apuestas</button>
            <button className="flex-1 py-3 text-xs font-bold text-zinc-500 hover:text-white uppercase">Historial</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 rounded hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"><Users size={12}/></div>
                  <span className="text-zinc-300 font-bold">Jugador{i}</span>
                </div>
                <div className="flex gap-4">
                   <span className="text-white font-bold">$500</span>
                   <span className="text-chido-green font-bold">2.5x</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-black/40 border-t border-white/5 text-[10px] text-zinc-500 flex justify-between uppercase font-bold tracking-wider">
             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-chido-green animate-pulse"></div> Live</div>
             <div>Total: $125,000</div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
