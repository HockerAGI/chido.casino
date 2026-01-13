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
       setError("No te encontramos. Checa tu correo.");
       setLoading(false);
    } else {
       router.push("/lobby");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#050510] relative overflow-hidden">
      <div className="absolute inset-0 bg-mexican-pattern opacity-5" />
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        <div className="mb-12 animate-float">
           <Logo variant="giant" showText={true} />
        </div>

        <div className="w-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-2xl font-black text-white text-center mb-1">¡Qué onda de nuevo!</h2>
          <p className="text-zinc-400 text-center text-sm mb-8">Ingresa para seguir ganando.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors"
              placeholder="correo@ejemplo.com"
            />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors"
              placeholder="••••••••"
            />
            {error && <div className="text-red-400 text-xs text-center font-bold">{error}</div>}
            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-chido-cyan to-blue-600 text-white font-black py-4 rounded-xl text-lg hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2"
            >
              {loading ? "..." : "ENTRAR"} <ArrowRight size={20} />
            </button>
          </form>
          <div className="mt-8 text-center pt-6 border-t border-white/5">
             <Link href="/signup" className="text-chido-pink font-black hover:text-white transition-colors uppercase text-sm">
               ¡Regístrate y recibe $5,000!
             </Link>
          </div>
        </div>
        
        <div className="mt-8 flex items-center gap-2 opacity-50">
           <ShieldCheck size={14} className="text-chido-green" />
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Protección Vertx Activa</span>
        </div>
      </div>
    </div>
  );
}
