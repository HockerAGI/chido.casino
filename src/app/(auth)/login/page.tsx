"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const pwScore = scorePassword(password);

  const showEmailErr = !!touched.email && !emailOk;
  const showPwErr = !!touched.password && password.length < 6;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError(null);

    if (!emailOk || password.length < 6) {
      setShake(true);
      window.setTimeout(() => setShake(false), 300);
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
        setShake(true);
        window.setTimeout(() => setShake(false), 300);
        return;
      }

      router.push("/wallet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`space-y-5 ${shake ? "shake" : ""}`}>
      <div className="text-center">
        <h1 className="text-xl font-extrabold text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-white/60">
          Accede a tu wallet con verificación segura.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/70">Correo</label>
          <div className={`field ${showEmailErr ? "field-error" : emailOk ? "field-ok" : ""}`}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              type="email"
              autoComplete="email"
              placeholder="tucorreo@dominio.com"
              className="field-input"
            />
          </div>
          <div className="min-h-[18px]">
            {showEmailErr ? (
              <p className="text-xs text-red-300/90">Escribe un correo válido.</p>
            ) : (
              <p className="text-xs text-white/35">Nunca compartimos tu correo.</p>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/70">Contraseña</label>
          <div className={`field ${showPwErr ? "field-error" : password ? "field-ok" : ""}`}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="field-input"
            />
          </div>

          {/* “Riesgo visual” fintech style */}
          <div className="space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(pwScore / 4) * 100}%`,
                  opacity: password ? 1 : 0.35,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/45">
              <span>Estado</span>
              <span className="text-white/70">
                {password.length === 0
                  ? "—"
                  : pwScore <= 1
                  ? "Débil"
                  : pwScore === 2
                  ? "Media"
                  : pwScore === 3
                  ? "Fuerte"
                  : "Elite"}
              </span>
            </div>

            <div className="min-h-[18px]">
              {showPwErr ? (
                <p className="text-xs text-red-300/90">Mínimo 6 caracteres.</p>
              ) : (
                <p className="text-xs text-white/35">Tip: 12+ caracteres = más seguridad.</p>
              )}
            </div>
          </div>
        </div>

        {/* Error inline (sin alert) */}
        {error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {/* CTA */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="spinner" aria-hidden="true" />
              Verificando…
            </span>
          ) : (
            "Entrar"
          )}
        </button>

        <div className="flex items-center justify-between text-sm">
          <Link href="/signup" className="text-chido-cyan font-bold hover:opacity-90">
            Crear cuenta
          </Link>
          <button
            type="button"
            className="text-white/55 hover:text-white/75"
            onClick={() => setError("Recuperación de contraseña: siguiente paso (lo conectamos con Supabase).")}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </form>

      {/* Nivel “casino top” (placeholder listo para después) */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
        <p className="text-xs text-white/60">
          Próximo nivel: preview animado de wallet + modo low-distraction nocturno + sonidos ultra sutiles (opcionales).
        </p>
      </div>
    </div>
  );
}