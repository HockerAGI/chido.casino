"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Lock, Mail, Eye, EyeOff, Star, Zap, Shield } from "lucide-react";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TRUST_BADGES = [
  { icon: Shield, label: "SSL 256-bit" },
  { icon: Zap, label: "Pago al instante" },
  { icon: Star, label: "+50k jugadores" },
];

export default function LoginPage() {
  // FIX GLOBAL: Prevención total de quiebre en SSR
  const supabase =
    typeof window !== "undefined" && SUPABASE_CONFIGURED
      ? createClient()
      : null;
      
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!SUPABASE_CONFIGURED) {
      toast({
        title: "Config pendiente",
        description: "Falta configurar las variables de entorno de Supabase.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const riskRes = await fetch("/api/auth/risk/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);

      if (riskRes) {
        const r = await riskRes.json().catch(() => ({}));
        if (riskRes.ok === false || r?.ok === false) {
          const cd = Number(r?.cooldownSeconds || 0);
          toast({
            title: "Protección activa",
            description: cd > 0 ? `Espera ${cd}s e intenta de nuevo.` : "Espera un momento.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Conexión a la nueva API controlada (Arquitectura HOCKER)
      const authRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const authData = await authRes.json();

      if (!authRes.ok) {
        throw new Error(authData.error || "Verifica tu correo y contraseña.");
      }

      await fetch("/api/auth/risk/reset", { method: "POST" }).catch(() => {});
      await fetch("/api/affiliates/attribution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});

      router.push("/lobby");
      router.refresh();
    } catch (err: any) {
      toast({
        title: "No se pudo entrar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-[#FF0099]/20 blur-xl animate-pulse" />
          <Image
            src="/chido-logo.png"
            alt="Chido Casino"
            width={120}
            height={120}
            className="relative drop-shadow-[0_0_24px_rgba(255,0,153,0.6)]"
          />
        </div>
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-xl p-7 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-[#FF0099]/50 to-transparent" />

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-white">¡</span>
            <span className="bg-gradient-to-r from-[#FF0099] to-[#FF5E00] bg-clip-text text-transparent">ÓRALE</span>
            <span className="text-white">, entra!</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">Tu cuenta de Chido Casino</p>
        </div>

        {!SUPABASE_CONFIGURED && (
          <div className="mb-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400 font-medium">
            ⚠️ Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en Replit Secrets.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="group relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF0099] transition-colors"
              size={16}
            />
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 text-white pl-11 pr-4 py-4 text-sm outline-none transition-all focus:border-[#FF0099]/60 focus:bg-black/70 focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] placeholder:text-white/25"
              required
            />
          </div>

          <div className="group relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF0099] transition-colors"
              size={16}
            />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 text-white pl-11 pr-12 py-4 text-sm outline-none transition-all focus:border-[#FF0099]/60 focus:bg-black/70 focus:shadow-[0_0_0_3px_rgba(255,0,153,0.1)] placeholder:text-white/25"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-white/40 hover:text-[#00F0FF] transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full h-14 rounded-2xl font-black text-base tracking-widest uppercase overflow-hidden transition-all active:scale-[0.98] disabled:opacity-60 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF0099] to-[#FF5E00]" />
            <div className="absolute inset-px rounded-[14px] bg-gradient-to-b from-white/15 to-transparent" />
            <span className="relative text-white flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Entrar al casino"}
            </span>
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">o también</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Link
          href="/signup"
          className="flex items-center justify-center w-full h-12 rounded-2xl border border-[#00F0FF]/30 bg-[#00F0FF]/5 hover:bg-[#00F0FF]/10 hover:border-[#00F0FF]/50 transition-all font-bold text-sm text-[#00F0FF]"
        >
          Crear cuenta — ¡Ahorita!
        </Link>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center flex flex-col items-center gap-1"
            >
              <Icon size={14} className="text-white/60" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
