"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { MainLayout } from "@/components/layout/main-layout"; // <--- INTEGRACIÓN CLAVE
import { cn } from "@/lib/cn";
import { CreditCard, ArrowUpRight, ShieldCheck, AlertCircle } from "lucide-react";

function SoftSpinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
  );
}

export default function WalletClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, userId, formatted, currency } = useWalletBalance();

  const [amount, setAmount] = useState("100");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const depositFlag = params.get("deposit");

  useEffect(() => {
    if (depositFlag === "ok") setMsg({ type: 'success', text: "Depósito iniciado. Esperando confirmación de Stripe..." });
    if (depositFlag === "cancel") setMsg({ type: 'error', text: "Depósito cancelado por el usuario." });
    if (depositFlag === "1") setMsg(null);
  }, [depositFlag]);

  // Validar sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }, [amount]);

  const canDeposit = useMemo(() => {
    return !creating && !!userId && amountNumber >= 50 && amountNumber <= 50000;
  }, [creating, userId, amountNumber]);

  async function createDeposit() {
    setMsg(null);
    if (!canDeposit) return;

    setCreating(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amountNumber }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setMsg({ type: 'error', text: json?.error || "Error al conectar con la pasarela de pago." });
        return;
      }

      window.location.href = json.url;
    } finally {
      setCreating(false);
    }
  }

  // Pre-sets de depósito rápido
  const quickAmounts = ["100", "200", "500", "1000"];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <CreditCard className="text-chido-cyan" />
          Bóveda
        </h1>
        <p className="text-zinc-500 mb-8 text-sm">Gestión de activos en tiempo real · Numia Engine</p>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* TARJETA DE BALANCE PRINCIPAL */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-8 shadow-2xl group">
             <div className="absolute top-0 right-0 p-32 bg-chido-cyan/5 blur-3xl rounded-full group-hover:bg-chido-cyan/10 transition-colors"></div>
             
             <div className="relative z-10">
               <div className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-2">Saldo Total Disponible</div>
               <div className="flex items-baseline gap-2">
                 <span className="text-5xl font-black text-white tracking-tighter">${loading ? "..." : formatted}</span>
                 <span className="text-xl font-bold text-chido-cyan">{currency}</span>
               </div>
               
               <div className="mt-8 flex gap-3">
                 <button className="flex-1 bg-white text-black font-black py-3 rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2">
                   <ArrowUpRight size={18} /> DEPOSITAR
                 </button>
                 <button className="px-6 py-3 rounded-xl border border-white/10 text-zinc-300 font-bold hover:bg-white/5 transition-colors">
                   Retirar
                 </button>
               </div>
             </div>
          </div>

          {/* FORMULARIO DE DEPÓSITO */}
          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 backdrop-blur-sm">
             <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg text-white">Ingresar Fondos</h2>
                <span className="text-xs text-chido-green flex items-center gap-1 bg-chido-green/10 px-2 py-1 rounded-full">
                  <ShieldCheck size={12} /> Stripe Secure
                </span>
             </div>

             <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Monto (MXN)</label>
                 <div className="relative mt-1">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                   <input
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
                     className="w-full bg-black border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-xl focus:border-chido-cyan outline-none transition-colors"
                     inputMode="numeric"
                   />
                 </div>
               </div>

               {/* Botones rápidos */}
               <div className="grid grid-cols-4 gap-2">
                 {quickAmounts.map((val) => (
                   <button 
                     key={val}
                     onClick={() => setAmount(val)}
                     className={`py-2 rounded-lg text-xs font-bold transition-all ${amount === val ? 'bg-chido-cyan text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                   >
                     ${val}
                   </button>
                 ))}
               </div>

               {msg && (
                 <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${
                   msg.type === 'success' ? 'bg-chido-green/10 text-chido-green border border-chido-green/20' : 
                   msg.type === 'error' ? 'bg-chido-red/10 text-chido-red border border-chido-red/20' : 
                   'bg-white/5 text-zinc-300'
                 }`}>
                   {msg.type === 'error' && <AlertCircle size={16} />}
                   {msg.text}
                 </div>
               )}

               <button
                 onClick={createDeposit}
                 disabled={!canDeposit}
                 className={cn(
                   "w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all active:scale-[0.98]",
                   canDeposit
                     ? "bg-gradient-to-r from-chido-cyan to-blue-500 text-black hover:brightness-110 shadow-chido-cyan/20"
                     : "bg-white/5 text-white/20 cursor-not-allowed"
                 )}
               >
                 {creating ? (
                   <span className="inline-flex items-center gap-2"><SoftSpinner /> Procesando...</span>
                 ) : (
                   "PAGAR AHORA"
                 )}
               </button>
               
               <p className="text-center text-[10px] text-zinc-600">
                 Límites: $50.00 - $50,000.00 MXN. Procesado vía Stripe.
               </p>
             </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
