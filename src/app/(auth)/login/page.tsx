"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Logo } from "@/components/ui/logo";
import { Loader2, Lock, Mail } from "lucide-react";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginPage() {
  const supabase = useMemo(() => {
    if (!SUPABASE_CONFIGURED) return null as any;
    try { return createClientComponentClient(); } catch { return null as any; }
  }, []);
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      toast({ title: "Config pendiente", description: "Falta configurar las variables de entorno de Supabase. Ver guía en Replit.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const riskRes = await fetch("/api/auth/risk/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);

      if (riskRes) {
        const r = await riskRes.json().catch(() => ({}));
        if (riskRes.ok === false || r?.ok === false) {
          const cd = Number(r?.cooldownSeconds || 0);
          toast({
            title: "Protección activa",
            description: cd > 0 ? `Espera ${cd}s e intenta de nuevo.` : "Espera un momento e intenta de nuevo.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      await fetch("/api/auth/risk/reset", { method: "POST" }).catch(() => {});
      await fetch("/api/affiliates/attribution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});

      toast({ title: "Bienvenido", description: "Acceso concedido." });
      router.push("/lobby");
      router.refresh();
    } catch (err: any) {
      toast({
        title: "No se pudo entrar",
        description: err.message || "Verifica tu correo y contraseña.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100vh] items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md rounded-3xl border-white/10 bg-white/5 p-6 text-white">
        <div className="mb-6 flex items-center justify-center">
          <Logo variant="full" size={160} />
        </div>

        {!SUPABASE_CONFIGURED && (
          <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400 font-medium leading-relaxed">
            ⚠️ <b>Configuración pendiente:</b> Añade <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en las variables de entorno de Replit para activar el login.
          </div>
        )}

        <h1 className="text-2xl font-black">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-white/60">Accede a tu cuenta.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 text-white pl-12 pr-4 py-4 text-sm outline-none focus:border-[#00F0FF]"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 text-white pl-12 pr-4 py-4 text-sm outline-none focus:border-[#00F0FF]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-white text-black hover:bg-white/90 font-black disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Entrar"}
          </button>

          <div className="text-center text-xs text-white/60 pt-2">
            ¿No tienes cuenta?{" "}
            <Link href="/signup" className="text-[#00F0FF] font-black hover:underline">
              Crear cuenta
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}