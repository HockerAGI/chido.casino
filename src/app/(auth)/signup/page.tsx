"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, ShieldCheck, Gift } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ 
      email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` }
    });
    if (error) { setError(error.message); setLoading(false); } else { router.push("/lobby"); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#050510] relative overflow-hidden">
      <div className="absolute inset-0 bg-mexican-pattern opacity-10 animate-pulse-slow" />
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="mb-8 animate-float">
           <Logo variant="giant" showText={true} />
        </div>
        <div className="w-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,240,255,0.15)] relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-chido-pink to-chido-red text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 whitespace-nowrap">
            <Gift size={14} /> Bono: $5,000 MXN
          </div>
          <h2 className="text-2xl font-black text-white text-center mt-4 mb-1">Únete a la Élite</h2>
          <form onSubmit={handleSignup} className="space-y-4 mt-6">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors" placeholder="ganador@ejemplo.com" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-chido-cyan outline-none transition-colors" placeholder="••••••••" />
            {error && <div className="text-chido-red text-xs text-center font-bold">{error}</div>}
            <button disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4">
              {loading ? "..." : "CREAR CUENTA"} <ArrowRight size={20} />
            </button>
          </form>
          <div className="mt-6 text-center">
             <Link href="/login" className="text-zinc-500 hover:text-white text-sm transition-colors">¿Ya tienes cuenta? <span className="font-bold underline">Inicia Sesión</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
