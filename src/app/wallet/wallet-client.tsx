"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { 
  ShieldCheck, AlertCircle, Coins, CreditCard, Copy, Check 
} from "lucide-react";

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

  // CLABE asignada (Idealmente vendría de Supabase también)
  const userClabe = "6461 8012 3456 7890 12"; 

  useEffect(() => {
    if (params.get("deposit") === "ok") setMsg({ type: 'success', text: "¡Depósito exitoso! Procesando..." });
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

  // --- LÓGICA REAL: Crear Depósito API ---
  async function createDeposit() {
    setMsg(null);
    setCreating(true);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { 
            router.push("/login"); 
            return; 
        }

        // LLAMADA REAL A LA API (Nada de setTimeout)
        const res = await fetch("/api/payments/create-deposit", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ 
                amount: amountNumber,
                method: method
            }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error iniciando pago.");
        
        // Si la API retorna URL (AstroPay/Stripe), redirigimos
        if (data.url) {
            window.location.href = data.url;
        } else {
            setMsg({ type: 'success', text: "Solicitud creada. Revisa tu correo." });
        }

    } catch (error: any) {
        setMsg({ type: 'error', text: error.message });
    } finally {
        setCreating(false);
    }
  }

  // --- LÓGICA REAL: Retirar Fondos ---
  async function handleWithdraw() {
    setMsg(null);
    if (amountNumber < 200) {
        setMsg({ type: 'error', text: "El retiro mínimo es de $200 MXN." });
        return;
    }
    setCreating(true);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }

        // Aquí deberías tener /api/payments/withdraw implementado
        // Si no existe aún, lanzará error 404, que es lo correcto en un sistema real no mockeado
        const res = await fetch("/api/payments/withdraw", {
             method: "POST",
             headers: { 
                 "Content-Type": "application/json",
                 "Authorization": `Bearer ${session.access_token}`
             },
             body: JSON.stringify({ amount: amountNumber })
        });

        if (!res.ok) {
             const data = await res.json().catch(() => ({}));
             throw new Error(data.error || "Error en solicitud de retiro.");
        }

        setMsg({ type: 'success', text: "Retiro solicitado correctamente." });
        setAmount("");

    } catch (error: any) {
        setMsg({ type: 'error', text: error.message });
    } finally {
        setCreating(false);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in px-4">
        
        {/* Header Bóveda */}
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
          
          {/* Tarjeta de Saldo */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 p-8 shadow-2xl h-fit">
             <div className="absolute top-0 right-0 p-40 bg-chido-pink/10 blur-3xl rounded-full"></div>
             <div className="absolute bottom-0 left-0 p-32 bg-chido-cyan/10 blur-3xl rounded-full"></div>
             
             <div className="relative z-10 flex flex-col gap-8">
               <div className="flex justify-between items-start">
                  <div className="text-zinc-400 font-bold text-xs uppercase tracking-[0.2em]">Saldo Total</div>
                  <div className="flex gap-2 opacity-50">
                    <CreditCard size={20} />
                  </div>
               </div>
               <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">${loading ? "..." : formatted}</span>
                   <span className="text-xl font-bold text-zinc-500">MXN</span>
               </div>
             </div>
          </div>

          {/* Panel de Acciones */}
          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 backdrop-blur-sm">
             <div className="flex p-1 bg-black/40 rounded-xl mb-6">
                <button onClick={() => setActiveTab('deposit')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'deposit' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}>Depositar</button>
                <button onClick={() => setActiveTab('withdraw')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'withdraw' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}>Retirar</button>
             </div>

             <div className="space-y-4">
               {activeTab === 'deposit' ? (
                   <>  
                       <div className="grid grid-cols-2 gap-2 mb-4">
                          {/* Botones de selección de método */}
                          <button onClick={() => setMethod('spei')} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'spei' ? 'border-chido-cyan bg-chido-cyan/10 text-white' : 'border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5'}`}>
                             <div className="font-black text-xs uppercase tracking-wider">SPEI</div>
                          </button>
                          <button onClick={() => setMethod('oxxo')} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'oxxo' ? 'border-chido-gold bg-chido-gold/10 text-white' : 'border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5'}`}>
                             <div className="font-black text-xs uppercase tracking-wider text-chido-gold">OXXO</div>
                          </button>
                          <button onClick={() => setMethod('card')} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${method === 'card' ? 'border-chido-pink bg-chido-pink/10 text-white' : 'border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5'}`}>
                             <CreditCard size={16} />
                          </button>
                       </div>

                       {/* Input y Botón de Acción */}
                       <div className="bg-black/40 border border-white/10 rounded-xl p-4 animate-fade-in">
                           {method === 'spei' && <div className="text-xs text-zinc-400 mb-2 text-center">CLABE: {userClabe} <button onClick={handleCopy}><Copy size={12}/></button></div>}
                           
                           <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto</label>
                           <div className="relative mt-1 mb-4">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black text-xl">$</span>
                               <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-white outline-none" inputMode="numeric" />
                           </div>
                           <button onClick={createDeposit} disabled={creating} className="w-full py-3 rounded-xl font-bold bg-white text-black hover:scale-[1.02] transition-transform shadow-lg">
                               {creating ? "Conectando..." : "PROCEDER AL PAGO"}
                           </button>
                       </div>
                   </>
               ) : (
                   <>
                       <div className="p-4 bg-chido-green/10 border border-chido-green/20 rounded-xl mb-4 flex items-center gap-3">
                           <ShieldCheck className="text-chido-green" size={24} />
                           <div className="text-xs text-chido-green/80"><span className="font-bold block text-chido-green">Retiros SPEI 24/7</span></div>
                       </div>
                       <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto</label>
                       <div className="relative mb-4">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black text-xl">$</span>
                           <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-white outline-none transition-colors" inputMode="numeric" />
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
