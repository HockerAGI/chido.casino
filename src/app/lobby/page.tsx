"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Play, TrendingUp, Zap, Star, ShieldCheck } from "lucide-react";
import Link from "next/link";

// Datos simulados (Pronto vendrán de Supabase)
const GAMES = [
  { id: "crash", name: "Chido Crash", provider: "Hocker Originals", hot: true, type: "original" },
  { id: "mines", name: "Mines", provider: "Hocker Originals", hot: false, type: "original" },
  { id: "plinko", name: "Plinko", provider: "Hocker Originals", hot: false, type: "original" },
];

export default function LobbyPage() {
  return (
    <MainLayout>
      
      {/* === HERO BANNER: CRASH === */}
      <section className="relative w-full h-[400px] lg:h-[480px] rounded-3xl overflow-hidden mb-12 group border border-white/5 shadow-2xl animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.1),transparent_60%)] z-10" />
        
        {/* Fondo Visual Abstracto (CSS Pattern) */}
        <div className="absolute inset-0 bg-zinc-900 overflow-hidden">
             <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
             <div className="absolute -right-20 -top-20 w-[600px] h-[600px] bg-chido-cyan/20 rounded-full blur-[100px] animate-pulse-slow"></div>
             <div className="absolute -left-20 bottom-0 w-[400px] h-[400px] bg-chido-red/10 rounded-full blur-[80px]"></div>
        </div>
        
        <div className="relative z-20 h-full flex flex-col justify-end p-8 lg:p-12 pb-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-chido-cyan/10 border border-chido-cyan/20 text-chido-cyan text-xs font-black rounded-full uppercase tracking-wider mb-4 backdrop-blur-md">
              <Zap size={12} fill="currentColor" /> Provably Fair
            </span>
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-4 italic tracking-tighter drop-shadow-lg leading-[0.9]">
              CHIDO <span className="text-transparent bg-clip-text bg-gradient-to-r from-chido-cyan to-white">CRASH</span>
            </h1>
            <p className="text-zinc-300 mb-8 text-lg font-medium leading-relaxed drop-shadow-md border-l-2 border-chido-cyan pl-4">
              Multiplicadores infinitos. Retiro automático. 
              <br/>El juego insignia del ecosistema Hocker.
            </p>
            <div className="flex gap-4">
                <Link href="/games/crash" className="bg-white text-black px-10 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-chido-cyan hover:text-black">
                    <Play size={20} fill="currentColor" /> JUGAR AHORA
                </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === SECCIÓN: ORIGINALS === */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black flex items-center gap-3 text-white tracking-tight">
            <Star className="text-chido-gold" fill="currentColor" />
            Hocker Originals
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {GAMES.map((game) => (
            <Link href={game.id === 'crash' ? '/games/crash' : '#'} key={game.id} className="group relative aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 hover:border-chido-cyan/50 transition-all cursor-pointer shadow-lg hover:shadow-chido-cyan/10 hover:-translate-y-1">
              
              {/* Etiqueta HOT */}
              {game.hot && (
                <div className="absolute top-3 right-0 bg-chido-red text-white text-[10px] font-black px-3 py-1 rounded-l-full shadow-lg z-20">
                  HOT
                </div>
              )}
              
              {/* Imagen Placeholder Generativa */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center text-zinc-600 group-hover:text-chido-cyan transition-colors bg-gradient-to-br ${game.id === 'crash' ? 'from-zinc-800 to-zinc-900' : 'from-zinc-900 to-black'}`}>
                 {game.id === 'crash' ? <Zap size={48} className="mb-2 text-chido-cyan/50" /> : <TrendingUp size={48} className="mb-2 opacity-50" />}
                 <span className="font-bold uppercase tracking-widest text-xs mt-2">{game.name}</span>
                 <span className="text-[10px] text-zinc-500 font-mono mt-1">{game.provider}</span>
              </div>

              {/* Overlay Hover */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm z-10">
                <button className="bg-chido-cyan text-black rounded-full p-4 hover:scale-110 transition-transform shadow-[0_0_20px_#00F0FF]">
                  <Play size={28} fill="currentColor" className="ml-1" />
                </button>
                <span className="text-sm font-bold text-white tracking-wider">JUGAR</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-white/5 pt-12 pb-8 text-center text-zinc-500 text-sm">
        <div className="flex justify-center gap-8 mb-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
           <div className="flex items-center gap-2"><ShieldCheck size={16}/><span>SSL Secure</span></div>
           <div className="flex items-center gap-2"><Zap size={16}/><span>RNG Certified</span></div>
        </div>
        <p className="mb-2">© 2026 Chido Casino. Una experiencia Hocker AGI.</p>
      </footer>

    </MainLayout>
  );
}