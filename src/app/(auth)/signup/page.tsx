"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErr("Escribe un correo válido.");
      return;
    }
    if (password.length < 6) {
      setErr("Contraseña mínima: 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      setMsg("Cuenta creada. Ya puedes iniciar sesión.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-extrabold text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-white/60">
          Registro rápido. Perfil y wallet se generan automáticamente.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/70">Correo</label>
          <div className="field">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="tucorreo@dominio.com"
              className="field-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-white/70">Contraseña</label>
          <div className="field">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="field-input"
            />
          </div>
        </div>

        {err ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
        {msg ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {msg}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="spinner" aria-hidden="true" />
              Creando…
            </span>
          ) : (
            "Registrarme"
          )}
        </button>

        <div className="text-sm text-white/60">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-chido-cyan font-bold hover:opacity-90">
            Inicia sesión
          </Link>
        </div>
      </form>
    </div>
  );
}