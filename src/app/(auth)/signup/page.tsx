"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Logo } from "@/components/ui/logo";
import { Lock, Mail, AlertCircle, Loader2, CheckCircle2, Ticket } from "lucide-react";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    if (!SUPABASE_CONFIGURED) return null as any;
    try { return createClientComponentClient(); } catch { return null as any; }
  }, []);

  // ⚠️ No usamos useSearchParams() para evitar el error de Next
  // "missing suspense boundary" durante prerender/build.
  const [ref, setRef] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const r = (sp.get("ref") || "").trim().toUpperCase();
      setRef(r);
    } catch {
      setRef("");
    }
  }, []);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/affiliates/set-ref?code=${encodeURIComponent(ref)}`, { cache: "no-store" }).catch(() => {});
  }, [ref]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("El casino aún no está conectado a la base de datos. Configura las variables de entorno primero.");
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
      <div className="w-full max-w-md animate-fade-in flex flex-col items-center text-center p-6 bg-zinc-900/50 border border-white/10 rounded-3xl">
        <CheckCircle2 size={60} className="text-chido-green mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">¡Cuenta creada!</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Te mandamos un correo de confirmación a <strong>{email}</strong>.
        </p>
        {ref ? (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/75">
            <Ticket size={14} className="text-[#00F0FF]" />
            Invitación detectada: <span className="font-mono text-white">{ref}</span>
          </div>
        ) : null}
        <Link href="/login" className="text-chido-cyan font-bold hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in flex flex-col items-center">
      <div className="mb-8 animate-float">
        <Logo variant="full" size={180} />
      </div>

      {ref ? (
        <div className="w-full mb-4 rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-white/75 flex items-center gap-2">
          <Ticket size={16} className="text-[#00F0FF]" />
          Te invitaron con: <span className="font-mono text-white">{ref}</span>
        </div>
      ) : null}

      {error ? (
        <div className="w-full bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      ) : null}

      <form onSubmit={handleSignup} className="space-y-4 w-full">
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm outline-none"
            required
          />
        </div>

        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm outline-none"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-chido-pink to-chido-red text-white font-black py-4 rounded-xl mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin" /> : "CREAR CUENTA"}
        </button>
      </form>

      <p className="text-center text-zinc-500 text-xs mt-8">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-white font-bold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}