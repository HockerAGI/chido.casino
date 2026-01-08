// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const cn = (...v: Array<string | false | undefined>) =>
  v.filter(Boolean).join(" ");

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [risk, setRisk] = useState(0);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 22 || h <= 6) setFocus(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.low = focus ? "true" : "false";
  }, [focus]);

  const canSubmit = useMemo(
    () => isValidEmail(email) && password.length >= 6 && !loading,
    [email, password, loading]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      cardRef.current?.classList.add("shake");
      setTimeout(() => cardRef.current?.classList.remove("shake"), 350);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setRisk((r) => Math.min(100, r + 20));
      setError("Credenciales incorrectas.");
      cardRef.current?.classList.add("shake");
      setTimeout(() => cardRef.current?.classList.remove("shake"), 350);
      return;
    }

    setRisk(0);
    router.push("/wallet");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div
        ref={cardRef}
        className="card-fade rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center text-center">
          <img
            src="/chido-logo.png"
            alt="Chido Casino"
            className="h-16 w-16 drop-shadow-[0_0_18px_rgba(0,240,255,0.25)]"
          />
          <h1 className="mt-4 text-2xl font-black">Iniciar sesión</h1>
          <p className="text-sm text-white/60">
            Acceso seguro a tu wallet
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            disabled={!canSubmit}
            className={cn(
              "w-full rounded-2xl py-3 font-black transition",
              canSubmit
                ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-black"
                : "bg-white/10 text-white/40"
            )}
          >
            {loading ? <Spinner /> : "Entrar"}
          </button>

          <div className="flex justify-between text-xs text-white/50">
            <Link href="/signup" className="text-cyan-300">
              Crear cuenta
            </Link>
            <button
              type="button"
              onClick={() => setFocus((v) => !v)}
            >
              Focus {focus ? "ON" : "OFF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}