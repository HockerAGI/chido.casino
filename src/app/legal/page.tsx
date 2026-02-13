"use client";
import { MainLayout } from "@/components/layout/main-layout";

export default function LegalPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 text-zinc-300 space-y-6 animate-fade-in">
        <h1 className="text-3xl font-black text-white">Términos y Condiciones</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-sm">Última actualización: 12 de Febrero, 2026</p>
          
          <h3>1. Introducción</h3>
          <p>Bienvenido a CHIDO CASINO. Al usar nuestra plataforma, aceptas estos términos. El servicio es operado por Hocker AGI Technologies bajo licencia en Curazao.</p>
          
          <h3>2. Cuentas y Registro</h3>
          <p>Debes ser mayor de 18 años. Solo se permite una cuenta por persona, hogar o IP. El uso de VPN para eludir restricciones geográficas está prohibido.</p>
          
          <h3>3. Depósitos y Retiros</h3>
          <p>Los depósitos vía SPEI manual se procesan de 9am a 9pm PST. Los retiros requieren verificación KYC aprobada y validación de la cuenta bancaria.</p>
          
          <h3>4. Juego Responsable</h3>
          <p>El juego puede ser adictivo. Ofrecemos herramientas de autoexclusión. Si sientes que pierdes el control, contacta a soporte inmediatamente.</p>
        </div>
      </div>
    </MainLayout>
  );
}