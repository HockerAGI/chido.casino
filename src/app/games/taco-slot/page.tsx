"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Info, Volume2, VolumeX } from "lucide-react";

// Configuración de Assets (Asegúrate de que existan en /public)
const SYMBOLS: Record<string, string> = {
  verde: "/badge-verde.png",
  jalapeno: "/badge-jalapeno.png",
  serrano: "/badge-serrano.png",
  habanero: "/badge-habanero.png",
};

export default function TacoSlotPro() {
  const { balance, refresh } = useWalletBalance();
  const { toast } = useToast();
  
  // Estados de Juego
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(["verde", "verde", "verde"]);
  const [winData, setWinData] = useState<{ amount: number; multiplier: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Referencias para efectos de sonido (si tienes los archivos .mp3 en public/sounds/)
  // const spinAudio = useRef(new Audio('/sounds/spin.mp3'));
  // const winAudio = useRef(new Audio('/sounds/win.mp3'));

  const handleSpin = async () => {
    if (spinning) return;
    if ((balance || 0) < bet) {
      toast({ title: "Saldo Insuficiente", variant: "destructive" });
      return;
    }

    setSpinning(true);
    setWinData(null);
    // if (soundEnabled) spinAudio.current.play();

    try {
      // Simulación visual de giro antes de recibir respuesta
      const interval = setInterval(() => {
        setReels([
          randomSymbol(), randomSymbol(), randomSymbol()
        ]);
      }, 100);

      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();

      clearInterval(interval);

      if (!data.ok) throw new Error(data.error);

      // Set final reels
      setReels(data.reels.map((r: any) => r.key));
      
      if (data.payout > 0) {
        setWinData({ amount: data.payout, multiplier: data.multiplier });
        // if (soundEnabled) winAudio.current.play();
      }

      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSpinning(false);
    }
  };

  const randomSymbol = () => {
    const keys = Object.keys(SYMBOLS);
    return keys[Math.floor(Math.random() * keys.length)];
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full">
      
      {/* GAME CONTAINER (Estilo Máquina Física) */}
      <div className="relative bg-[#1A1A1D] border border-white/10 rounded-3xl p-8 shadow-2xl max-w-4xl w-full">
        
        {/* Header del Juego */}
        <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-3">
             <div className="bg-[#FF0099] w-2 h-8 rounded-full shadow-[0_0_15px_#FF0099]" />
             <h1 className="text-2xl font-black italic tracking-tighter text-white">TACO SLOT <span className="text-[#00F0FF]">DELUXE</span></h1>
           </div>
           <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-zinc-500 hover:text-white transition-colors">
             {soundEnabled ? <Volume2 /> : <VolumeX />}
           </button>
        </div>

        {/* ÁREA DE RIELES (THE STAGE) */}
        <div className="relative bg-black rounded-xl border-4 border-[#2A2A2E] overflow-hidden p-4 shadow-inner">
           {/* Fondo decorativo interno */}
           <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] opacity-20 bg-cover mix-blend-overlay" />
           
           <div className="grid grid-cols-3 gap-4 relative z-10">
              {reels.map((symbol, i) => (
                <div key={i} className="aspect-[3/4] bg-[#121214] rounded-lg border border-white/5 flex items-center justify-center overflow-hidden relative shadow-lg">
                   {/* Columna gradiente efecto metálico */}
                   <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none z-20" />
                   
                   <div className={`w-3/4 h-3/4 relative ${spinning ? 'animate-slot-spin blur-sm' : ''}`}>
                      <Image 
                        src={SYMBOLS[symbol]} 
                        alt={symbol} 
                        fill 
                        className="object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                      />
                   </div>
                </div>
              ))}
           </div>

           {/* OVERLAY DE VICTORIA */}
           {winData && (
             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                <div className="text-center animate-win">
                  <div className="text-6xl font-black text-[#00F0FF] drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                    x{winData.multiplier}
                  </div>
                  <div className="text-3xl font-bold text-white mt-2">
                    ¡GANASTE ${winData.amount}!
                  </div>
                </div>
             </div>
           )}
        </div>

        {/* PANEL DE CONTROL (BOTTOM UI) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#121214] p-4 rounded-2xl border border-white/5">
           
           {/* Balance Info */}
           <div className="text-center md:text-left">
             <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Tu Saldo</div>
             <div className="text-xl font-mono text-white">${formatted}</div>
           </div>

           {/* Bet Controls */}
           <div className="flex items-center justify-center gap-4 bg-black/30 p-2 rounded-xl border border-white/5">
              <button 
                onClick={() => setBet(Math.max(10, bet - 10))}
                className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
              >-</button>
              <div className="w-24 text-center">
                 <div className="text-[10px] text-zinc-500 uppercase font-bold">Apuesta</div>
                 <div className="text-lg font-bold text-white">${bet}</div>
              </div>
              <button 
                onClick={() => setBet(bet + 10)}
                className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
              >+</button>
           </div>

           {/* Spin Button */}
           <div>
             <Button 
               onClick={handleSpin} 
               disabled={spinning}
               className={`w-full h-16 text-xl font-black uppercase tracking-widest rounded-xl transition-all
                 ${spinning 
                   ? 'bg-zinc-700 cursor-not-allowed' 
                   : 'bg-gradient-to-b from-[#00F0FF] to-[#0099FF] hover:scale-[1.02] shadow-[0_0_20px_rgba(0,240,255,0.3)] text-black border-none'}
               `}
             >
               {spinning ? <Loader2 className="animate-spin" /> : "GIRAR"}
             </Button>
           </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 flex justify-center gap-6 text-xs text-zinc-600 font-medium">
           <span className="flex items-center gap-1"><Info size={12}/> Provably Fair</span>
           <span>RTP: 98.5%</span>
           <span>ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
        </div>

      </div>
    </div>
  );
}
