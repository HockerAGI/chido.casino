import { Suspense } from "react";
import WalletClient from "./wallet-client";

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#06070b] text-white flex items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm">
            Cargando wallet…
          </div>
        </div>
      }
    >
      <WalletClient />
    </Suspense>
  );
}