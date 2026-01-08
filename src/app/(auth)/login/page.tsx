"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 22 || h <= 6) {
      document.documentElement.dataset.low = "true";
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      cardRef.current?.classList.add("shake");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales incorrectas");
      cardRef.current?.classList.add("shake");
      setLoading(false);
      return;
    }

    router.push("/wallet");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div
        ref={cardRef}
        className="card-fade relative rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center text-center">
          <img
            src="/chido-logo.png"
            alt="Chido Casino"
            className="h-16 w-16 drop-shadow-[0_0_18px_rgba(0,240,255,0.3)]"
          />
          <h1 className="mt-4 text-2xl font-black">
            <span className="text-chido-cyan">CHIDO</span>{" "}
            <span className="text-chido-red">CASINO</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Acceso seguro a tu wallet
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl bg-black/30 px-4 py-3 text-sm outline-none"
            placeholder="Correo"
            type="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-black/30 px-4 py-3 text-sm outline-none"
            placeholder="Contraseña"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-chido-green py-3 font-black text-black transition active:scale-95 disabled:opacity-40"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <div className="text-center text-xs text-white/60">
            ¿No tienes cuenta?{" "}
            <Link href="/signup" className="font-bold text-chido-cyan">
              Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}