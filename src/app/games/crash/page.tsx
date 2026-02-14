"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { History, Zap, Loader2 } from "lucide-react";

export default function CrashPro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { balance, refresh, formatted } = useWalletBalance();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<"IDLE" | "RUNNING" | "CRASHED" | "WON">("IDLE");
  const [multiplier, setMultiplier] = useState(1.00);
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(2.00);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ crash: number; win: boolean }[]>([]);

  // Lógica REAL conectada al Backend
  const startGame = async () => {
    if (bet > (balance || 0)) {
      return toast({ title: "Saldo insuficiente", variant: "destructive" });
    }
    
    setLoading(true);
    setGameState("IDLE");
    setMultiplier(1.00);

    try {
      // 1. Llamada a la API Real (Transacción atómica en DB)
      const res = await fetch("/api/games/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betAmount: bet,
          targetMultiplier: target
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al procesar apuesta");
      }

      // 2. Si la apuesta fue aceptada, iniciamos la animación
      refresh(); // Actualiza saldo (se descuenta la apuesta)
      setLoading(false);
      setGameState("RUNNING");
      
      const crashPoint = Number(data.crashMultiplier);
      const userWon = data.didCashout;
      const targetPoint = Number(data.targetMultiplier);

      // 3. Simulación de subida hasta el resultado
      let currentM = 1.00;
      const animationSpeed = 20; // ms por frame

      const interval = setInterval(() => {
        // Crecimiento exponencial simulado
        currentM += currentM * 0.008 + 0.002; 
        
        // Determinar cuando parar
        const stopPoint = userWon ? targetPoint : crashPoint;
        
        if (currentM >= stopPoint) {
           clearInterval(interval);
           setMultiplier(stopPoint);
           
           if (userWon) {
             setGameState("WON");
             toast({ 
               title: "¡GANASTE!", 
               description: `Cobraste a ${targetPoint}x ($${data.payout})`,
               className: "bg-green-500 text-white border-none"
             });
           } else {
             setGameState("CRASHED");
             // Si el crash real fue mayor que donde cortamos la animación visual (por lag), ajustamos
             if (!userWon) setMultiplier(crashPoint);
           }
           
           // Guardar historial
           setHistory(prev => [{ crash: crashPoint, win: userWon }, ...prev].slice(0, 10));
           refresh(); // Actualizar saldo final
        } else {
           setMultiplier(currentM);
        }
      }, animationSpeed);

    } catch (error: any) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Renderizado del Canvas (Visualización)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Grid
      ctx.strokeStyle = "#ffffff05";
      ctx.beginPath();
      for(let i=0; i<rect.width; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i,rect.height); }
      for(let i=0; i<rect.height; i+=50) { ctx.moveTo(0,i); ctx.lineTo(rect.width,i); }
      ctx.stroke();

      if (gameState !== "IDLE") {
         const t = Math.min(1, (multiplier - 1) / 10); 
         const x = t * rect.width * 0.8;
         const y = rect.height - (t * rect.height * 0.8);
         
         ctx.beginPath();
         ctx.moveTo(0, rect.height);
         ctx.quadraticCurveTo(x * 0.5, rect.height, x, y);
         
         let color = "#00F0FF";
         if (gameState === "CRASHED") color = "#FF3D00";
         if (gameState === "WON") color = "#32CD32";

         ctx.strokeStyle = color;
         ctx.lineWidth = 4;
         ctx.lineCap = "round";
         ctx.stroke();

         ctx.lineTo(x, rect.height);
         ctx.lineTo(0, rect.height);
         const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
         grad.addColorStop(0, color + "33"); 
         grad.addColorStop(1, "rgba(0,0,0,0)");
         ctx.fillStyle = grad;
         ctx.fill();

         if (gameState === "RUNNING") {
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
         }
      }
      requestAnimationFrame(draw);
    };
    draw();
  }, [gameState, multiplier]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] p-4 max-w-7xl mx-auto animate-fade-in">
      
      {/* Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-4 bg-[#1A1A1D] p-6 rounded-3xl border border-white/5 h-fit shadow-xl">
        <div className="flex items-center gap-2 mb-2">
           <Zap className="text-[#00F0FF]" />
           <h2 className="font-bold text-white">Configuración</h2>
        </div>

        <div className="p-3 bg-black/40 rounded-xl mb-2 border border-white/5">
           <div className="text-xs text-zinc-500 uppercase">Saldo</div>
           <div className="text-lg font-mono text-white">{formatted}</div>
        </div>

        <div className="space-y-2">
           <label className="text-xs font-bold text-zinc-500 uppercase">Apuesta</label>
           <div className="relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
             <Input 
                type="number" 
                value={bet} 
                onChange={(e) => setBet(Number(e.target.value))}
                className="bg-black border-white/10 h-12 pl-8 font-mono text-white focus:ring-[#00F0FF]"
                disabled={gameState === "RUNNING"}
             />
           </div>
           <div className="grid grid-cols-4 gap-2">
              {[10, 50, 100, 500].map(v => (
                <button key={v} onClick={() => setBet(v)} disabled={gameState === "RUNNING"} className="bg-white/5 text-xs py-2 rounded hover:bg-white/10 transition">{v}</button>
              ))}
           </div>
        </div>

        <div className="space-y-2 mt-2">
           <label className="text-xs font-bold text-zinc-500 uppercase">Auto Retiro (x)</label>
           <Input 
              type="number" 
              value={target} 
              step="0.10"
              onChange={(e) => setTarget(Number(e.target.value))}
              className="bg-black border-white/10 h-12 font-mono text-white focus:ring-[#00F0FF]"
              disabled={gameState === "RUNNING"}
           />
        </div>

        <Button 
          onClick={startGame}
          disabled={gameState === "RUNNING" || loading}
          className={`h-14 mt-4 text-lg font-black uppercase tracking-widest transition-all
            ${gameState === "RUNNING" ? "bg-zinc-700 opacity-50 cursor-not-allowed" : "bg-[#00F0FF] text-black hover:bg-[#00d6e6] shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:scale-[1.02]"}
          `}
        >
          {loading ? <Loader2 className="animate-spin" /> : gameState === "RUNNING" ? "EN JUEGO..." : "APOSTAR"}
        </Button>
      </div>

      {/* Juego */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs text-zinc-500 font-bold border border-white/5">
             <History size={12} /> RECIENTES
           </div>
           {history.map((h, i) => (
             <div key={i} className={`px-3 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap ${h.win ? 'bg-[#32CD32]/10 text-[#32CD32] border border-[#32CD32]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
               {h.crash.toFixed(2)}x
             </div>
           ))}
        </div>

        <div className="relative flex-1 bg-[#0f0f11] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
           <canvas ref={canvasRef} className="w-full h-full object-cover" />
           
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className={`text-8xl lg:text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-200 
                ${gameState === "CRASHED" ? "text-[#FF3D00]" : gameState === "WON" ? "text-[#32CD32]" : "text-white"}`}>
                 {multiplier.toFixed(2)}x
              </div>
              
              {gameState === "CRASHED" && (
                <div className="mt-4 px-6 py-2 bg-[#FF3D00] text-black font-black text-xl uppercase tracking-widest rounded-full animate-in zoom-in">
                   CRASHED
                </div>
              )}
              
              {gameState === "WON" && (
                <div className="mt-4 px-6 py-2 bg-[#32CD32] text-black font-black text-xl uppercase tracking-widest rounded-full animate-in zoom-in">
                   ¡COBRADO!
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
