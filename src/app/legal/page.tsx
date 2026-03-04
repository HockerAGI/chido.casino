"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ScrollText, Shield, Scale, AlertTriangle, ChevronRight } from "lucide-react";

export default function LegalPage() {
  return (
    <div className="min-h-screen pb-24">
      <div className="bg-[#121214] border-b border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Legal & Cumplimiento</h1>
          <p className="mt-2 text-white/55 text-sm">
            Este documento describe reglas reales de uso según el sistema implementado (KYC para retiros, promos con rollover, antifraude, etc.).
          </p>
          <div className="mt-4">
            <Link href="/lobby" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
              Volver al lobby <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-[240px_1fr] gap-6">
        {/* NAV */}
        <aside className="md:sticky md:top-24 h-fit">
          <Card className="bg-black/30 border-white/10 p-3 rounded-3xl">
            <a href="#terms" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-sm font-bold">
              <ScrollText size={16} /> Términos
            </a>
            <a href="#privacy" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-sm font-bold">
              <Shield size={16} /> Privacidad
            </a>
            <a href="#kyc" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-sm font-bold">
              <Scale size={16} /> KYC / AML
            </a>
            <a href="#responsible" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-sm font-bold">
              <AlertTriangle size={16} /> Juego Responsable
            </a>
          </Card>
        </aside>

        {/* CONTENT */}
        <div className="space-y-6">
          <Card id="terms" className="bg-black/30 border-white/10 p-6 rounded-3xl">
            <h2 className="text-xl font-black mb-3">1) Términos de uso (real)</h2>
            <div className="text-sm text-white/70 space-y-3 leading-relaxed">
              <p>
                CHIDO es una plataforma de entretenimiento. Debes ser mayor de edad (18+). Si eres menor, no uses el sistema.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>1 cuenta por persona. Multicuenta/abuso puede causar bloqueo de cuenta y/o reversión de bonos.</li>
                <li>Promos: 1 promo activa por usuario a la vez (regla implementada en backend).</li>
                <li>Pagos: por ahora el sistema implementa depósitos SPEI manuales/Bitso-Juno según configuración.</li>
              </ul>
            </div>
          </Card>

          <Card id="privacy" className="bg-black/30 border-white/10 p-6 rounded-3xl">
            <h2 className="text-xl font-black mb-3">2) Privacidad</h2>
            <div className="text-sm text-white/70 space-y-3 leading-relaxed">
              <p>
                El sistema almacena datos mínimos necesarios para operar: cuenta, wallet, transacciones y métricas antifraude.
              </p>
              <p>
                Afiliados: los clicks pueden registrarse con hash de IP (no se guarda la IP en claro si hay salt configurado).
              </p>
            </div>
          </Card>

          <Card id="kyc" className="bg-black/30 border-white/10 p-6 rounded-3xl">
            <h2 className="text-xl font-black mb-3">3) KYC / AML (implementado)</h2>
            <div className="text-sm text-white/70 space-y-3 leading-relaxed">
              <p>
                Para solicitar retiros, el sistema exige KYC aprobado (bloqueo real en /api/payments/withdraw).
              </p>
              <p>
                Si necesitas KYC, solicítalo en <Link className="underline" href="/support">Soporte</Link>.
              </p>
            </div>
          </Card>

          <Card id="responsible" className="bg-black/30 border-white/10 p-6 rounded-3xl">
            <h2 className="text-xl font-black mb-3">4) Juego responsable</h2>
            <div className="text-sm text-white/70 space-y-3 leading-relaxed">
              <p>
                Juega por entretenimiento. Si sientes que pierdes control, pausa y contacta soporte para medidas manuales (bloqueo/limitación).
              </p>
              <p className="text-xs text-white/50">
                Nota: límites automáticos y autoexclusión “en UI” no se prometen aquí si no están desplegados.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}