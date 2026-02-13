"use client";

import { Card } from "@/components/ui/card";
import { ScrollText, Shield, Scale, AlertTriangle } from "lucide-react";

export default function LegalPage() {
  return (
    <div className="min-h-screen pb-20">
      
      {/* HEADER SIMPLE */}
      <div className="bg-[#121214] border-b border-white/5 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Centro Legal y Cumplimiento</h1>
          <p className="text-zinc-500">Última actualización: 12 de Febrero, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR DE NAVEGACIÓN (Sticky) */}
        <aside className="w-full md:w-64 flex-shrink-0">
           <nav className="sticky top-24 space-y-1">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#00F0FF]/10 text-[#00F0FF] rounded-xl text-sm font-bold border border-[#00F0FF]/20">
                 <ScrollText size={16} /> Términos de Uso
              </div>
              <div className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                 <Shield size={16} /> Privacidad
              </div>
              <div className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                 <Scale size={16} /> KYC / AML
              </div>
              <div className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                 <AlertTriangle size={16} /> Juego Responsable
              </div>
           </nav>
        </aside>

        {/* CONTENIDO LEGAL */}
        <div className="flex-1 space-y-8">
          
          <Card className="p-8 bg-[#1A1A1D] border-white/5">
             <h2 className="text-xl font-bold text-white mb-6">1. Introducción y Aceptación</h2>
             <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                <p>
                  Bienvenido a CHIDO CASINO ("La Plataforma"). Al registrarse y utilizar nuestros servicios, usted ("El Usuario") acepta estar legalmente vinculado por estos Términos y Condiciones.
                </p>
                <p>
                  Estos servicios son operados por Hocker AGI Technologies bajo licencia internacional de juego. El acceso a la plataforma está estrictamente prohibido para menores de 18 años.
                </p>
             </div>
          </Card>

          <Card className="p-8 bg-[#1A1A1D] border-white/5">
             <h2 className="text-xl font-bold text-white mb-6">2. Cuentas de Usuario</h2>
             <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                <ul className="list-disc pl-5 space-y-2">
                   <li>Solo se permite una cuenta por persona, hogar, dirección IP o dispositivo.</li>
                   <li>El Usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
                   <li>Nos reservamos el derecho de suspender cualquier cuenta que muestre actividad sospechosa, uso de bots o intentos de explotación del sistema.</li>
                </ul>
             </div>
          </Card>

          <Card className="p-8 bg-[#1A1A1D] border-white/5">
             <h2 className="text-xl font-bold text-white mb-6">3. Política Financiera (Depósitos y Retiros)</h2>
             <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                <p>
                  <strong>Depósitos:</strong> Los fondos depositados deben provenir de cuentas a nombre del titular registrado. No se aceptan pagos de terceros.
                </p>
                <p>
                  <strong>Retiros:</strong> Para cumplir con las regulaciones Anti-Lavado de Dinero (AML), todos los depósitos deben ser apostados al menos una vez (Rollover x1) antes de solicitar un retiro.
                </p>
                <p>
                  Los retiros superiores a $10,000 MXN pueden requerir verificación de identidad adicional (KYC Nivel 2).
                </p>
             </div>
          </Card>

          <Card className="p-8 bg-[#1A1A1D] border-white/5">
             <h2 className="text-xl font-bold text-white mb-6">4. Juego Responsable</h2>
             <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                <p>
                  El juego debe ser una forma de entretenimiento, no una forma de ganar dinero. Ofrecemos herramientas de autoexclusión y límites de depósito.
                </p>
                <p>
                  Si siente que el juego está afectando su vida negativamente, contacte a soporte inmediatamente para activar el protocolo de protección al jugador.
                </p>
             </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
