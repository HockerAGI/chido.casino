"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer"; // Asegúrate de tener este componente creado
import { Play, Zap, Star, ShieldCheck, Flame, Gift, Search, Trophy, Users, CheckCircle2, Coins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Search },
  { id: 'slots', label: 'Slots', icon: Flame },
  { id: 'crash', label: 'Crash', icon: Zap },
  { id: 'originals', label: 'Originals', icon: Star },
  { id: 'live', label: 'En Vivo', icon: Users },
];

const RECENT_WINNERS = [
  { user: "Juan P.", game: "Chido Crash", amount: 4500 },
  { user: "Maria L.", game: "Slots", amount: 1200 },
  { user: "Carlos X.", game: "Plinko", amount: 850 },
];

export default function LobbyPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  return (
    <MainLayout>
      
      {/* === HERO CARD CON IMAGEN === */}
      <section className="relative w-full h-[420px] lg:h-[500px] rounded-3xl overflow-hidden mb-8 border border-white/5 shadow-2xl group mx-auto max-w-7xl mt-4">
        {/* Imagen de Fondo */}
        <div className="absolute inset-0">
           <Image 
             src="/hero-bg.jpg" 
             alt="Chido Casino Hero" 
             fill 
             className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
             priority
           />
           {/* Capas de oscurecimiento para lectura */}
           <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
           <div className="absolute inset-0 bg-gradient-to-t from-chido-bg via-transparent to-transparent" />
        </div>
        
        <div className="relative z-20 h-full flex flex-col justify-center px-8 lg:px-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-chido-gold/20 border border-chido-gold/40 text-chido-gold text-xs font-black rounded-full uppercase tracking-wider mb-4 w-fit backdrop-blur-md">
            <Trophy size={14} /> Oferta Exclusiva Nuevos Usuarios
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-white mb-4 italic tracking-tighter leading-[0.9] drop-shadow-xl">
            DUPLICAMOS <br/>
            TU PRIMER DEPÓSITO
          </h1>
          
          <p className="text-zinc-200 mb-8 text-lg font-medium drop-shadow-md max-w-lg">
            Deposita desde $50 y recibe el 100% extra hasta $5,000 MXN. 
            Sin trucos. Retiros automáticos vía Numia.
          </p>
          
          <div className="flex gap-4">
              <Link href="/wallet?deposit=1" className="bg-white text-black px-8 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <Play size={20} fill="currentColor" /> RECLAMAR BONO
              </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-2">
        {/* BARRA ACCIÓN */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-12">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                    <button 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-bold whitespace-nowrap transition-all ${
                        isActive 
                        ? 'bg-chido-pink text-white border-chido-pink shadow-[0_0_15px_rgba(255,0,153,0.3)]' 
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                    >
                    <Icon size={18} /> {cat.label}
                    </button>
                )
                })}
            </div>

            <div className="flex gap-2">
                <input 
                type="text" 
                placeholder="CÓDIGO PROMO" 
                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-chido-cyan outline-none uppercase placeholder:text-zinc-600"
                />
                <button className="bg-zinc-800 hover:bg-chido-cyan hover:text-black text-white px-4 rounded-xl font-bold transition-colors">
                <CheckCircle2 size={20} />
                </button>
            </div>
        </div>

        {/* FEED GANADORES */}
        <div className="mb-8 flex items-center gap-4 overflow-hidden bg-black/40 border border-white/5 rounded-full py-2 px-4 backdrop-blur-sm">
            <span className="text-[10px] font-bold text-chido-green uppercase px-2 whitespace-nowrap animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-chido-green"></span> Ganando Ahora
            </span>
            <div className="flex gap-8 animate-float-horizontal overflow-hidden mask-gradient-x">
                {RECENT_WINNERS.map((win, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-medium text-zinc-400 whitespace-nowrap">
                    <span className="text-white font-bold">{win.user}</span> ganó <span className="text-chido-green font-bold">${win.amount}</span> en {win.game}
                </div>
                ))}
            </div>
        </div>

        {/* GRID JUEGOS */}
        <div className="mb-12">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white mb-6">
            <Star className="text-chido-gold" fill="currentColor" />
            Más Populares en México
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Link href="/games/crash" className="group relative aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 hover:border-chido-cyan transition-all shadow-lg hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                <div className="absolute top-3 right-0 bg-chido-red text-white text-[10px] font-black px-3 py-1 rounded-l-full shadow-lg z-20">HOT</div>
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Zap size={50} className="text-chido-cyan mb-2 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                    <span className="font-black text-xl uppercase italic">CRASH</span>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                    <button className="bg-chido-cyan text-black px-6 py-2 rounded-full font-bold text-sm transform scale-90 group-hover:scale-100 transition-transform">JUGAR</button>
                </div>
            </Link>

            {[1,2,3,4].map((i) => (
                <div key={i} className="aspect-[3/4] bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center justify-center grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer group">
                <span className="text-xs font-bold text-zinc-600 group-hover:text-chido-pink transition-colors">PRÓXIMAMENTE</span>
                </div>
            ))}
            </div>
        </div>
      </div>

      <Footer />

    </MainLayout>
  );
}
