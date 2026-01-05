"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);

    if (error) return alert(error.message);
    router.push("/wallet");
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-chido-card border border-white/5 p-6">
      <h1 className="text-2xl font-black">Iniciar sesión</h1>

      <div className="mt-5 space-y-3">
        <input
          className="w-full rounded-xl bg-black/40 border border-white/10 p-3 outline-none"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl bg-black/40 border border-white/10 p-3 outline-none"
          placeholder="Contraseña"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        <button
          onClick={login}
          disabled={loading}
          className="w-full rounded-xl bg-chido-green py-3 font-extrabold text-black shadow-neon-green disabled:opacity-60 active:scale-[0.99]"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            alert("Sesión cerrada");
          }}
          className="w-full rounded-xl border border-white/10 py-3 font-bold text-white/80 active:scale-[0.99]"
        >
          Cerrar sesión (si estabas dentro)
        </button>
      </div>
    </div>
  );
}