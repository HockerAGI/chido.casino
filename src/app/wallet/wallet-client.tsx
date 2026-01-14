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

  // === FUNCIÓN CRÍTICA QUE FALTABA ===
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

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in px-4">
        
        {/* HEADER DE BÓVEDA */}
        <div className="flex items-center gap-3 mb-8">
           <div className="p-3 bg-chido-cyan/10 rounded-2xl border border-chido-cyan/20">
             <Coins
