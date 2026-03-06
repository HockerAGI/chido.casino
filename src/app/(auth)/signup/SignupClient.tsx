"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignupClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const ref = useMemo(() => params.get("ref") || "", [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // UX: si viene referral, lo guardamos para usarlo después si quieres.
    // (no rompe nada aunque no lo uses)
  }, [ref]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast({
        title: "Correo inválido",
        description: "Échame un correo válido pa’ poderte registrar.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "Mínimo 6 caracteres, pa’ que no te tumben fácil.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || null,
            referred_by: ref || null,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Listo ✅",
        description:
          "Ya casi… revisa tu correo para confirmar tu cuenta (si aplica).",
      });

      // Si Supabase no requiere confirmación, lo manda con sesión inmediata.
      if (data?.session) {
        router.push("/lobby");
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      toast({
        title: "No se armó el registro",
        description: err?.message || "Intenta otra vez.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <div className="text-2xl font-black tracking-tight text-white">
          Crear cuenta
        </div>
        <div className="mt-1 text-sm text-white/60">
          Ármate tu cuenta y vámonos recio.
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-widest">
              Nombre (opcional)
            </div>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-2 bg-black/40 border-white/10 text-white"
              placeholder="Ej: Armando"
              autoComplete="nickname"
            />
          </div>

          <div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-widest">
              Correo
            </div>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 bg-black/40 border-white/10 text-white"
              placeholder="tucorreo@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-widest">
              Contraseña
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 bg-black/40 border-white/10 text-white"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 rounded-2xl font-black bg-[#00F0FF] text-black hover:bg-[#00d6e6]"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </Button>

          <div className="mt-2 text-sm text-white/60">
            ¿Ya tienes cuenta?{" "}
            <Link className="text-[#00F0FF] font-bold" href="/login">
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}