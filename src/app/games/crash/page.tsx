"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { useState, useEffect, useRef } from "react";
import { TrendingUp, Trophy } from "lucide-react";

export default function CrashGamePage() {
  const [betAmount, setBetAmount] = useState("10");
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameStatus, setGameStatus] = useState<"idle" | "running" | "crashed" | "cashed_out">("idle");
  const [history, setHistory] = useState<number[]>([1.22, 4.50, 1.10]);
  
  const crashPointRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
      if (betAmount === "" || Number(betAmount) <= 0) return;
      setMultiplier(1.00);
      setGameStatus('running');
      // Simulación de crash (Backend en prod)
      crashPointRef.current = 1 + Math.random() * 5; 
      
      intervalRef.current = setInterval(() => {
          setMultiplier(prev => {
              const next = prev + 0.01 + (prev * 0.004);
              if (next >= crashPointRef.current) {
                  crash();
                  return crashPointRef.current;
              }
              return next;
          });
      }, 30);
  };

  const crash = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setGameStatus('crashed');
      setHistory(prev => [crashPointRef.current, ...prev].slice(0, 8));
  };

  // LOGICA CASHOUT (RETIRAR)
  const cashOut = () => {
      if (gameStatus !== 'running') return;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setGameStatus('cashed_out');
      // Aquí se enviaría la señal al backend
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const getStatusColor = () => {
      if (gameStatus === 'crashed') return 'text-chido-red';
      if (gameStatus === 'cashed_out') return 'text-chido-green';
      return 'text-white';
  };

  return (
    <MainLayout>
      <div className="grid lg:grid-cols-[1fr_350px] gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in px-4 pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-zinc-900 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center group shadow-2xl">
            {/* Fondo Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            
            <div className={`relative z-10 text-center transition-transform duration-100 ${gameStatus === 'crashed' ? 'shake' : ''}`}>
              <div className={`text-8xl lg:text-9xl font-black tabular-nums tracking-tighter drop-shadow-2xl ${getStatusColor()}`}>
                  {multiplier.toFixed(2)}x
              </div>
              <div className="flex justify-center mt-4">
                  {gameStatus === 'running' && <span className="bg-chido-pink/20 text-chido-pink px-4 py-1 rounded-full text-xs font-black animate-pulse uppercase tracking-widest">🚀 Volando...</span>}
                  {gameStatus === 'crashed' && <span className="bg-chido-red/20 text-chido-red px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">💥 Crash</span>}
                  {gameStatus === 'cashed_out' && <span className="bg-chido-green/20 text-chido-green px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">💰 Cobrado</span>}
                  {gameStatus === 'idle' && <span className="bg-white/10 text-zinc-400 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">Listo</span>}
              </div>
            </div>

            {/* GRÁFICA SVG */}
            {gameStatus === 'running' && (
                <svg className="absolute bottom-0 left-0 w-full h-1/2 opacity-20 pointer-events-none">
                    <path d="M0,500 Q 200,400 1000,0" stroke="url(#gradient)" strokeWidth="4" fill="none" className="animate-dash"/>
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00F0FF" />
                            <stop offset="100%" stopColor="#FF0099" />
                        </linearGradient>
                    </defs>
                </svg>
            )}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 border border-white/5 flex flex-col md:flex-row gap-6 items-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-chido-cyan to-chido-pink" />
             <div className="flex-1 w-full space-y-2">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Tu Apuesta</label>
                 <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black text-xl">$</span>
                     <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={gameStatus === 'running'} className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-chido-cyan outline-none transition-all" />
                 </div>
             </div>

             {gameStatus === 'running' ? (
                 <button onClick={cashOut} className="w-full md:w-auto md:px-12 h-20 bg-chido-green text-black font-black text-2xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(50,205,50,0.4)] flex flex-col items-center justify-center leading-none">
                    <span>RETIRAR</span>
                    <span className="text-sm font-bold opacity-80">@ {multiplier.toFixed(2)}x</span>
                 </button>
             ) : (
                 <button onClick={startGame} className="w-full md:w-auto md:px-12 h-20 bg-gradient-to-r from-chido-cyan to-blue-600 text-white font-black text-2xl rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,240,255,0.3)]">APOSTAR</button>
             )}
          </div>
        </div>
        
        {/* Historial */}
        <div className="hidden lg:flex flex-col bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <span className="font-black text-sm text-zinc-400 uppercase tracking-wider flex items-center gap-2"><TrendingUp size={16}/> Historial</span>
          </div>
          <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
             {history.map((val, i) => (
                 <div key={i} className={`flex items-center justify-between p-3 rounded-xl border border-white/5 ${val >= 2.0 ? 'bg-chido-green/10' : 'bg-white/5'}`}>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Ronda #{83920 - i}</span>
                        <span className={`font-black text-lg ${val >= 2.0 ? 'text-chido-green' : 'text-zinc-400'}`}>{val.toFixed(2)}x</span>
                     </div>
                     {val >= 10 && <Trophy size={16} className="text-chido-gold" />}
                 </div>
             ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}