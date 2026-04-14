import { Suspense } from "react";
import WalletClient from "./wallet-client";

export const dynamic = "force-dynamic";

export default function WalletPage() {
  return (
    <div className="min-h-screen pb-20 pt-4 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Wallet</h1>
          <p className="text-sm text-white/45 mt-1">
            Deposita, retira y revisa tu saldo en tiempo real.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center gap-3 text-white/50 text-sm py-20 justify-center">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
              Cargando wallet...
            </div>
          }
        >
          <WalletClient />
        </Suspense>
      </div>
    </div>
  );
}