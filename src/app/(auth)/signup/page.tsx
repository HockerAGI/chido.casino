"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pass });
    setLoading(false);

    if (error) return alert(error.message);
    alert("Cuenta creada. Ahora inicia sesión.");
    router.push("/login");
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-chido-card border border-white/5 p-6">
      <h1 className="text-2xl font-black">Crear cuenta</h1>
      <p className="mt-1 text-white/65">Regístrate con correo y contraseña.</p>

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
          onClick={signup}
          disabled={loading}
          className="w-full rounded-xl bg-chido-green py-3 font-extrabold text-black shadow-neon-green disabled:opacity-60 active:scale-[0.99]"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </div>
    </div>
  );
}