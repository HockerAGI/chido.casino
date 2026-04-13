import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const adminHref = process.env.NEXT_PUBLIC_HOCKER_ONE_URL || process.env.HOCKER_ONE_URL || "";
const adminEnabled = Boolean(adminHref);

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#09090c]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Logo variant="iso-bw" size={34} />
              <div>
                <div className="text-sm font-black tracking-wide text-white">Chido Casino</div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">Juega chido</div>
              </div>
            </div>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
              Plataforma de entretenimiento con juegos originales, bonos reales, sala VIP y Chido Wallet para operación rápida.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">18+</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Juega responsable</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">KYC para retiros</span>
            </div>

            {adminEnabled && (
              <a
                href={adminHref}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/8 px-4 py-3 text-sm font-bold text-[#00F0FF] transition hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/12"
              >
                Hocker One <ArrowUpRight size={16} />
              </a>
            )}
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-white/40">Navegación</div>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              <Link href="/lobby" className="hover:text-white">Lobby</Link>
              <Link href="/promos" className="hover:text-white">Promos</Link>
              <Link href="/vip" className="hover:text-white">VIP Club</Link>
              <Link href="/wallet" className="hover:text-white">Chido Wallet</Link>
              <Link href="/support" className="hover:text-white">Soporte</Link>
              <Link href="/affiliates" className="hover:text-white">Afiliados</Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-white/40">Legal</div>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              <Link href="/terms" className="hover:text-white">Términos</Link>
              <Link href="/privacy" className="hover:text-white">Privacidad</Link>
              <Link href="/legal" className="hover:text-white">Aviso legal</Link>
              <Link href="/legal#responsible" className="hover:text-white">Juego responsable</Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-white/40">Operación</div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <ShieldCheck size={16} className="text-[#32CD32]" />
                HOCKER / NOVA
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                El panel de administración vive dentro del ecosistema HOCKER, con NOVA como núcleo orquestador.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-white/40">
                <Sparkles size={12} className="text-[#FF0099]" />
                Diseñado para operar con trazabilidad, control y velocidad.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-5 text-center text-[11px] text-white/35">
          © {year} Chido Casino. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}