"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, History, Zap } from "lucide-react";

export default function CrashPro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { balance, refresh } = useWalletBalance();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<"IDLE" | "RUNNING" | "CRASHED">("IDLE");
  const [multiplier, setMultiplier] = useState(1.00);
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(2.00);
  const [history, setHistory] = useState<{ crash: number; win: boolean }[]>([
    { crash: 1.45, win: false }, { crash: 2.10, win: true }, { crash: 5.67, win: true } // Datos dummy iniciales
  ]);

  // Lógica de juego simplificada para frontend (debes conectarla a tu API real)
  const startGame = async () => {
    if (bet > (balance || 0)) return toast({ title: "Saldo insuficiente", variant: "destructive" });
    
    setGameState("RUNNING");
    setMultiplier(1.00);
    
    // Aquí iría tu fetch al API. Simulamos visualmente:
    let currentM = 1.00;
    const speed = 0.05; // Velocidad de subida
    
    const interval = setInterval(() => {
      currentM += currentM * 0.01 + 0.005; // Crecimiento exponencial suave
      setMultiplier(currentM);
      
      // Simulación de crash aleatorio (esto lo dicta el backend en realidad)
      if (Math.random() > 0.98 && currentM > 1.2) {
         clearInterval(interval);
         crash(currentM);
      }
    }, 50);
  };

  const crash = (finalM: number) => {
    setGameState("CRASHED");
    setHistory(prev => [{ crash: finalM, win: false }, ...prev].slice(0, 10));
    refresh();
  };

  // Renderizado del Canvas (Estilo Stake Curve)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustar resolución retina
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Fondo Grid
      ctx.strokeStyle = "#ffffff05";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<rect.width; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i,rect.height); }
      for(let i=0; i<rect.height; i+=50) { ctx.moveTo(0,i); ctx.lineTo(rect.width,i); }
      ctx.stroke();

      if (gameState === "RUNNING" || gameState === "CRASHED") {
         // Dibujar Curva
         ctx.beginPath();
         ctx.moveTo(0, rect.height);
         
         // Curva Bézier simple basada en el tiempo/multiplicador
         // Se normaliza para que siempre se vea bien en pantalla
         const t = Math.min(1, (multiplier - 1) / 10); // Escala visual
         const x = t * rect.width * 0.8;
         const y = rect.height - (t * rect.height * 0.8);
         
         ctx.quadraticCurveTo(x * 0.5, rect.height, x, y);
         
         ctx.strokeStyle = gameState === "CRASHED" ? "#FF3D00" : "#00F0FF";
         ctx.lineWidth = 4;
         ctx.lineCap = "round";
         ctx.stroke();

         // Área bajo la curva (Gradiente)
         ctx.lineTo(x, rect.height);
         ctx.lineTo(0, rect.height);
         const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
         grad.addColorStop(0, gameState === "CRASHED" ? "rgba(255, 61, 0, 0.2)" : "rgba(0, 240, 255, 0.2)");
         grad.addColorStop(1, "rgba(0,0,0,0)");
         ctx.fillStyle = grad;
         ctx.fill();

         // Punto (Cohete)
         ctx.beginPath();
         ctx.arc(x, y, 6, 0, Math.PI * 2);
         ctx.fillStyle = "#fff";
         ctx.fill();
         // Glow del punto
         ctx.shadowColor = gameState === "CRASHED" ? "#FF3D00" : "#00F0FF";
         ctx.shadowBlur = 15;
         ctx.stroke();
         ctx.shadowBlur = 0; // Reset
      }
      
      requestAnimationFrame(draw);
    };

    draw();
  }, [gameState, multiplier]);


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] p-4 max-w-7xl mx-auto">
      
      {/* Sidebar de Apuestas */}
      <div className="w-full lg:w-80 flex flex-col gap-4 bg-[#1A1A1D] p-6 rounded-3xl border border-white/5 h-fit">
        <div className="flex items-center gap-2 mb-4">
           <Zap className="text-[#00F0FF]" />
           <h2 className="font-bold text-white">Configuración</h2>
        </div>

        <div className="space-y-2">
           <label className="text-xs font-bold text-zinc-500 uppercase">Importe de Apuesta</label>
           <div className="relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
             <Input 
                type="number" 
                value={bet} 
                onChange={(e) => setBet(Number(e.target.value))}
                className="bg-black border-white/10 h-12 pl-8 font-mono text-white focus:ring-[#00F0FF]"
             />
           </div>
           <div className="grid grid-cols-4 gap-2">
              {[10, 50, 100, 500].map(v => (
                <button key={v} onClick={() => setBet(v)} className="bg-white/5 text-xs py-2 rounded hover:bg-white/10 transition">{v}</button>
              ))}
           </div>
        </div>

        <div className="space-y-2 mt-2">
           <label className="text-xs font-bold text-zinc-500 uppercase">Auto Retiro (x)</label>
           <Input 
              type="number" 
              value={target} 
              onChange={(e) => setTarget(Number(e.target.value))}
              className="bg-black border-white/10 h-12 font-mono text-white focus:ring-[#00F0FF]"
           />
        </div>

        <Button 
          onClick={startGame}
          disabled={gameState === "RUNNING"}
          className={`h-14 mt-4 text-lg font-black uppercase tracking-widest
            ${gameState === "RUNNING" ? "bg-zinc-700" : "bg-[#00F0FF] text-black hover:bg-[#00d6e6] shadow-[0_0_20px_rgba(0,240,255,0.2)]"}
          `}
        >
          {gameState === "RUNNING" ? "EN JUEGO..." : "APOSTAR"}
        </Button>
      </div>

      {/* Área de Juego */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Historial */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs text-zinc-500 font-bold border border-white/5">
             <History size={12} /> RECIENTES
           </div>
           {history.map((h, i) => (
             <div key={i} className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${h.win ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
               {h.crash.toFixed(2)}x
             </div>
           ))}
        </div>

        {/* Canvas Container */}
        <div className="relative flex-1 bg-[#0f0f11] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
           <canvas ref={canvasRef} className="w-full h-full object-cover" />
           
           {/* Overlay Central Texto */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`text-8xl lg:text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-200 ${gameState === "CRASHED" ? "text-[#FF3D00]" : "text-white"}`}>
                 {multiplier.toFixed(2)}x
              </div>
              {gameState === "CRASHED" && (
                <div className="absolute mt-32 px-4 py-1 bg-[#FF3D00] text-black font-black text-sm uppercase tracking-widest rounded">
                   CRASHED
                </div>
              )}
           </div>
        </div>
      </div>

    </div>
  );
}
