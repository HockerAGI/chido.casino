"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Play, Zap, Star, ShieldCheck, Flame, Gift, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

// Categorías de Juegos (Punto 5)
const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Search },
  { id: 'slots', label: 'Slots', icon: Flame },
  { id: 'crash', label: 'Crash', icon: Zap },
  { id: 'live', label: 'En Vivo', icon: Users }, // Placeholder
  { id: 'originals', label: 'Originals', icon: Star },
];

// Simulador de Ganadores (Punto 11)
const RECENT_WINNERS = [
  { user: "Juan P.", game: "Chido Crash", amount: 4500 },
  { user: "Maria L.", game: "Slots", amount: 1200 },
  { user: "Carlos X.", game: "Plinko", amount: 850 },
];

export default function LobbyPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [promoCode, setPromoCode] = useState('');

  return (
    <MainLayout>
      
      {/* === 2. HERO SECTION (Zona de impacto) === */}
      <section className="relative w-full h-[420px] lg:h-[500px] rounded-3xl overflow-hidden mb-8 border border-white/5 shadow-2xl group">
        {/* Fondo con "Toque Mexicano Cyberpunk" */}
        <div className="absolute inset-0 bg-zinc-900">
           {/* Gradiente Alebrije */}
           <div className="absolute top-[-50%] right-[-20%] w-[800px] h-[800px] bg-chido-pink/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
           <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-chido-cyan/10 blur-[100px] rounded-full mix-blend-screen" />
           <div className="absolute inset-0 bg-mexican-pattern opacity-10" />
        </div>
        
        <div className="relative z-20 h-full flex flex-col justify-center px-6 lg:px-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-chido-gold/20 border border-chido-gold/40 text-chido-gold text-xs font-black rounded-full uppercase tracking-wider mb-4 w-fit">
            <Trophy size={14} /> Bono de Bienvenida
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-white mb-4 italic tracking-tighter leading-[0.9] drop-shadow-xl">
            100% HASTA <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-chido-cyan to-chido-pink">$5,000 MXN</span>
          </h1>
          
          <p className="text-zinc-300 mb-8 text-lg font-medium drop-shadow-md">
            Duplicamos tu primer depósito. Juega Crash, Slots y más con la velocidad de Hocker AGI.
          </p>
          
          <div className="flex gap-4">
              <Link href="/wallet?deposit=1" className="bg-white text-black px-8 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <Play size={20} fill="currentColor" /> DEPOSITAR Y JUGAR
              </Link>
              <button className="px-8 py-4 rounded-full border border-white/20 bg-black/20 backdrop-blur-md font-bold hover:bg-white/10 transition-colors">
                  Ver Detalles
              </button>
          </div>
        </div>
      </section>

      {/* === 3. BARRA RÁPIDA DE ACCIONES === */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-12">
         {/* Filtros de Categoría */}
         <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button 
                  key={cat.id} 
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-bold whitespace-nowrap transition-all ${
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

         {/* Input Código Promocional (Punto 7) */}
         <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="CÓDIGO PROMO" 
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-chido-cyan outline-none uppercase placeholder:text-zinc-600"
            />
            <button className="bg-zinc-800 hover:bg-chido-cyan hover:text-black text-white px-4 rounded-xl font-bold transition-colors">
              <Zap size={20} />
            </button>
         </div>
      </div>

      {/* === 11. FEED DE GANADORES (Prueba Social) === */}
      <div className="mb-8 flex items-center gap-4 overflow-hidden bg-black/20 border-y border-white/5 py-2">
         <span className="text-[10px] font-bold text-chido-green uppercase px-4 whitespace-nowrap animate-pulse">● Pagos en Vivo</span>
         <div className="flex gap-8 animate-float-horizontal">
            {RECENT_WINNERS.map((win, i) => (
               <div key={i} className="flex items-center gap-2 text-xs font-medium text-zinc-400 whitespace-nowrap">
                  <span className="text-white">{win.user}</span> ganó <span className="text-chido-green font-bold">${win.amount}</span> en {win.game}
               </div>
            ))}
         </div>
      </div>

      {/* === 4. JUEGOS DESTACADOS === */}
      <div className="mb-12">
        <h2 className="text-2xl font-black flex items-center gap-3 text-white mb-6">
          <Star className="text-chido-gold" fill="currentColor" />
          Hocker Originals & Favoritos
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Card: Crash (Featured) */}
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

          {/* Placeholders Slots */}
          {[1,2,3,4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-zinc-900 rounded-2xl border border-white/5 flex flex-col items-center justify-center grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer">
               <span className="text-xs font-bold text-zinc-600">PRÓXIMAMENTE</span>
            </div>
          ))}
        </div>
      </div>

      {/* === 10. CONFIANZA Y SEGURIDAD === */}
      <section className="bg-zinc-900/50 rounded-3xl p-8 border border-white/5 mb-20 text-center">
         <h3 className="text-lg font-bold text-white mb-6">Casino Oficial Certificado</h3>
         <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex flex-col items-center gap-2"><ShieldCheck size={32} /> <span className="text-[10px]">SSL Secure</span></div>
            <div className="flex flex-col items-center gap-2"><Zap size={32} /> <span className="text-[10px]">RNG Certified</span></div>
            <div className="flex flex-col items-center gap-2"><Users size={32} /> <span className="text-[10px]">+18 Only</span></div>
         </div>
      </section>

      {/* === 14. FOOTER COMPLETO === */}
      <footer className="border-t border-white/10 pt-16 pb-8 text-zinc-500 text-sm">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
           <div>
              <h4 className="font-bold text-white mb-4">Casino</h4>
              <ul className="space-y-2 text-xs">
                 <li>Juegos</li>
                 <li>Originals</li>
                 <li>Torneos</li>
              </ul>
           </div>
           <div>
              <h4 className="font-bold text-white mb-4">Soporte</h4>
              <ul className="space-y-2 text-xs">
                 <li>Chat en Vivo</li>
                 <li>Centro de Ayuda</li>
                 <li>Juego Responsable</li>
              </ul>
           </div>
           <div>
              <h4 className="font-bold text-white mb-4">Comunidad</h4>
              <ul className="space-y-2 text-xs">
                 <li>Afiliados</li>
                 <li>Blog</li>
                 <li>Redes Sociales</li>
              </ul>
           </div>
           <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-xs">
                 <li>Términos y Condiciones</li>
                 <li>Privacidad</li>
                 <li>KYC / AML</li>
              </ul>
           </div>
        </div>
        <div className="text-center pt-8 border-t border-white/5">
           <p className="text-xs">© 2026 Chido Casino. Orgullosamente Mexicano 🇲🇽. Hocker AGI Tech.</p>
        </div>
      </footer>

    </MainLayout>
  );
}
