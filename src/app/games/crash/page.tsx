"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Loader2, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";

export default function CrashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [multiplier, setMultiplier] = useState(1.00);
  const [isRunning, setIsRunning] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [target, setTarget] = useState(2.00);
  const [lastResult, setLastResult] = useState<{win: boolean, crash: number, payout: number} | null>(null);
  const { formatted, balance, refresh } = useWalletBalance(); 

  const handlePlay = async () => {
    if (isRunning) return;
    if (betAmount > balance) {
        alert("Saldo insuficiente");
        return;
    }
    
    setIsRunning(true);
    setLastResult(null);
    setMultiplier(1.00);

    try {
      const res = await fetch("/api/games/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount, target: target }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      animateCrash(data.crashMultiplier, data.didCashout, data.payout);

    } catch (e: any) {
      alert("Error: " + e.message);
      setIsRunning(false);
    }
  };

  function animateCrash(finalCrashPoint: number, won: boolean, payout: number) {
    let current = 1.00;
    
    const loop = () => {
      // Curva de aceleración
      current += current * 0.03 + 0.005; 
      
      if (current >= finalCrashPoint) {
        setMultiplier(finalCrashPoint);
        setIsRunning(false);
        setLastResult({ win: won, crash: finalCrashPoint, payout });
        refresh(); // Actualizar saldo al terminar
        return;
      }

      setMultiplier(current);
      draw(current, finalCrashPoint);
      requestAnimationFrame(loop);
    };
    
    loop();
  }

  function draw(currentM: number, finalM: number) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);
    
    // Fondo
    ctx.fillStyle = "#0B0D10";
    ctx.fillRect(0,0, c.width, c.height);

    // Grilla
    ctx.strokeStyle = "#ffffff10";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<c.width; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i,c.height); }
    for(let i=0; i<c.height; i+=50) { ctx.moveTo(0,i); ctx.lineTo(c.width,i); }
    ctx.stroke();

    // Cohete/Línea
    ctx.beginPath();
    ctx.moveTo(0, c.height);
    
    // Progresión visual
    const progress = (currentM - 1) / (finalM - 0.5); 
    const x = Math.min(c.width, progress * c.width * 0.9);
    const y = c.height - Math.min(c.height, progress * c.height * 0.9);
    
    ctx.quadraticCurveTo(x/2, c.height, x, y);
    
    ctx.strokeStyle = currentM >= target ? "#00F0FF" : "#FF0099"; 
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.stroke();

    // Punto final
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Controles */}
        <div className="w-full lg:w-80 bg-zinc-900/80 backdrop-blur border border-white/10 p-6 rounded-3xl h-fit flex flex-col gap-6">
           <div className="flex items-center gap-2 text-white/50 mb-2">
             <TrendingUp size={20} />
             <span className="font-bold tracking-widest text-xs uppercase">Estrategia</span>
           </div>

           <div>
             <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Apuesta</label>
             <div className="relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
               <input 
                 type="number" 
                 value={betAmount} 
                 onChange={e => setBetAmount(Number(e.target.value))}
                 className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-8 text-white font-bold outline-none focus:border-chido-cyan transition-colors"
               />
             </div>
           </div>

           <div>
             <div className="flex justify-between mb-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">Auto-Retiro (Target)</label>
                <div className="group relative">
                    <Info size={14} className="text-zinc-600 cursor-help"/>
                    <div className="absolute bottom-full right-0 w-48 bg-black border border-white/20 p-2 text-[10px] rounded mb-2 hidden group-hover:block z-20">
                        Si el cohete llega a este número, ganas automáticamente.
                    </div>
                </div>
             </div>
             <div className="relative">
               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">X</span>
               <input 
                 type="number" 
                 step="0.1"
                 min="1.01"
                 value={target} 
                 onChange={e => setTarget(Number(e.target.value))}
                 className="w-full bg-black border border-white/10 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-chido-cyan transition-colors"
               />
             </div>
           </div>

           <Button 
             onClick={handlePlay} 
             disabled={isRunning || betAmount > balance}
             className={`w-full py-7 rounded-2xl font-black text-xl shadow-lg transition-all ${
               isRunning ? 'bg-zinc-800 text-zinc-600' : 'bg-gradient-to-r from-chido-cyan to-blue-600 text-black hover:scale-[1.02]'
             }`}
           >
             {isRunning ? <Loader2 className="animate-spin" /> : "DESPEGAR 🚀"}
           </Button>
           
           <div className="text-center text-xs text-zinc-500 font-medium">
             Saldo: ${formatted}
           </div>
        </div>

        {/* Canvas Juego */}
        <div className="flex-1 relative bg-[#0B0D10] rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/3] md:aspect-video">
           <canvas ref={canvasRef} width={800} height={450} className="w-full h-full object-cover" />
           
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              {isRunning ? (
                  <div className="text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(0,240,255,0.4)] tabular-nums tracking-tighter">
                    {multiplier.toFixed(2)}x
                  </div>
              ) : lastResult ? (
                  <div className="flex flex-col items-center animate-fade-in scale-110">
                     <div className={`text-6xl md:text-9xl font-black mb-4 ${lastResult.win ? 'text-chido-green drop-shadow-[0_0_30px_rgba(50,205,50,0.6)]' : 'text-chido-red drop-shadow-[0_0_30px_rgba(255,0,0,0.6)]'}`}>
                       {lastResult.crash.toFixed(2)}x
                     </div>
                     {lastResult.win && (
                         <div className="px-8 py-3 bg-chido-green/20 backdrop-blur-md rounded-full text-2xl font-black border border-chido-green/50 text-chido-green animate-float">
                           +${lastResult.payout.toFixed(2)}
                         </div>
                     )}
                     {!lastResult.win && (
                         <div className="px-6 py-2 bg-red-500/10 backdrop-blur-md rounded-full text-lg font-bold border border-red-500/20 text-red-500">
                           CRASHED
                         </div>
                     )}
                  </div>
              ) : (
                  <div className="text-zinc-700 font-black text-4xl md:text-5xl uppercase tracking-widest opacity-50">
                    Listo
                  </div>
              )}
           </div>
        </div>

      </div>
    </MainLayout>
  );
}