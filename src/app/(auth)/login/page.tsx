"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      setLoading(false);
    } else {
      router.push("/lobby");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] bg-mexican-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* LOGO GIGANTE Y CENTRADO */}
        <div className="flex flex-col items-center mb-8">
            <div className="animate-float mb-4">
                <Logo variant="giant" size={120} showText={false} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">CHIDO CASINO</h1>
            <p className="text-zinc-400 text-sm font-medium">Tu suerte comienza aquí.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-chido-cyan focus:bg-black/80 outline-none transition-all"
                placeholder="usuario@ejemplo.com"
                required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Contraseña</label>
            <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-chido-cyan focus:bg-black/80 outline-none transition-all"
                placeholder="••••••••"
                required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-chido-cyan to-blue-600 text-white font-black py-4 rounded-xl text-lg hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>ENTRAR <ArrowRight size={20} /></>}
          </button>
        </form>
        
        <p className="text-center mt-8 text-sm text-zinc-500">
          ¿No tienes cuenta? <Link href="/signup" className="text-chido-pink font-bold hover:underline">Regístrate en fa</Link>
        </p>
      </div>
    </div>
  );
}
