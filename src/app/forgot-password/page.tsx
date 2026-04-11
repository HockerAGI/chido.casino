"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, Mail, ArrowLeft, CheckCircle2, Shield } from "lucide-react";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => {
    if (!SUPABASE_CONFIGURED) return null as any;
    try { return createClientComponentClient(); } catch { return null as any; }
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
          <p className="text-white/55 text-sm leading-relaxed">Si la cuenta existe, te mandamos el enlace para restablecer tu contraseña.</p>
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
          <h1 className="text-3xl font-black tracking-tight text-white">Recuperar acceso</h1>
          <p className="mt-1 text-sm text-white/50">Te mandamos el correo de reset sin inventar nada.</p>
        </div>

        {!SUPABASE_CONFIGURED && (
          <div className="mb-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400 font-medium">
            ⚠️ Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="email"
              placeholder="Tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 text-white pl-11 pr-4 py-4 text-sm outline-none placeholder:text-white/25 focus:border-[#00F0FF]/60"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#FF0099] to-[#FF5E00] font-black text-white tracking-widest uppercase disabled:opacity-60"
          >
            {loading ? <Loader2 className="mx-auto animate-spin" size={20} /> : "Enviar enlace"}
          </button>
        </form>

        <div className="mt-5 text-[11px] text-white/35 flex items-center gap-2">
          <Shield size={13} /> Solo se envía si la cuenta está registrada.
        </div>
      </div>
    </div>
  );
}