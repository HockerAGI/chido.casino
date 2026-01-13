import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, Zap, ShieldCheck, Coins, Flame } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden relative selection:bg-chido-pink/30">
      
      {/* Fondo Hero Cyber-Tenochtitlan */}
      <div className="absolute inset-0 z-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050510] via-[#050510]/80 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex flex-col min-h-screen">
        
        {/* NAV */}
        <header className="flex justify-between items-center mb-20 animate-fade-in">
          <Logo size={50} showText={true} />
          <div className="flex gap-4">
            <Link href="/login" className="hidden md:block px-6 py-2.5 rounded-full text-sm font-bold text-zinc-300 hover:text-white transition-colors">
              Ya tengo cuenta
            </Link>
            <Link href="/signup" className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-black hover:bg-chido-cyan transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              REGISTRARME
            </Link>
          </div>
        </header>

        {/* HERO COPY */}
        <main className="flex-1 flex flex-col justify-center items-start max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-chido-pink/30 bg-chido-pink/10 text-chido-pink text-xs font-black tracking-widest uppercase mb-6 backdrop-blur-md animate-fade-in shadow-lg">
            <Flame size={12} className="animate-pulse" /> ¡Qué onda! Llegó el patrón.
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] mb-8 animate-fade-in drop-shadow-2xl" style={{ animationDelay: '0.1s' }}>
            JUEGA CHIDO. <br />
            GANA <span className="text-transparent bg-clip-text bg-gradient-to-r from-chido-cyan to-chido-green">RÁPIDO.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-300 mb-10 max-w-xl leading-relaxed animate-fade-in font-medium" style={{ animationDelay: '0.2s' }}>
            Olvídate de los casinos lentos. Aquí hay retiros al instante, juegos originales y bonos que sí pagan. 
            <span className="text-white font-bold block mt-2">¿Le entras o te da frío?</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in w-full sm:w-auto" style={{ animationDelay: '0.3s' }}>
            <Link 
              href="/signup" 
              className="px-10 py-5 rounded-full bg-gradient-to-r from-chido-pink to-chido-red text-white font-black text-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,0,153,0.5)] flex items-center justify-center gap-3 group"
            >
              QUIERO MI BONO
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="flex flex-col justify-center items-start sm:items-center pl-2">
               <span className="text-xs font-bold text-chido-green uppercase tracking-wide">Bono de Bienvenida</span>
               <span className="text-sm font-bold text-white">200% hasta $5,000 MXN</span>
            </div>
          </div>
        </main>

        {/* FOOTER FEATURES */}
        <footer className="grid md:grid-cols-3 gap-8 border-t border-white/10 pt-12 mt-12 animate-fade-in pb-8" style={{ animationDelay: '0.4s' }}>
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors group">
            <div className="w-12 h-12 bg-chido-green/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <Coins className="text-chido-green" size={24} />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Pagos "En Fa"</h3>
            <p className="text-sm text-zinc-400">Tu lana es tuya. Retira tus ganancias en segundos directo a tu cuenta.</p>
          </div>
          
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors group">
            <div className="w-12 h-12 bg-chido-cyan/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <ShieldCheck className="text-chido-cyan" size={24} />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Seguridad Vertx</h3>
            <p className="text-sm text-zinc-400">Infraestructura blindada. Tus datos no se tocan, tu suerte se respeta.</p>
          </div>
          
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors group">
            <div className="w-12 h-12 bg-chido-gold/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <Zap className="text-chido-gold" size={24} />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Originals Picantes</h3>
            <p className="text-sm text-zinc-400">Juegos exclusivos como Crash y Plinko con multiplicadores locos.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
