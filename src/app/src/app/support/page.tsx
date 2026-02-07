"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { MessageCircleHeart, Mail, ShieldAlert } from "lucide-react";

export default function SupportPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-chido-cyan/10 rounded-2xl border border-chido-cyan/20">
            <MessageCircleHeart className="text-chido-cyan" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Soporte</h1>
            <p className="text-zinc-500 text-sm font-medium">Ayuda, verificación, disputas y seguridad.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6">
            <div className="text-white font-black flex items-center gap-2">
              <Mail size={18} /> Contacto
            </div>
            <p className="text-zinc-400 text-sm mt-2">
              Si estás integrando un canal (WhatsApp/Telegram/Email), aquí lo conectas.
            </p>
            <div className="mt-4 text-xs text-zinc-500">
              Recomendado: tickets + SLA + logs de transacciones.
            </div>
          </div>

          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6">
            <div className="text-white font-black flex items-center gap-2">
              <ShieldAlert size={18} /> Reportar problema
            </div>
            <p className="text-zinc-400 text-sm mt-2">
              Depósito no reflejado, retiro pendiente, o bug visual. Incluye ID de transacción si aplica.
            </p>
            <div className="mt-4 text-xs text-zinc-500">
              (Cuando metas Admin Panel, aquí cae directo al backoffice.)
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <Footer />
      </div>
    </MainLayout>
  );
}