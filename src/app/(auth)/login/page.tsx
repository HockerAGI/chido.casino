"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Logo } from "@/components/ui/logo";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push("/lobby");
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="mb-8 animate-float flex justify-center w-full">
         <Logo variant="giant" size={120} showText={false} /> 
      </div>
      <h2 className="text-3xl font-black text-white text-center mb-1 tracking-tighter">CHIDO CASINO</h2>
      <p className="text-zinc-400 text-center text-sm mb-8 font-medium">La plataforma #1 de México</p>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2">
           <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:border-chido-cyan outline-none transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:border-chido-cyan outline-none transition-colors placeholder:text-zinc-600"
          />
        </div>
        <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-chido-cyan hover:scale-[1.02] transition-all shadow-lg mt-2">
          ENTRAR AHORA
        </button>
      </form>

      <p className="text-center text-zinc-500 text-xs mt-6">
        ¿No tienes cuenta? <Link href="/signup" className="text-white font-bold hover:underline">Regístrate en fa</Link>
      </p>
    </div>
  );
}