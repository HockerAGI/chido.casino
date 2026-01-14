"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { useState, useEffect, useRef } from "react";
import { TrendingUp, Trophy, Play, StopCircle } from "lucide-react";

export default function CrashGamePage() {
  const [betAmount, setBetAmount] = useState("10");
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameStatus, setGameStatus] = useState<"idle" | "running" | "crashed" | "cashed_out">("idle");
  const [history, setHistory] = useState<number[]>([1.45, 2.10, 1.10, 8.50, 3.20]);
  const [elapsed, setElapsed] = useState(0); // Para dibujar la curva
  
  const crashPointRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
      if (betAmount === "" || Number(betAmount) <= 0) return;
      
      setMultiplier(1.00);
      setElapsed(0);
      setGameStatus('running');
      crashPointRef.current = 1 + Math.random() * 5; 
      
      const startTime = Date.now();

      intervalRef.current = setInterval(() => {
          const now = Date.now();
          const t = (now - startTime) / 1000; // Tiempo en segundos
          setElapsed(t);

          // Fórmula de crecimiento exponencial típica de Crash
          const currentMult = Math.pow(Math.E, 0.06 * t);

          if (currentMult >= crashPointRef.current) {
              crash(crashPointRef.current);
          } else {
              setMultiplier(currentMult);
          }
      }, 50); // 20 FPS actualización
  };

  const crash = (finalValue: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setMultiplier(finalValue);
      setGameStatus('crashed');
      setHistory(prev => [finalValue, ...prev].slice(0, 10));
  };

  const cashOut = () => {
      if (gameStatus !== 'running') return;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setGameStatus('cashed_out');
      // Backend call here
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Generar path de curva SVG basado en tiempo
  const getCurvePath = () => {
      // Mapear tiempo y multiplicador a coordenadas SVG (1000x500)
      const x = Math.min(elapsed * 100, 1000); 
      const y = 500 - Math.min((multiplier - 1) * 100, 500);
      return `M0,500 Q${x/2},${500} ${x},${y}`;
  };

  return (
    <MainLayout>
      <div className="grid lg:grid-cols-[1fr_350px] gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in px-4 pb-4">
        
        {/* ÁREA DE JUEGO */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-[#0a0a0c] rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center group shadow-2xl">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
            
            {/* Multiplicador Central */}
            <div className="relative z-20 text-center">
              <div className={`text-7xl lg:text-9xl font-black tabular-nums tracking-tighter drop-shadow-2xl transition-colors duration-100 ${
                  gameStatus === 'crashed' ? 'text-chido-red shake' : 
                  gameStatus === 'cashed_out' ? 'text-chido-green' : 'text-white'
              }`}>
                  {multiplier.toFixed(2)}x
              </div>
              <div className="text-zinc-500 font-mono text-sm mt-2 tracking-widest uppercase">
                  {gameStatus === 'running' ? 'Ganancia actual' : gameStatus === 'crashed' ? 'Ronda terminada' : 'Listo'}
              </div>
            </div>

            {/* CURVA SVG */}
            {gameStatus === 'running' && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 1000 500" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(0, 240, 255, 0.2)" />
                            <stop offset="100%" stopColor="rgba(0, 240, 255, 0)" />
                        </linearGradient>
                    </defs>
                    <path d={`${getCurvePath()} L${Math.min(elapsed * 100, 1000)},500 Z`} fill="url(#grad)" />
                    <path d={getCurvePath()} stroke="#00F0FF" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
            )}
          </div>

          {/* CONTROLES */}
          <div className="bg-zinc-900 rounded-3xl p-6 border border-white/5 flex flex-col md:flex-row gap-6 items-center shadow-lg relative overflow-hidden">
             <div className="flex-1 w-full space-y-2">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Monto de Apuesta</label>
                 <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black text-xl">$</span>
                     <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={gameStatus === 'running'} className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-chido-cyan outline-none transition-all" />
                 </div>
                 <div className="flex gap-2">
                    {["10", "50", "100", "1/2", "2x"].map(val => (
                        <button key={val} className="flex-1 bg-white/5 hover:bg-white/10 rounded-lg py-1 text-xs font-bold text-zinc-400 transition-colors">{val}</button>
                    ))}
                 </div>
             </div>

             {gameStatus === 'running' ? (
                 <button onClick={cashOut} className="w-full md:w-auto md:px-16 h-20 bg-white text-black font-black text-2xl rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                    RETIRAR
                 </button>
             ) : (
                 <button onClick={startGame} className="w-full md:w-auto md:px-16 h-20 bg-chido-green text-black font-black text-2xl rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(50,205,50,0.4)] flex items-center justify-center gap-2">
                    JUGAR
                 </button>
             )}
          </div>
        </div>
        
        {/* SIDEBAR HISTORIAL (Vertical Scrolling) */}
        <div className="hidden lg:flex flex-col bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-black/20 font-bold text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14}/> Últimos Resultados
          </div>
          <div className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
             {history.map((val, i) => (
                 <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 ${val >= 2.0 ? 'bg-chido-green/5 border-chido-green/20' : 'bg-white/5'}`}>
                     <span className="text-xs text-zinc-500 font-mono">14:2{i} PM</span>
                     <span className={`font-black text-sm ${val >= 10 ? 'text-chido-gold' : val >= 2 ? 'text-chido-green' : 'text-zinc-400'}`}>{val.toFixed(2)}x</span>
                 </div>
             ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}