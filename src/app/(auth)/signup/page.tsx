"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Logo } from "@/components/ui/logo"; 
import { Lock, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false); // Estado para mostrar mensaje de éxito
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // USAMOS SIGNUP (REGISTRO) EN LUGAR DE SIGNIN
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Redirige aquí después de confirmar correo (si está habilitado)
        emailRedirectTo: `${location.origin}/api/auth/callback`, 
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Si Supabase devuelve sesión (confirmación desactivada), entra directo
      if (data.session) {
        router.refresh();
        router.push("/lobby");
      } else {
        // Si no hay sesión, requiere confirmación de correo
        setSuccess(true);
        setLoading(false);
      }
    }
  };

  // Vista de éxito (si requiere confirmar correo)
  if (success) {
    return (
      <div className="w-full max-w-md animate-fade-in flex flex-col items-center text-center p-6 bg-zinc-900/50 border border-white/10 rounded-3xl">
        <CheckCircle2 size={60} className="text-chido-green mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">¡Cuenta Creada!</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Te hemos enviado un correo de confirmación a <strong>{email}</strong>. 
          Revisa tu bandeja (y spam) para activar tu cuenta.
        </p>
        <Link href="/login" className="text-chido-cyan font-bold hover:underline">
          Volver a Iniciar Sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in flex flex-col items-center">
      
      {/* LOGO OFICIAL */}
      <div className="mb-10 animate-float">
         <Logo variant="full" size={180} /> 
      </div>
      
      {error && (
        <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2">
           <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4 w-full">
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-chido-cyan transition-colors" size={18} />
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm focus:border-chido-cyan outline-none transition-all placeholder:text-zinc-600"
            required
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
            required
            minLength={6}
          />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-chido-pink to-chido-red text-white font-black py-4 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(255,0,153,0.3)] mt-4 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : "CREAR CUENTA"}
        </button>
      </form>

      <p className="text-center text-zinc-500 text-xs mt-8">
        ¿Ya tienes cuenta? <Link href="/login" className="text-white font-bold hover:underline">Inicia Sesión</Link>
      </p>
    </div>
  );
}