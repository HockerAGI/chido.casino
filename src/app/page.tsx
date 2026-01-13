import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, Zap, ShieldCheck, Coins } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden relative selection:bg-chido-pink/30">
      
      {/* Fondo Animado Alebrije */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-chido-pink/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-chido-cyan/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-mexican-pattern opacity-10" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 flex flex-col min-h-screen">
        
        {/* Nav Header */}
        <header className="flex justify-between items-center mb-16 lg:mb-24">
          <Logo size={40} showText={true} />
          <div className="flex gap-4">
            <Link 
              href="/login" 
              className="hidden md:block px-6 py-2 rounded-full text-sm font-bold text-zinc-300 hover:text-white transition-colors"
            >
              Ya tengo cuenta
            </Link>
            <Link 
              href="/signup" 
              className="px-6 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-chido-cyan transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              Registrarme
            </Link>
          </div>
        </header>

        {/* Hero Section Comercial */}
        <main className="flex-1 flex flex-col justify-center items-start max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-chido-gold/30 bg-chido-gold/10 text-chido-gold text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-chido-gold animate-pulse" />
            El Casino de México #1
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.95] mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            TU SUERTE <br />
            NO ESPERA. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-chido-pink via-chido-cyan to-white">JUEGA EN GRANDE.</span>
          </h1>
          
          <p className="text-xl text-zinc-300 mb-10 max-w-xl leading-relaxed animate-fade-in font-medium" style={{ animationDelay: '0.2s' }}>
            Vive la experiencia de casino más rápida y segura. 
            Retiros inmediatos, juegos exclusivos y la mejor tecnología para que solo te preocupes por ganar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in w-full sm:w-auto" style={{ animationDelay: '0.3s' }}>
            <Link 
              href="/signup" 
              className="px-8 py-5 rounded-full bg-gradient-to-r from-chido-pink to-chido-red text-white font-black text-lg hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,0,153,0.4)] flex items-center justify-center gap-2 group"
            >
              EMPEZAR A GANAR
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/lobby" 
              className="px-8 py-5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md font-bold text-lg hover:bg-white/10 transition-colors text-center"
            >
              Solo quiero mirar
            </Link>
          </div>
        </main>

        {/* Features Footer con AGIs Sutiles */}
        <footer className="grid md:grid-cols-3 gap-8 border-t border-white/10 pt-12 mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
               <Coins className="text-chido-green" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border border-white/10 px-2 rounded-md">Powered by Numia</span>
            </div>
            <h3 className="font-bold text-white text-lg">Pagos Instantáneos</h3>
            <p className="text-sm text-zinc-400">Deposita y retira tus ganancias en segundos. Sin letras chiquitas.</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
               <ShieldCheck className="text-chido-cyan" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border border-white/10 px-2 rounded-md">Vertx Protected</span>
            </div>
            <h3 className="font-bold text-white text-lg">Seguridad Total</h3>
            <p className="text-sm text-zinc-400">Tus datos y tu dinero blindados con la mejor tecnología del mercado.</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
               <Zap className="text-chido-gold" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border border-white/10 px-2 rounded-md">Originals</span>
            </div>
            <h3 className="font-bold text-white text-lg">Juegos Exclusivos</h3>
            <p className="text-sm text-zinc-400">Disfruta de Crash, Plinko y Mines. Diseñados para ganar más.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
