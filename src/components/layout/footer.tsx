import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0b0b0d]">
      <div className="mx-auto max-w-6xl px-6 py-10 grid gap-8 md:grid-cols-3">
        <div>
          {/* iso-bw = footer */}
          <div className="flex items-center gap-3">
            <Logo variant="iso-bw" size={34} />
            <div className="text-sm font-black">Chido Casino</div>
          </div>
          <div className="mt-3 text-xs text-white/55 leading-relaxed">
            Plataforma de entretenimiento con juegos originales, bonos reales y Chido Wallet.
          </div>
          <div className="mt-3 text-[11px] text-white/40">18+ • Juega responsable</div>
        </div>

        <div className="text-sm">
          <div className="text-xs uppercase tracking-widest text-white/45 font-black">Navegación</div>
          <div className="mt-3 grid gap-2 text-white/70">
            <Link href="/lobby" className="hover:text-white">Lobby</Link>
            <Link href="/promos" className="hover:text-white">Bonos y Promos</Link>
            <Link href="/vip" className="hover:text-white">VIP Club</Link>
            <Link href="/tournaments" className="hover:text-white">Torneos</Link>
            <Link href="/wallet" className="hover:text-white">Chido Wallet</Link>
            <Link href="/affiliates" className="hover:text-white">Afiliados</Link>
            <Link href="/support" className="hover:text-white">Soporte</Link>
          </div>
        </div>

        <div className="text-sm">
          <div className="text-xs uppercase tracking-widest text-white/45 font-black">Legal</div>
          <div className="mt-3 grid gap-2 text-white/70">
            <Link href="/legal" className="hover:text-white">Términos / Privacidad</Link>
            <Link href="/legal#responsible" className="hover:text-white">Juego responsable</Link>
          </div>

          <div className="mt-4 text-[11px] text-white/40 leading-relaxed">
            Operación / Admin: Hocker AGI Technologies.  
            Para retiros se exige KYC aprobado (regla aplicada por backend).
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 py-4 text-center text-[11px] text-white/35">
        © {new Date().getFullYear()} Chido Casino • All rights reserved.
      </div>
    </footer>
  );
}