"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Logo } from "@/components/ui/logo";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
       setError("Credenciales incorrectas. Intenta de nuevo.");
       setLoading(false);
    } else {
       router.push("/lobby");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-chido-bg relative overflow-hidden">
      
      {/* Fondo Animado Alebrije (Puro CSS/Tailwind) */}
      <div className="absolute inset-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-chido-pink/20 blur-[150px] rounded-full animate-pulse-slow" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-chido-cyan/20 blur-[150px] rounded-full" />
         <div className="absolute inset-0 bg-mexican-pattern opacity-10" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* LOGO GIGANTE PROTAGONISTA */}
        <div className="flex justify-center mb-10 animate-float">
           <Logo variant="giant" showText={true} />
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-2xl font-black text-white text-center mb-2">Bienvenido de Vuelta</h2>
          <p className="text-zinc-400 text-center text-sm mb-8">Ingresa a tu cuenta oficial Chido Casino</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Correo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
               <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Contraseña</label>
               <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-chido-cyan to-blue-500 text-black font-black py-4 rounded-xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? "Entrando..." : "INICIAR SESIÓN"} <ArrowRight size={20} />
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-zinc-500">
             ¿No tienes cuenta? <Link href="/signup" className="text-white font-bold hover:text-chido-pink transition-colors">Regístrate y gana</Link>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-6 opacity-50">
           {/* Trust Badges Minimalistas */}
           <div className="w-8 h-8 rounded-full bg-white/10" />
           <div className="w-8 h-8 rounded-full bg-white/10" />
           <div className="w-8 h-8 rounded-full bg-white/10" />
        </div>

      </div>
    </div>
  );
}
