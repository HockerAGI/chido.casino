"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Loader2 } from "lucide-react";

export default function CrashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [multiplier, setMultiplier] = useState(1.00);
  const [isRunning, setIsRunning] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [target, setTarget] = useState(2.00); // Auto retiro
  const [lastResult, setLastResult] = useState<{win: boolean, crash: number} | null>(null);
  
  // Hook para refrescar saldo automáticamente al ganar
  const { formatted, balance } = useWalletBalance(); 

  const handlePlay = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLastResult(null);
    setMultiplier(1.00);

    try {
      // 1. Pedir al servidor que juegue la ronda
      const res = await fetch("/api/games/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: betAmount, target: target }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      // 2. Iniciar animación "fake" hasta el punto de crash real
      animateCrash(data.crashPoint, data.win, data.payout);

    } catch (e) {
      alert("Error: " + e);
      setIsRunning(false);
    }
  };

  function animateCrash(finalCrashPoint: number, won: boolean, payout: number) {
    let current = 1.00;
    const speed = 0.05; // Velocidad de la animación

    const loop = () => {
      // Crecimiento exponencial simple para visualización
      current += current * 0.02 + 0.01; 
      
      if (current >= finalCrashPoint) {
        setMultiplier(finalCrashPoint);
        setIsRunning(false);
        setLastResult({ win: won, crash: finalCrashPoint });
        // Aquí podrías forzar un refresh del wallet
        return;
      }

      setMultiplier(current);
      draw(current, finalCrashPoint);
      requestAnimationFrame(loop);
    };
    
    loop();
  }

  function draw(currentM: number, maxM: number) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Limpiar
    ctx.clearRect(0, 0, c.width, c.height);
    
    // Fondo Grid
    ctx.fillStyle = "#121225";
    ctx.fillRect(0,0, c.width, c.height);

    // Línea del gráfico
    ctx.beginPath();
    ctx.moveTo(0, c.height);
    
    // Curva simple visual
    const x = (currentM - 1) * 100; // Escala X
    const y = c.height - ((currentM - 1) * 50); // Escala Y
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentM > target ? "#00F0FF" : "#FF0099"; // Cambia color si ya pasaste tu target
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
      
      {/* Panel de Control */}
      <div className="w-full md:w-1/3 bg-zinc-900 p-6 rounded-2xl border border-white/10 h-fit">
         <h2 className="text-xl font-black mb-6 text-white">CONFIGURAR APUESTA</h2>
         
         <div className="mb-4">
           <label className="text-xs font-bold text-zinc-500 uppercase">Monto</label>
           <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
             <input 
               type="number" 
               value={betAmount} 
               onChange={e => setBetAmount(Number(e.target.value))}
               className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 text-white font-bold"
             />
           </div>
         </div>

         <div className="mb-8">
           <label className="text-xs font-bold text-zinc-500 uppercase">Retiro Automático (Target)</label>
           <div className="relative">
             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">X</span>
             <input 
               type="number" 
               step="0.1"
               value={target} 
               onChange={e => setTarget(Number(e.target.value))}
               className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white font-bold"
             />
           </div>
         </div>

         <button 
           onClick={handlePlay} 
           disabled={isRunning || betAmount > balance}
           className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all ${
             isRunning ? 'bg-zinc-700 text-zinc-500' : 'bg-chido-green text-black hover:scale-105'
           }`}
         >
           {isRunning ? <Loader2 className="animate-spin mx-auto"/> : "JUGAR RONDAS"}
         </button>
         
         <p className="mt-4 text-xs text-center text-zinc-500">Saldo disponible: ${formatted}</p>
      </div>

      {/* Pantalla de Juego */}
      <div className="flex-1 relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video">
         <canvas ref={canvasRef} width={800} height={450} className="w-full h-full object-cover" />
         
         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {isRunning ? (
                <div className="text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(0,240,255,0.5)] tabular-nums">
                  {multiplier.toFixed(2)}x
                </div>
            ) : lastResult ? (
                <div className={`flex flex-col items-center animate-fade-in`}>
                   <div className={`text-6xl md:text-8xl font-black mb-2 ${lastResult.win ? 'text-chido-green' : 'text-chido-red'}`}>
                     {lastResult.crash.toFixed(2)}x
                   </div>
                   <div className="px-6 py-2 bg-black/50 backdrop-blur-md rounded-full text-xl font-bold border border-white/10">
                     {lastResult.win ? "¡GANASTE!" : "CRASHED"}
                   </div>
                </div>
            ) : (
                <div className="text-zinc-600 font-black text-4xl uppercase">Listo para jugar</div>
            )}
         </div>
      </div>

    </div>
  );
}