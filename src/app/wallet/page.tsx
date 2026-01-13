import { Suspense } from "react";
import WalletClient from "./wallet-client";

// ESTA LÍNEA EVITA EL ERROR DE BUILD EN VERCEL
export const dynamic = "force-dynamic";

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-[#050510]">Cargando Bóveda Numia...</div>}>
      <WalletClient />
    </Suspense>
  );
}