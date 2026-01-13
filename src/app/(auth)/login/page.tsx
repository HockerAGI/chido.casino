"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, ShieldCheck } from "lucide-react";

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
       setError("No pudimos encontrar tu cuenta. Verifica tus datos.");
       setLoading(false);
    } else {
       router.push("/lobby");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-chido-bg relative overflow-hidden">
      
      {/* Fondo Animado Sutil */}
      <div className="absolute inset-0 bg-mexican-pattern opacity-5" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-chido-pink via-chido-cyan to-chido-green" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* LOGO GIGANTE (PROTAGONISTA ABSOLUTO) */}
        <div className="mb-12 animate-float transform hover:scale-105 transition-transform duration-500">
           <Logo variant="giant" showText={true} />
        </div>

        <div className="w-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Brillo superior */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <h2 className="text-2xl font-black text-white text-center mb-1">¡Qué onda de nuevo!</h2>
          <p className="text-zinc-400 text-center text-sm mb-8">Ingresa para seguir ganando.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Correo Electrónico</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors"
                placeholder="ejemplo@chidocasino.com"
              />
            </div>
            <div>
               <div className="flex justify-between ml-1 mb-1">
                 <label className="text-xs font-bold text-zinc-500 uppercase">Contraseña</label>
                 <Link href="/recover" className="text-xs text-chido-cyan hover:underline">¿Olvidaste tu clave?</Link>
               </div>
               <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-center flex items-center justify-center gap-2">
                ⚠️ {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-chido-cyan to-blue-600 text-white font-black py-4 rounded-xl text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? "Entrando..." : "ENTRAR AHORA"} <ArrowRight size={20} />
            </button>
          </form>
          
          <div className="mt-8 text-center pt-6 border-t border-white/5">
             <p className="text-sm text-zinc-500 mb-2">¿Aún no tienes cuenta?</p>
             <Link href="/signup" className="text-chido-pink font-black hover:text-white transition-colors uppercase tracking-wide text-sm">
               ¡Regístrate y recibe $5,000!
             </Link>
          </div>
        </div>
        
        {/* SELLO DE AGIs (Discreto) */}
        <div className="mt-8 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Sistema de Seguridad Hocker AGI Activo">
           <ShieldCheck size={14} className="text-chido-green" />
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Protección Vertx Activa</span>
        </div>

      </div>
    </div>
  );
}
