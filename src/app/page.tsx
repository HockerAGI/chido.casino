import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  ArrowRight,
  BadgeCheck,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050510] text-white selection:bg-chido-pink/30">
      <div className="hero-overlay" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050510] via-[#050510]/80 to-transparent mix-blend-multiply" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="mb-20 flex items-center justify-between animate-fade-in">
          <Logo variant="full" size={140} />

          <div className="flex gap-4">
            <Link
              href="/login"
              className="hidden rounded-full px-6 py-2.5 text-sm font-bold text-zinc-300 transition-colors hover:text-white md:block"
            >
              Ya tengo cuenta
            </Link>
            <Link
              href="/lobby"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-black text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-colors hover:bg-chido-cyan"
            >
              EXPLORAR PREVIEW
            </Link>
          </div>
        </header>

        <main className="flex max-w-4xl flex-1 flex-col items-start justify-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-chido-cyan/30 bg-chido-cyan/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-chido-cyan shadow-lg backdrop-blur-md animate-fade-in">
            <FlaskConical size={12} /> Prelaunch técnico • Sin dinero real
          </div>

          <h1 className="mb-8 text-6xl font-black leading-[0.9] tracking-tighter drop-shadow-2xl animate-fade-in md:text-9xl">
            JUEGOS <br />
            <span className="bg-gradient-to-r from-chido-cyan to-chido-green bg-clip-text text-transparent">
              ORIGINALES.
            </span>{" "}
            CONTROLADOS.
          </h1>

          <p className="mb-10 max-w-2xl text-xl font-medium leading-relaxed text-zinc-300 drop-shadow-md animate-fade-in md:text-2xl">
            CHIDO está en validación técnica, legal y de seguridad. Puedes
            explorar la experiencia y los juegos disponibles, pero depósitos,
            premios monetarios y operación con dinero real permanecen
            deshabilitados.
          </p>

          <div className="flex w-full flex-col gap-4 animate-fade-in sm:w-auto sm:flex-row">
            <Link
              href="/lobby"
              className="group flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-chido-pink to-chido-red px-10 py-5 text-xl font-black text-white shadow-[0_0_40px_rgba(255,0,153,0.5)] transition-transform hover:scale-105"
            >
              VER EL LOBBY
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/legal"
              className="flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-10 py-5 text-xl font-black text-white transition-colors hover:bg-white/15"
            >
              Estado legal y controles
            </Link>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-white/65 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <ShieldCheck size={16} className="text-[#32CD32]" /> Pagos
              fail-closed
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <BadgeCheck size={16} className="text-[#00F0FF]" /> KYC y
              autoexclusión
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <FlaskConical size={16} className="text-[#FFD700]" /> Preview
              sujeto a pruebas
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
