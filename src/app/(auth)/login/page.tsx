"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

type RiskAttemptResponse = {
  ok?: boolean;
  cooldownSeconds?: number;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => {
    if (typeof window === "undefined" || !SUPABASE_CONFIGURED) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      toast({
        title: "Entorno no configurado",
        description: "El inicio de sesión no está disponible.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const riskResponse = await fetch("/api/auth/risk/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);

      if (!riskResponse) {
        throw new Error("La protección de acceso no está disponible. Intenta más tarde.");
      }
      const risk = await readJson<RiskAttemptResponse>(riskResponse);
      if (!riskResponse.ok || risk?.ok === false) {
        const cooldown = Number(risk?.cooldownSeconds || 0);
        throw new Error(
          cooldown > 0
            ? `Demasiados intentos. Espera ${cooldown} segundos.`
            : "La protección de acceso bloqueó temporalmente el intento."
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error("No se pudo crear una sesión válida.");

      const reset = await fetch("/api/auth/risk/reset", {
        method: "POST",
      }).catch(() => null);
      if (!reset?.ok) {
        console.warn("Authenticated login rate reset was not confirmed");
      }

      await fetch("/api/affiliates/attribution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => null);

      router.push("/lobby");
      router.refresh();
    } catch (error) {
      toast({
        title: "No se pudo iniciar sesión",
        description:
          error instanceof Error ? error.message : "Error de autenticación.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-7 flex justify-center">
        <Image
          src="/chido-logo.png"
          alt="Chido Casino"
          width={120}
          height={120}
          priority
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
        <div className="mb-5 rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FFD700]">
            <ShieldCheck size={15} /> Prelaunch controlado
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Sin depósitos, apuestas con dinero real ni premios monetarios.
          </p>
        </div>

        <h1 className="text-2xl font-black text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-white/45">
          Acceso al entorno de validación de CHIDO.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <label className="relative block">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/50 py-4 pl-11 pr-4 text-sm text-white outline-none focus:border-[#00F0FF]/60"
            />
          </label>

          <label className="relative block">
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/50 py-4 pl-11 pr-12 text-sm text-white outline-none focus:border-[#00F0FF]/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-white/45 hover:text-[#00F0FF]"
            >
              Recuperar contraseña
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00F0FF] to-[#32CD32] font-black text-black disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            {loading ? "Verificando…" : "Entrar a pruebas"}
          </button>
        </form>

        <Link
          href="/signup"
          className="mt-4 flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white/70 hover:bg-white/10"
        >
          Crear cuenta prelaunch
        </Link>
      </div>
    </div>
  );
}
