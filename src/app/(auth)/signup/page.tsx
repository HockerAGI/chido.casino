"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Lock, Mail, AlertCircle, Loader2, CheckCircle2, Ticket, Eye, EyeOff, Gift, Zap } from "lucide-react";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PERKS = [
  { icon: Gift, text: "+100% bono en tu primer depósito" },
  { icon: Zap,  text: "Apuestas desde $0.10 MXN" },
  { icon: CheckCircle2, text: "Giros gratis al registrarte" },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    if (!SUPABASE_CONFIGURED) return null as any;
    try { return createClientComponentClient(); } catch { return null as any; }
  }, []);

  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const r = (sp.get("ref") || "").trim().toUpperCase();
      setRef(r);
    } catch { setRef(""); }
  }, []);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/affiliates/set-ref?code=${encodeURIComponent(ref)}`, { cache: "no-store" }).catch(() => {});
  }, [ref]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Replit Secrets.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      await fetch("/api/affiliates/attribution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
      router.refresh();
      router.push("/lobby");
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-[#32CD32]/50 to-transparent" />
          <div className="w-16 h-16 rounded-full bg-[#32CD32]/15 border border-[#32CD32]/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={36} className="text-[#32CD32]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">¡Ya eres chido!</h2>
          <p className="text-white/50 text-sm mb-5 leading-relaxed">
            Mandamos un correo a <strong className="text-white">{email}</strong>. Confírmalo y empieza a ganar.
          </p>
          {ref && (
            <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[#00F0FF]/5 border border-[#00F0FF]/15 px-4 py-2.5 text-xs text-[#00F0FF] font-bold">
              <Ticket size={13} /> Invitación: <span className="font-mono">{ref}</span>
            </div>
          )}
          <Link href="/login" className="inline-flex items-center gap-2 text-[#00F0FF] text-sm font-black hover:underline">
            Iniciar sesión →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="flex justify-center mb-7">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-[#FF0099]/20 blur-xl animate-pulse" />
          <Image src="/chido-logo.png" alt="Chido Casino" width={110} height={110} className="relative drop-shadow-[0_0_24px_rgba(255,0,153,0.6)]" />
        </div>
      </div>

      {/* Card */}
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-xl p-7 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-[#32CD32]/50 to-transparent" />

        {/* Perks */}
        <div className="mb-5 space-y-1.5">
          {PERKS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-xs text-white/65">
              <div className="w-5 h-5 rounded-full bg-[#32CD32]/15 border border-[#32CD32]/25 flex items-center justify-center shrink-0">
                <Icon size={11} className="text-[#32CD32]" />
              </div>
              {text}
            </div>
          ))}
        </div>

        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight text-white">
            ¡Crea tu cuenta{" "}
            <span className="bg-gradient-to-r from-[#32CD32] to-[#00F0FF] bg-clip-text text-transparent">gratis!</span>
          </h1>
          <p className="mt-0.5 text-sm text-white/40">Sin rollos, en 30 segundos</p>
        </div>

        {!SUPABASE_CONFIGURED && (
          <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400 font-medium">
            ⚠️ Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en Replit Secrets.
          </div>
        )}

        {ref && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-[#00F0FF]/5 border border-[#00F0FF]/15 px-4 py-2.5 text-xs text-[#00F0FF] font-bold">
            <Ticket size={13} /> Invitado por: <span className="font-mono">{ref}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400 font-medium">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3">
          {/* Email */}
          <div className="group relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#32CD32] transition-colors" size={16} />
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 text-white pl-11 pr-4 py-4 text-sm outline-none transition-all focus:border-[#32CD32]/60 focus:bg-black/70 focus:shadow-[0_0_0_3px_rgba(50,205,50,0.1)] placeholder:text-white/25"
              required
            />
          </div>

          {/* Password */}
          <div className="group relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#32CD32] transition-colors" size={16} />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Elige una contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 text-white pl-11 pr-12 py-4 text-sm outline-none transition-all focus:border-[#32CD32]/60 focus:bg-black/70 focus:shadow-[0_0_0_3px_rgba(50,205,50,0.1)] placeholder:text-white/25"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Terms note */}
          <p className="text-[10px] text-white/30 leading-relaxed px-1">
            Al crear tu cuenta aceptas los <Link href="/terms" className="text-white/50 hover:text-white underline">Términos</Link> y la <Link href="/privacy" className="text-white/50 hover:text-white underline">Privacidad</Link>. +18 años.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full h-14 rounded-2xl font-black text-base tracking-widest uppercase overflow-hidden transition-all active:scale-[0.98] disabled:opacity-60 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#32CD32] to-[#00B050]" />
            <div className="absolute inset-px rounded-[14px] bg-gradient-to-b from-white/15 to-transparent" />
            <span className="relative text-white flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : "¡A ganar! Crear cuenta"}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">¿ya tienes cuenta?</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center w-full h-12 rounded-2xl border border-[#FF0099]/30 bg-[#FF0099]/5 hover:bg-[#FF0099]/10 hover:border-[#FF0099]/50 transition-all font-bold text-sm text-[#FF0099]"
        >
          Iniciar sesión — ¡Órale!
        </Link>
      </div>
    </div>
  );
}
