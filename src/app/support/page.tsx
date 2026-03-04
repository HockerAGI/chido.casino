"use client";

import { Card } from "@/components/ui/card";
import { HelpCircle, MessageCircle, Mail, FileText, ShieldAlert, ChevronRight } from "lucide-react";

export default function SupportPage() {
  // Defaults actuales del repo (si no configuras env públicos)
  const whatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "526642368701";
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "soporte@chido.casino";

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Soporte CHIDO: necesito ayuda con mi cuenta / depósito / retiro.")}`
    : "";

  return (
    <div className="min-h-screen pb-20">
      <div className="relative bg-[#121214] border-b border-white/5 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-bold uppercase tracking-widest mb-6 border border-[#00F0FF]/20">
            <HelpCircle size={12} /> Centro de Ayuda
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Soporte <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0099FF]">real</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-2">
            Para depósitos, retiros, KYC o cualquier duda. No vendemos humo: si algo está manual, aquí se dice.
          </p>
          <p className="text-xs text-white/45 max-w-2xl mx-auto">
            Recomendación: incluye tu correo de registro + folio/ID cuando sea depósito o retiro.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-12">
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageCircle className="text-[#00F0FF]" size={20} /> Contacto Directo
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1D] to-[#121214] border border-white/5 p-8 transition-all hover:border-[#25D366]/50 hover:shadow-[0_0_30px_rgba(37,211,102,0.1)]"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageCircle size={100} />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center mb-4 border border-[#25D366]/20">
                  <MessageCircle size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">WhatsApp</h3>
                <p className="text-zinc-400 mb-6 text-sm">
                  Para depósitos, validaciones y soporte rápido.
                </p>
                <div className="flex items-center gap-2 text-[#25D366] font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                  Abrir Chat <ChevronRight size={16} />
                </div>
                <div className="mt-3 text-[11px] text-white/45">Número: {whatsapp}</div>
              </div>
            </a>

            <a
              href={`mailto:${email}`}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1A1D] to-[#121214] border border-white/5 p-8 transition-all hover:border-[#00F0FF]/50 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Mail size={100} />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center mb-4 border border-[#00F0FF]/20">
                  <Mail size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Correo</h3>
                <p className="text-zinc-400 mb-6 text-sm">
                  Para temas formales: cuentas, disputas, aclaraciones.
                </p>
                <div className="flex items-center gap-2 text-[#00F0FF] font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                  Enviar Correo <ChevronRight size={16} />
                </div>
                <div className="mt-3 text-[11px] text-white/45">{email}</div>
              </div>
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="text-[#FF0099]" size={20} /> FAQ (sin inventar)
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <ShieldAlert size={16} className="text-zinc-500" /> Depósitos SPEI
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                El depósito se genera con folio e instrucciones. Si no se refleja, soporte lo valida con tu folio + comprobante.
              </p>
            </Card>

            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <ShieldAlert size={16} className="text-zinc-500" /> Retiros
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Para retirar necesitas KYC aprobado. El retiro bloquea tu saldo mientras se procesa.
              </p>
            </Card>

            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <ShieldAlert size={16} className="text-zinc-500" /> Juegos “Provably Fair”
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Crash y Taco Slot guardan seeds/hash para verificación. No usamos “blockchain” aquí: es verificación criptográfica directa.
              </p>
            </Card>

            <Card className="p-6 bg-[#1A1A1D] border-white/5 hover:border-white/10 transition-colors">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <ShieldAlert size={16} className="text-zinc-500" /> Disputas
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Envía ID/folio y evidencia. Se revisan logs del servidor y transacciones de la wallet.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}