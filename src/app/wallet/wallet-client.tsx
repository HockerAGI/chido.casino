"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/cn";
import { 
  ArrowUpRight, ShieldCheck, AlertCircle, Coins, Lock, 
  CreditCard, Banknote, Smartphone, Copy, Check 
} from "lucide-react";

type PaymentMethod = 'card' | 'spei' | 'oxxo' | 'crypto';

export default function WalletClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, userId, formatted } = useWalletBalance();
  
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [method, setMethod] = useState<PaymentMethod>('spei'); // SPEI por defecto (el más usado)
  const [amount, setAmount] = useState("100");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Simulación de una CLABE única para el usuario (Integración STP)
  const userClabe = "6461 8012 3456 7890 12"; 

  useEffect(() => {
    if (params.get("deposit") === "ok") setMsg({ type: 'success', text: "¡Depósito exitoso! Numia está procesando tu saldo." });
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
    
    // Simulación de proceso según método
    setTimeout(() => {
        setCreating(false);
        if (method === 'oxxo') {
            setMsg({ type: 'success', text: "Ficha OXXO generada. Te la enviamos por correo." });
        } else if (method === 'spei') {
            setMsg({ type: 'success', text: "Esperando transferencia. Se acreditará en < 1 min." });
        } else {
            // Lógica para tarjeta (Stripe/Nuvei)
            createStripeSession(); 
        }
    }, 1500);
  }

  async function createStripeSession() {
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
        setMsg({ type: 'error', text: "Error procesando tarjeta." });
        return;
      }
      window.location.href = json.url;
    } catch (e) {
        setCreating(false);
    }
  }

  // === ESTA FUNCIÓN FALTABA Y CAUSÓ EL ERROR ===
  async function handleWithdraw() {
    setMsg(null);
    if (amountNumber < 200) {
        setMsg({ type: 'error', text: "El retiro mínimo es de $200 MXN." });
        return;
    }
    setCreating(true);
    // Simulación de solicitud de retiro
    setTimeout(() => {
        setCreating(false);
        setMsg({ type: 'success', text: "Solicitud recibida. Procesando pago SPEI..." });
        setAmount("");
    }, 2000);
  }
  // ============================================

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in px-4">
        
        {/* HEADER DE BÓVEDA */}
        <div className="flex items-center gap-3 mb-8">
           <div className="p-3 bg-chido-cyan/10 rounded-2xl border border-chido-cyan/20">
             <Coins className="text-chido-cyan" size={32} />
           </div>
           <div>
             <h1 className="text-3xl font-black text-white">Bóveda Numia</h1>
             <p className="text-zinc-500 text-sm font-medium">Gestión financiera local e internacional.</p>
           </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
          
          {/* 1. TARJETA DE SALDO (Izquierda) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 p-8 shadow-2xl h-fit">
             <div className="absolute top-0 right-0 p-40 bg-chido-pink/10 blur-3xl rounded-full"></div>
             <div className="absolute bottom-0 left-0 p-32 bg-chido-cyan/10 blur-3xl rounded-full"></div>
             
             <div className="relative z-10 flex flex-col gap-8">
               <div className="flex justify-between items-start">
                  <div className="text-zinc-400 font-bold text-xs uppercase tracking-[0.2em]">Saldo Total</div>
                  {/* Icono de Banco de México / SPEI simulado */}
                  <div className="flex gap-2 opacity-50">
                    <CreditCard size={20} />
                    <Smartphone size={20} />
                  </div>
               </div>
               <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">${loading ? "..." : formatted}</span>
                   <span className="text-xl font-bold text-zinc-500">MXN</span>
               </div>
               <div className="flex gap-2">
                   <div className="bg-white/5 rounded-lg px-4 py-2 flex-1 border border-white/5">
                       <div className="text-[10px] text-zinc-500 uppercase font-bold">Retirable</div>
                       <div className="text-white font-bold">${loading ? "..." : formatted}</div>
                   </div>
                   <div className="bg-white/5 rounded-lg px-4 py-2 flex-1 border border-white/5">
                       <div className="text-[10px] text-zinc-500 uppercase font-bold">En Juego</div>
                       <div className="text-chido-pink font-bold">$0.00</div>
                   </div>
               </div>
             </div>
          </div>

          {/* 2. PANEL DE ACCIONES (Derecha) */}
          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 backdrop-blur-sm">
             
             {/* TABS DEPOSITAR / RETIRAR */}
             <div className="flex p-1 bg-black/40 rounded-xl mb-6">
                <button onClick={() => setActiveTab('deposit')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'deposit' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}>Depositar</button>
                <button onClick={() => setActiveTab('withdraw')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'withdraw' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}>Retirar</button>
             </div>

             <div className="space-y-4">
               {activeTab === 'deposit' ? (
                   <>  
                       {/* SELECTOR DE MÉTODO MEXICANO */}
                       <div className="grid grid-cols-2 gap-2 mb-4">
                          <button 
                            onClick={() => setMethod('spei')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'spei' ? 'border-chido-cyan bg-chido-cyan/10 text-white' : 'border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5'}`}
                          >
                             <div className="font-black text-xs uppercase tracking-wider">SPEI</div>
                             <span className="text-[10px] font-bold">Transferencia</span>
                          </button>
                          <button 
                            onClick={() => setMethod('oxxo')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'oxxo' ? 'border-chido-gold bg-chido-gold/10 text-white' : 'border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5'}`}
                          >
                             <div className="font-black text-xs uppercase tracking-wider text-chido-gold">OXXO</div>
                             <span className="text-[10px] font-bold">Efectivo</span>
                          </button>
                          <button 
                            onClick={() => setMethod('card')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'card' ? 'border-chido-pink bg-chido-pink/10 text-white' : 'border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5'}`}
                          >
                             <CreditCard size={16} />
                             <span className="text-[10px] font-bold">Tarjeta</span>
                          </button>
                          <button 
                            onClick={() => setMethod('crypto')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'crypto' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5'}`}
                          >
                             <Coins size={16} />
                             <span className="text-[10px] font-bold">Cripto</span>
                          </button>
                       </div>

                       {/* CONTENIDO SEGÚN MÉTODO */}
                       {method === 'spei' && (
                           <div className="bg-black/40 border border-white/10 rounded-xl p-4 animate-fade-in">
                               <div className="text-xs text-zinc-400 mb-2 text-center">Transfiere a tu CLABE única (24/7):</div>
                               <div className="flex items-center gap-2 bg-zinc-900 p-3 rounded-lg border border-chido-cyan/30 mb-2">
                                   <div className="font-mono text-lg font-bold text-chido-cyan tracking-wider flex-1 text-center">{userClabe}</div>
                                   <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-md transition-colors text-zinc-400">
                                       {copied ? <Check size={16} className="text-chido-green"/> : <Copy size={16}/>}
                                   </button>
                               </div>
                               <div className="text-[10px] text-zinc-500 text-center">Banco: <span className="font-bold text-white">STP / Numia</span> · Beneficiario: <span className="font-bold text-white">Chido Casino</span></div>
                           </div>
                       )}

                       {method === 'oxxo' && (
                           <div className="bg-black/40 border border-white/10 rounded-xl p-4 animate-fade-in">
                               <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto a depositar</label>
                               <div className="relative mt-1 mb-4">
                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chido-gold font-black text-xl">$</span>
                                   <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-chido-gold outline-none" inputMode="numeric" />
                               </div>
                               <button onClick={createDeposit} disabled={creating} className="w-full py-3 rounded-xl font-bold bg-chido-gold text-black hover:brightness-110 shadow-lg">
                                   {creating ? "Generando..." : "GENERAR FICHA OXXO"}
                               </button>
                           </div>
                       )}

                       {method === 'card' && (
                           <div className="animate-fade-in">
                               <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto a depositar</label>
                               <div className="relative mt-1">
                                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chido-pink font-black text-xl">$</span>
                                   <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-chido-pink outline-none transition-colors" inputMode="numeric" />
                               </div>
                               <div className="grid grid-cols-4 gap-2 mt-4">
                                   {["100", "200", "500", "1000"].map((val) => (
                                   <button key={val} onClick={() => setAmount(val)} className={`py-2 rounded-lg text-xs font-bold transition-all border ${amount === val ? 'bg-chido-pink text-white border-chido-pink' : 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10'}`}>${val}</button>
                                   ))}
                               </div>
                               <button onClick={createDeposit} disabled={creating} className="w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all mt-4 bg-gradient-to-r from-chido-pink to-red-600 text-white hover:brightness-110">
                                   {creating ? "Procesando..." : "PAGAR CON TARJETA"}
                               </button>
                           </div>
                       )}
                   </>
               ) : (
                   // RETIROS
                   <>
                       <div className="p-4 bg-chido-green/10 border border-chido-green/20 rounded-xl mb-4 flex items-center gap-3">
                           <ShieldCheck className="text-chido-green" size={24} />
                           <div className="text-xs text-chido-green/80">
                               <span className="font-bold block text-chido-green">Retiros SPEI 24/7</span>
                               Tus ganancias llegan directo a tu cuenta bancaria en minutos.
                           </div>
                       </div>

                       <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto a retirar</label>
                       <div className="relative mb-4">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black text-xl">$</span>
                           <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-white outline-none transition-colors" inputMode="numeric" />
                       </div>
                       
                       <div className="space-y-2">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">CLABE (BBVA, Santander, etc.)</label>
                           <input placeholder="012 1800 ..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-white outline-none font-mono" />
                       </div>
                       
                       <button onClick={handleWithdraw} disabled={creating} className="w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all mt-6 bg-white text-black hover:scale-[1.02]">
                           {creating ? "Solicitando..." : "RETIRAR MIS GANANCIAS"}
                       </button>
                   </>
               )}

               {msg && (
                 <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 mt-4 ${msg.type === 'success' ? 'bg-chido-green/20 text-chido-green' : 'bg-chido-red/20 text-chido-red'}`}>
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