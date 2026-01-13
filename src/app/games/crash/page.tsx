"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { useState, useEffect } from "react";
import { Zap, Users, TrendingUp } from "lucide-react";

export default function CrashGamePage() {
  const [betAmount, setBetAmount] = useState("10");
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameStatus, setGameStatus] = useState<"idle" | "running" | "crashed">("idle");

  // Simulación del Juego
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStatus === 'running') {
        interval = setInterval(() => {
            setMultiplier(prev => {
                const next = prev + 0.01 + (prev * 0.002); // Crecimiento exponencial simple
                // Crash aleatorio (simulado)
                if (Math.random() > 0.98 && next > 1.2) {
                    setGameStatus('crashed');
                    return next;
                }
                return next;
            });
        }, 50);
    }
    return () => clearInterval(interval);
  }, [gameStatus]);

  const startGame = () => {
      setMultiplier(1.00);
      setGameStatus('running');
  };

  return (
    <MainLayout>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in px-4">
        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-zinc-900 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-center group shadow-2xl">
            <div className="absolute inset-0 bg-mexican-pattern opacity-10" />
            <div className={`relative z-10 text-center transition-transform ${gameStatus === 'crashed' ? 'shake text-chido-red' : 'text-white'}`}>
              <div className="text-8xl lg:text-9xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                  {multiplier.toFixed(2)}x
              </div>
              <div className="text-chido-cyan font-bold uppercase tracking-[0.3em] mt-4 flex items-center justify-center gap-2">
                  {gameStatus === 'running' ? <span className="animate-pulse">VOLANDO...</span> : gameStatus === 'crashed' ? <span className="text-chido-red">CRASHED!</span> : 'LISTO'}
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row gap-4 items-center shadow-lg">
             <div className="flex-1 w-full relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">$</span>
                 <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-chido-pink outline-none" />
             </div>
             <button onClick={startGame} disabled={gameStatus === 'running'} className={`w-full md:w-auto md:px-16 h-14 font-black text-xl rounded-xl transition-all active:scale-95 ${gameStatus === 'running' ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-chido-green to-emerald-600 text-white hover:scale-105 shadow-[0_0_20px_rgba(50,205,50,0.4)]'}`}>
               {gameStatus === 'running' ? 'EN JUEGO' : 'APOSTAR'}
             </button>
          </div>
        </div>
        
        {/* SIDEBAR HISTORIAL */}
        <div className="hidden lg:flex flex-col bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 font-bold text-sm text-zinc-400 uppercase">Historial Reciente</div>
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
             {[1.22, 4.50, 1.10, 12.40, 2.00, 1.85].map((val, i) => (
                 <div key={i} className={`flex justify-between text-xs font-bold p-2 rounded ${val > 2 ? 'bg-chido-green/10 text-chido-green' : 'bg-white/5 text-zinc-400'}`}>
                     <span>Juego #{2090+i}</span>
                     <span>{val.toFixed(2)}x</span>
                 </div>
             ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
