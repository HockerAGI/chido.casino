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

export default function SignupPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const emailError =
    touched.email && !isValidEmail(email) ? "Correo inválido." : "";
  const passError =
    touched.password && password.length < 6
      ? "Mínimo 6 caracteres."
      : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!isValidEmail(email) || password.length < 6) {
      cardRef.current?.classList.remove("shake");
      void cardRef.current?.offsetWidth;
      cardRef.current?.classList.add("shake");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMsg("No se pudo crear la cuenta.");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="w-full max-w-[520px]">
      <div
        ref={cardRef}
        className="card-fade rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center">
          <img src="/chido-logo.png" className="h-16 w-16" />
          <h1 className="mt-4 text-2xl font-black">
            Crear cuenta
          </h1>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            className="w-full rounded-2xl bg-white/5 px-4 py-3"
          />
          {emailError && (
            <p className="text-xs text-red-300">{emailError}</p>
          )}

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() =>
              setTouched((t) => ({ ...t, password: true }))
            }
            className="w-full rounded-2xl bg-white/5 px-4 py-3"
          />
          {passError && (
            <p className="text-xs text-red-300">{passError}</p>
          )}

          {msg && <p className="text-sm">{msg}</p>}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 py-3 font-black text-black"
          >
            Crear cuenta
          </button>

          <p className="text-center text-xs text-white/60">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-cyan-200 font-bold">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}