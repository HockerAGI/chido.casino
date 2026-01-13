import { Suspense } from "react";
import WalletClient from "./wallet-client";

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="text-white text-center pt-20">Cargando Bóveda Numia...</div>}>
      <WalletClient />
    </Suspense>
  );
}
