"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, ArrowLeft, CheckCircle2, Shield } from "lucide-react";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => {
    if (!SUPABASE_CONFIGURED) return null as any;
    try {
      return typeof window !== "undefined" ? createClient() : null;
    } catch {
      return null as any;
    }
  }, []);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setError("Faltan variables de entorno de Supabase.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/login`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-xl p-7 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          <div className="w-16 h-16 rounded-full bg-[#32CD32]/15 border border-[#32CD32]/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={34} className="text-[#32CD32]" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Revisa tu correo</h1>
          <p className="text-white/55 text-sm leading-relaxed">
            Si la cuenta existe, te mandamos el enlace para restablecer tu contraseña.
          </p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-[#00F0FF] text-sm font-black hover:underline">
            <ArrowLeft size={14} /> Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex justify-center mb-8">
        <Image src="/chido-logo.png" alt="Chido Casino" width={110} height={110} />
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-xl p-7 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black tracking-[0.24em] uppercase text-white/55">
            <Shield size={12} /> Acceso seguro
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">Recuperar acceso</h1>
          <p className="mt-1 text-sm text-white/50">Te mandamos el correo de reset sin inventar nada.</p>
        </div>

        {!SUPABASE_CONFIGURED && (
          <div className="mb-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400 font-medium">
            ⚠️ Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="group relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#00F0FF] transition-colors" size={16} />
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 text-white pl-11 pr-4 py-4 text-sm outline-none transition-all focus:border-[#00F0FF]/60 focus:bg-black/70 placeholder:text-white/25"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full h-14 rounded-2xl font-black text-base tracking-widest uppercase overflow-hidden transition-all active:scale-[0.98] disabled:opacity-60 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] to-[#32CD32]" />
            <div className="absolute inset-px rounded-[14px] bg-gradient-to-b from-white/15 to-transparent" />
            <span className="relative text-black flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Enviar enlace"}
            </span>
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/login" className="text-sm text-white/45 hover:text-white/80 transition-colors">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}