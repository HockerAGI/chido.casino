"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { ShieldCheck, AlertCircle, Coins, CreditCard, Copy, Check } from "lucide-react";

type PaymentMethod = 'card' | 'spei' | 'oxxo' | 'crypto';

export default function WalletClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, formatted } = useWalletBalance();
  
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [method, setMethod] = useState<PaymentMethod>('spei');
  const [amount, setAmount] = useState("100");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const userClabe = "6461 8012 3456 7890 12"; 

  useEffect(() => {
    if (params.get("deposit") === "ok") setMsg({ type: 'success', text: "¡Depósito exitoso!" });
    if (params.get("action") === "withdraw") setActiveTab('withdraw');
  }, [params]);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }, [amount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(userClabe.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function createDeposit() {
    setMsg(null);
    setCreating(true);
    setTimeout(() => {
        setCreating(false);
        if (method === 'oxxo') setMsg({ type: 'success', text: "Ficha OXXO generada." });
        else if (method === 'spei') setMsg({ type: 'success', text: "Esperando SPEI." });
        else createStripeSession(); 
    }, 1500);
  }

  async function createStripeSession() {
    // Lógica Stripe...
  }

  // FUNCIÓN AGREGADA
  async function handleWithdraw() {
    setMsg(null);
    if (amountNumber < 200) {
        setMsg({ type: 'error', text: "Mínimo $200 MXN." });
        return;
    }
    setCreating(true);
    setTimeout(() => {
        setCreating(false);
        setMsg({ type: 'success', text: "Retiro solicitado." });
        setAmount("");
    }, 2000);
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in px-4">
        {/* Header Bóveda */}
        <div className="flex items-center gap-3 mb-8">
           <Coins className="text-chido-cyan" size={32} />
           <h1 className="text-3xl font-black text-white">Bóveda Numia</h1>
        </div>
        
        {/* Contenido (Tarjeta + Tabs) - Resumido para brevedad, usa estructura anterior */}
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
            {/* ... Tarjeta Saldo y Panel Acciones con handleWithdraw en el botón ... */}
             <div className="rounded-3xl bg-zinc-900/50 p-6 border border-white/5">
                {/* Tabs */}
                <div className="flex p-1 bg-black/40 rounded-xl mb-6">
                    <button onClick={() => setActiveTab('deposit')} className={`flex-1 py-2 ${activeTab === 'deposit' ? 'bg-white text-black' : 'text-zinc-500'}`}>Depositar</button>
                    <button onClick={() => setActiveTab('withdraw')} className={`flex-1 py-2 ${activeTab === 'withdraw' ? 'bg-white text-black' : 'text-zinc-500'}`}>Retirar</button>
                </div>
                
                {/* Panel Retiro usando handleWithdraw */}
                {activeTab === 'withdraw' && (
                   <>
                      <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-4 mb-4 text-white text-2xl pl-4" />
                      <button onClick={handleWithdraw} disabled={creating} className="w-full py-4 bg-white text-black font-black rounded-xl">RETIRAR</button>
                   </>
                )}
                {/* Panel Deposito usando createDeposit */}
                {activeTab === 'deposit' && (
                    <>
                       {/* Botones de método (SPEI, OXXO...) */}
                       <button onClick={createDeposit} className="w-full py-4 bg-chido-gold text-black font-black rounded-xl mt-4">PAGAR</button>
                    </>
                )}
                
                {msg && <div className="mt-4 text-xs font-bold text-white">{msg.text}</div>}
             </div>
        </div>
      </div>
      <div className="mt-20"><Footer /></div>
    </MainLayout>
  );
}