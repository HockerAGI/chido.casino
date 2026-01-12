import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, Zap, Shield, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden relative selection:bg-chido-cyan/30">
      
      {/* Fondo Animado (CSS puro en globals) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-chido-cyan/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-chido-red/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col min-h-screen">
        
        {/* Nav Header */}
        <header className="flex justify-between items-center mb-20">
          <Logo size={40} showText={true} />
          <Link 
            href="/login" 
            className="px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-bold hover:bg-white/10 transition-colors"
          >
            Acceso Socios
          </Link>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col justify-center items-start max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-chido-cyan/30 bg-chido-cyan/5 text-chido-cyan text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-chido-cyan animate-pulse" />
            Sistema Hocker AGI Activo
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            EL FUTURO <br />
            NO SE JUEGA. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-chido-cyan via-white to-white">SE CONQUISTA.</span>
          </h1>
          
          <p className="text-xl text-zinc-400 mb-10 max-w-xl leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Bienvenido al primer Nodo de Casino Operado por Inteligencia Artificial. 
            Sin intermediarios. Sin latencia. Pura adrenalina matemática.
          </p>

          <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link 
              href="/signup" 
              className="px-8 py-4 rounded-full bg-white text-black font-black text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-2 group"
            >
              INICIAR PROTOCOLO
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/lobby" 
              className="px-8 py-4 rounded-full border border-white/20 bg-white/5 backdrop-blur-md font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Explorar Demo
            </Link>
          </div>
        </main>

        {/* Features Footer */}
        <footer className="grid md:grid-cols-3 gap-8 border-t border-white/10 pt-12 mt-20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="space-y-2">
            <Cpu className="text-chido-cyan mb-2" />
            <h3 className="font-bold text-white">Numia Engine</h3>
            <p className="text-sm text-zinc-500">Gestión financiera atómica en tiempo real. Cero errores de saldo.</p>
          </div>
          <div className="space-y-2">
            <Shield className="text-chido-gold mb-2" />
            <h3 className="font-bold text-white">Vertx Security</h3>
            <p className="text-sm text-zinc-500">Protección biométrica y de comportamiento server-side.</p>
          </div>
          <div className="space-y-2">
            <Zap className="text-chido-red mb-2" />
            <h3 className="font-bold text-white">Cero Latencia</h3>
            <p className="text-sm text-zinc-500">Infraestructura Edge optimizada para velocidad milimétrica.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
