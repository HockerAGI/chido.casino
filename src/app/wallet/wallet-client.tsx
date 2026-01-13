"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/cn";
import { ArrowUpRight, ShieldCheck, AlertCircle, Coins, Lock, CreditCard, Banknote } from "lucide-react";

export default function WalletClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, userId, formatted } = useWalletBalance();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState("100");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Inicializar tab según URL
  useEffect(() => {
    if (params.get("deposit") === "ok") setMsg({ type: 'success', text: "¡Depósito exitoso! Numia está procesando tu saldo." });
    if (params.get("action") === "withdraw") setActiveTab('withdraw');
  }, [params]);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }, [amount]);

  // Lógica Depósito
  async function createDeposit() {
    setMsg(null);
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

  // Lógica Retiro (Simulación UI)
  async function handleWithdraw() {
    setMsg(null);
    if (amountNumber < 200) {
        setMsg({ type: 'error', text: "El retiro mínimo es de $200 MXN." });
        return;
    }
    setCreating(true);
    // Simulación de delay de red
    setTimeout(() => {
        setCreating(false);
        setMsg({ type: 'success', text: "Solicitud recibida. Tu dinero estará en tu cuenta en < 15 mins." });
        setAmount("");
    }, 1500);
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in px-4">
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
          
          {/* TARJETA DE SALDO */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 p-8 shadow-2xl h-fit">
             <div className="absolute top-0 right-0 p-40 bg-chido-pink/10 blur-3xl rounded-full"></div>
             <div className="absolute bottom-0 left-0 p-32 bg-chido-cyan/10 blur-3xl rounded-full"></div>
             
             <div className="relative z-10 flex flex-col gap-8">
               <div className="flex justify-between items-start">
                  <div className="text-zinc-400 font-bold text-xs uppercase tracking-[0.2em]">Saldo Total</div>
                  <Coins className="text-chido-gold opacity-50" />
               </div>
               <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">${loading ? "..." : formatted}</span>
                   <span className="text-xl font-bold text-zinc-500">MXN</span>
               </div>
               <div className="flex gap-2">
                   <div className="bg-white/5 rounded-lg px-4 py-2 flex-1">
                       <div className="text-[10px] text-zinc-500 uppercase">Retirable</div>
                       <div className="text-white font-bold">${loading ? "..." : formatted}</div>
                   </div>
                   <div className="bg-white/5 rounded-lg px-4 py-2 flex-1">
                       <div className="text-[10px] text-zinc-500 uppercase">Bono Activo</div>
                       <div className="text-chido-pink font-bold">$0.00</div>
                   </div>
               </div>
             </div>
          </div>

          {/* PANEL DE ACCIONES (Tabs) */}
          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 backdrop-blur-sm">
             <div className="flex p-1 bg-black/40 rounded-xl mb-6">
                <button onClick={() => setActiveTab('deposit')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'deposit' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}>Depositar</button>
                <button onClick={() => setActiveTab('withdraw')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'withdraw' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}>Retirar</button>
             </div>

             <div className="space-y-4">
               {activeTab === 'deposit' ? (
                   <>
                       <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto a depositar</label>
                       <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chido-cyan font-black text-xl">$</span>
                           <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-chido-cyan outline-none transition-colors" inputMode="numeric" />
                       </div>
                       <div className="grid grid-cols-4 gap-2">
                           {["100", "200", "500", "1000"].map((val) => (
                           <button key={val} onClick={() => setAmount(val)} className={`py-2 rounded-lg text-xs font-bold transition-all border ${amount === val ? 'bg-chido-cyan text-black border-chido-cyan' : 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'}`}>${val}</button>
                           ))}
                       </div>
                       <button onClick={createDeposit} disabled={creating} className="w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all mt-2 bg-gradient-to-r from-chido-cyan to-blue-500 text-white hover:brightness-110">
                           {creating ? "Procesando..." : "PAGAR AHORA"}
                       </button>
                   </>
               ) : (
                   <>
                       <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto a retirar</label>
                       <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chido-pink font-black text-xl">$</span>
                           <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-chido-pink outline-none transition-colors" inputMode="numeric" />
                       </div>
                       <div className="space-y-2">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Cuenta Clabe (18 dígitos)</label>
                           <input placeholder="0121800..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-chido-pink outline-none" />
                       </div>
                       <button onClick={handleWithdraw} disabled={creating} className="w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all mt-2 bg-gradient-to-r from-chido-pink to-red-600 text-white hover:brightness-110">
                           {creating ? "Solicitando..." : "SOLICITAR RETIRO"}
                       </button>
                   </>
               )}

               {msg && (
                 <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${msg.type === 'success' ? 'bg-chido-green/20 text-chido-green' : 'bg-chido-red/20 text-chido-red'}`}>
                   <AlertCircle size={14} /> {msg.text}
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
      <div className="mt-20"><Footer /></div>
    </MainLayout>
  );
}
