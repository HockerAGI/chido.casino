"use client";

import { useEffect, useState } from "react";

export default function WalletPage() {
  const [cargando, setCargando] = useState(true);
  const [estadoDeposito, setEstadoDeposito] = useState<"idle" | "ok">("idle");

  useEffect(() => {
    setTimeout(() => setCargando(false), 1000);
  }, []);

  if (cargando) {
    return <div className="text-white/70">Cargando billetera...</div>;
  }

  return (
    <div className="space-y-6">
      {estadoDeposito === "ok" && (
        <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-4 text-green-400">
          Depósito iniciado.  
          Si fue OXXO, se acredita cuando Stripe confirma el pago.
        </div>
      )}

      <button
        onClick={() => setEstadoDeposito("ok")}
        className="bg-green-500 text-black px-4 py-2 rounded-xl"
      >
        Simular depósito
      </button>
    </div>
  );
}