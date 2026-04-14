import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, Flame, ShieldCheck, Wallet, Crown, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden relative selection:bg-chido-pink/30">
      <div className="hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050510] via-[#050510]/80 to-transparent mix-blend-multiply z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex flex-col min-h-screen">
        <header className="flex justify-between items-center mb-20 animate-fade-in">
          <Logo variant="full" size={140} />

          <div className="flex gap-4">
            <Link
              href="/login"
              className="hidden md:block px-6 py-2.5 rounded-full text-sm font-bold text-zinc-300 hover:text-white transition-colors"
            >
              Ya tengo cuenta
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-black hover:bg-chido-cyan transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              REGISTRARME
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center items-start max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-chido-pink/30 bg-chido-pink/10 text-chido-pink text-xs font-black tracking-widest uppercase mb-6 backdrop-blur-md animate-fade-in shadow-lg">
            <Flame size={12} className="animate-pulse" /> Chido Casino • Lanzamiento
          </div>

          <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] mb-8 animate-fade-in drop-shadow-2xl">
            JUEGA. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-chido-cyan to-chido-green">
              COBRA.
            </span>{" "}
            REPITE.
          </h1>

          <p className="text-xl md:text-2xl text-zinc-300 mb-10 max-w-xl leading-relaxed animate-fade-in font-medium drop-shadow-md">
            Juegos originales, bonos claros y una wallet lista para depósitos, retiros y control en vivo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in w-full sm:w-auto">
            <Link
              href="/signup"
              className="px-10 py-5 rounded-full bg-gradient-to-r from-chido-pink to-chido-red text-white font-black text-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,0,153,0.5)] flex items-center justify-center gap-3 group"
            >
              ENTRAR
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/lobby"
              className="px-10 py-5 rounded-full bg-white/10 border border-white/10 text-white font-black text-xl hover:bg-white/15 transition-colors flex items-center justify-center"
            >
              Ver lobby
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 text-sm text-white/65">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#32CD32]" /> KYC para retiros
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-2">
              <Wallet size={16} className="text-[#00F0FF]" /> Wallet en vivo
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-2">
              <Crown size={16} className="text-[#FFD700]" /> VIP y promociones
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}