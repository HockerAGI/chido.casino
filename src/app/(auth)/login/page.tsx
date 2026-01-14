"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Logo } from "@/components/ui/logo"; // Logo component
import { Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
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
  };

  return (
    <div className="w-full max-w-md animate-fade-in flex flex-col items-center">
      
      {/* LOGO OFICIAL COMPLETO (Sin texto HTML duplicado) */}
      <div className="mb-10 animate-float">
         <Logo variant="full" size={180} /> 
      </div>
      
      {error && (
        <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2">
           <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 w-full">
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-chido-cyan transition-colors" size={18} />
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm focus:border-chido-cyan outline-none transition-all placeholder:text-zinc-600"
          />
        </div>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-chido-cyan transition-colors" size={18} />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm focus:border-chido-cyan outline-none transition-all placeholder:text-zinc-600"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-chido-cyan hover:scale-[1.02] transition-all shadow-lg mt-4 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : "ENTRAR"}
        </button>
      </form>

      <p className="text-center text-zinc-500 text-xs mt-8">
        ¿Aún no tienes cuenta? <Link href="/signup" className="text-white font-bold hover:underline">Regístrate</Link>
      </p>
    </div>
  );
}