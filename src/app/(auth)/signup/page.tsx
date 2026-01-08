"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (!error) {
      router.push("/login");
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="card-fade rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
        <h1 className="text-center text-2xl font-black">Crear cuenta</h1>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl bg-black/30 px-4 py-3 text-sm"
            placeholder="Correo"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-black/30 px-4 py-3 text-sm"
            placeholder="Contraseña"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-chido-green py-3 font-black text-black"
          >
            {loading ? "Creando…" : "Crear cuenta"}
          </button>

          <div className="text-center text-xs text-white/60">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-bold text-chido-cyan">
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}