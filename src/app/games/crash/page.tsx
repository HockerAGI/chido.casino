"use client";
import { MainLayout } from "@/components/layout/main-layout";
import { useState } from "react";
import { Zap, Users } from "lucide-react";

export default function CrashGamePage() {
  const [betAmount, setBetAmount] = useState("10");
  const [multiplier, setMultiplier] = useState(1.00);

  return (
    <MainLayout>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-140px)] min-h-[600px] animate-fade-in">
        <div className="flex flex-col gap-4">
          <div className="flex-1 bg-zinc-900 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-center group shadow-2xl">
            <div className="absolute inset-0 bg-mexican-pattern opacity-10" />
            <div className="relative z-10 text-center">
              <div className="text-8xl lg:text-9xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(0,240,255,0.4)]">{multiplier.toFixed(2)}x</div>
              <div className="text-chido-cyan font-bold uppercase tracking-[0.3em] mt-4 animate-pulse flex items-center justify-center gap-2"><Zap size={16} /> LISTO PARA DESPEGUE</div>
            </div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row gap-4 items-center shadow-lg">
             <div className="flex-1 w-full">
               <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">$</span>
                 <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-chido-pink outline-none transition-colors" />
               </div>
             </div>
             <button className="w-full md:w-auto md:px-16 h-14 bg-gradient-to-r from-chido-green to-emerald-600 hover:scale-105 text-white font-black text-xl rounded-xl shadow-[0_0_20px_rgba(50,205,50,0.4)] transition-all">APOSTAR</button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}