"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // 🔥 Afiliados: si venía con cookie chido_ref, aquí se atribuye al usuario logueado
      await fetch("/api/affiliates/attribution", { method: "POST" }).catch(() => {});

      toast({ title: "Bienvenido", description: "Acceso concedido." });
      router.push("/lobby");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo iniciar sesión.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md rounded-3xl border-white/10 bg-white/5 p-6 text-white">
        <div className="mb-6 flex items-center justify-center">
          <Image src="/chido-logo.png" alt="CHIDO" width={160} height={48} priority />
        </div>

        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-white/60">Accede a tu cuenta.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border-white/10 bg-black/40 text-white"
            required
          />

          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border-white/10 bg-black/40 text-white"
            required
          />

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-white text-black hover:bg-white/90"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}