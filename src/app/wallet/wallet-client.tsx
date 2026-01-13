"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { MainLayout } from "@/components/layout/main-layout";
import { cn } from "@/lib/cn";
import { ArrowUpRight, ShieldCheck, AlertCircle, Coins, Lock } from "lucide-react";

export default function WalletClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, userId, formatted } = useWalletBalance();
  const [amount, setAmount] = useState("100");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (params.get("deposit") === "ok") setMsg({ type: 'success', text: "¡Depósito exitoso! Numia está actualizando tu saldo." });
  }, [params]);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }, [amount]);

  const canDeposit = useMemo(() => !creating && !!userId && amountNumber >= 50, [creating, userId, amountNumber]);

  async function createDeposit() {
    setMsg(null);
    if (!canDeposit) return;
    setCreating(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { router.push("/login"); return; }

      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amountNumber }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setMsg({ type: 'error', text: json?.error || "Error de conexión." });
        return;
      }
      window.location.href = json.url;
    } finally { setCreating(false); }
  }

  const quickAmounts = ["100", "200", "500", "1000"];

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
           <div className="p-3 bg-chido-cyan/10 rounded-2xl border border-chido-cyan/20">
             <Coins className="text-chido-cyan" size={32} />
           </div>
           <div>
             <h1 className="text-3xl font-black text-white">Bóveda Numia</h1>
             <p className="text-zinc-500 text-sm font-medium">Gestión financiera atómica en tiempo real.</p>
           </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 p-8 shadow-2xl group">
             <div className="absolute top-0 right-0 p-40 bg-chido-pink/10 blur-3xl rounded-full group-hover:bg-chido-pink/15 transition-colors"></div>
             <div className="absolute bottom-0 left-0 p-32 bg-chido-cyan/10 blur-3xl rounded-full"></div>
             <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
               <div className="flex justify-between items-start">
                  <div className="text-zinc-400 font-bold text-xs uppercase tracking-[0.2em]">Saldo Total</div>
                  <Coins className="text-chido-gold opacity-50" />
               </div>
               <div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">${loading ? "..." : formatted}</span>
                   <span className="text-xl font-bold text-zinc-500">MXN</span>
                 </div>
               </div>
               <div className="flex gap-3 mt-6">
                 <button className="flex-1 bg-white text-black font-black py-3 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-lg">
                   <ArrowUpRight size={18} /> DEPOSITAR
                 </button>
                 <button className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors flex items-center gap-2">
                   <Lock size={16} /> Retirar
                 </button>
               </div>
             </div>
          </div>

          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 backdrop-blur-sm">
             <h2 className="font-bold text-lg text-white mb-6">Cargar Saldo</h2>
             <div className="space-y-4">
               <div>
                 <div className="relative mt-1">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chido-cyan font-black text-xl">$</span>
                   <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-chido-cyan outline-none transition-colors" inputMode="numeric" />
                 </div>
               </div>
               <div className="grid grid-cols-4 gap-2">
                 {quickAmounts.map((val) => (
                   <button key={val} onClick={() => setAmount(val)} className={`py-2 rounded-lg text-xs font-bold transition-all border ${amount === val ? 'bg-chido-cyan text-black border-chido-cyan' : 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'}`}>{val}</button>
                 ))}
               </div>
               {msg && <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${msg.type === 'success' ? 'bg-chido-green/20 text-chido-green' : 'bg-chido-red/20 text-chido-red'}`}>{msg.text}</div>}
               <button onClick={createDeposit} disabled={!canDeposit} className={cn("w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all mt-2", canDeposit ? "bg-gradient-to-r from-chido-cyan to-blue-500 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed")}>{creating ? "Procesando..." : "PAGAR AHORA"}</button>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}