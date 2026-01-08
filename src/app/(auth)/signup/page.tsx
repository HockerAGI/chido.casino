// src/app/(auth)/signup/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function cn(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function SoftSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/90",
        className
      )}
      aria-hidden="true"
    />
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState({ email: false, password: false });
  const [msg, setMsg] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Escribe tu correo.";
    if (!isValidEmail(email)) return "Correo inválido.";
    return "";
  }, [email, touched.email]);

  const passError = useMemo(() => {
    if (!touched.password) return "";
    if (!password) return "Crea una contraseña.";
    if (password.length < 6) return "Mínimo 6 caracteres.";
    return "";
  }, [password, touched.password]);

  const canSubmit = useMemo(() => {
    return isValidEmail(email) && password.length >= 6 && !loading;
  }, [email, password, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setTouched({ email: true, password: true });

    if (!isValidEmail(email) || password.length < 6) {
      cardRef.current?.classList.remove("shake");
      void cardRef.current?.offsetWidth;
      cardRef.current?.classList.add("shake");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        // Si luego activas confirmación por email, aquí puedes poner redirect:
        // options: { emailRedirectTo: "https://chidocasino.com/login" }
      });

      if (error) {
        setMsg("No se pudo crear la cuenta. Intenta con otro correo.");
        cardRef.current?.classList.remove("shake");
        void cardRef.current?.offsetWidth;
        cardRef.current?.classList.add("shake");
        return;
      }

      setMsg("Cuenta creada. Ya puedes iniciar sesión.");
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[560px]">
      <div
        ref={cardRef}
        className="card-fade relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-8"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-cyan-400/40 via-emerald-400/40 to-red-500/40" />

        <div className="flex flex-col items-center text-center">
          <img
            src="/chido-logo.png"
            alt="Chido Casino"
            className="h-16 w-16 select-none drop-shadow-[0_0_18px_rgba(0,240,255,0.18)]"
            draggable={false}
          />
          <h1 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">Crear cuenta</h1>
          <p className="mt-1 text-sm text-white/65">
            Registro minimal, rápido y listo para wallet.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/75">Correo</label>
            <div
              className={cn(
                "group relative rounded-2xl border bg-white/[0.03] px-4 py-3 transition",
                emailError
                  ? "border-red-400/40 shadow-[0_0_0_3px_rgba(255,60,60,0.08)]"
                  : "border-white/10 focus-within:border-cyan-300/40 focus-within:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]"
              )}
            >
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="tu@correo.com"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
              <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 transition group-focus-within:opacity-100" />
            </div>
            <p className={cn("min-h-[18px] text-xs", emailError ? "text-red-300/90" : "text-white/45")}>
              {emailError || "Te enviará directo al login."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/75">Contraseña</label>
            <div
              className={cn(
                "group relative rounded-2xl border bg-white/[0.03] px-4 py-3 transition",
                passError
                  ? "border-red-400/40 shadow-[0_0_0_3px_rgba(255,60,60,0.08)]"
                  : "border-white/10 focus-within:border-cyan-300/40 focus-within:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]"
              )}
            >
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
              <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 transition group-focus-within:opacity-100" />
            </div>
            <p className={cn("min-h-[18px] text-xs", passError ? "text-red-300/90" : "text-white/45")}>
              {passError || "Recomendación: 8+ caracteres para nivel pro."}
            </p>
          </div>

          {msg && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "relative w-full rounded-2xl px-4 py-3 font-black text-black shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition active:scale-[0.99]",
              canSubmit
                ? "bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 hover:brightness-105"
                : "cursor-not-allowed bg-white/10 text-white/40"
            )}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? <SoftSpinner /> : null}
              {loading ? "Creando..." : "Crear cuenta"}
            </span>
            <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 [background:radial-gradient(1200px_120px_at_50%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
          </button>

          <div className="pt-2 text-center text-xs text-white/60">
            ¿Ya tienes cuenta?{" "}
            <Link className="font-bold text-cyan-200 hover:text-cyan-100" href="/login">
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}