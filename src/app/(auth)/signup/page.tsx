"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
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

function isAdult(dateText: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return false;
  const today = new Date();
  const cutoff = new Date(
    Date.UTC(
      today.getUTCFullYear() - 18,
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );
  return date <= cutoff;
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    if (!SUPABASE_CONFIGURED) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("El registro no está disponible en este entorno.");
      return;
    }
    if (!isAdult(dateOfBirth)) {
      setError("Debes ser mayor de 18 años para crear una cuenta.");
      return;
    }
    if (!legalAccepted) {
      setError("Debes aceptar los Términos y el Aviso de Privacidad.");
      return;
    }
    if (password.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres.");
      return;
    }

    setLoading(true);
    const acceptedAt = new Date().toISOString();
    const callbackUrl = new URL(
      "/auth/callback",
      window.location.origin
    ).toString();

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
        data: {
          date_of_birth: dateOfBirth,
          age_declared_at: acceptedAt,
          terms_accepted_at: acceptedAt,
          privacy_accepted_at: acceptedAt,
          onboarding_version: "prelaunch_v2",
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      await fetch("/api/profile/bootstrap", { method: "POST" }).catch(
        () => null
      );
      router.refresh();
      router.push("/lobby");
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <CheckCircle2 className="mx-auto mb-4 text-[#32CD32]" size={48} />
        <h1 className="text-2xl font-black text-white">Confirma tu correo</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Tu cuenta fue registrada para el entorno prelaunch. Los depósitos,
          apuestas con saldo y premios monetarios permanecen deshabilitados.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-black"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <Image
          src="/chido-logo.png"
          alt="Chido Casino"
          width={120}
          height={120}
          priority
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
        <div className="mb-6 rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/5 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#00F0FF]">
            <ShieldCheck size={15} /> Prelaunch controlado
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Registro para pruebas de producto. Sin depósitos, apuestas con dinero
            real ni premios monetarios hasta completar licencias y controles.
          </p>
        </div>

        <h1 className="text-2xl font-black text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-white/45">
          La edad declarada deberá verificarse durante KYC.
        </p>

        {error && (
          <div className="mt-5 flex gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="mt-5 space-y-3">
          <label className="relative block">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Correo electrónico"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-white/10 bg-black/50 py-4 pl-11 pr-4 text-sm text-white outline-none focus:border-[#32CD32]/60"
            />
          </label>

          <label className="relative block">
            <CalendarDays
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              required
              aria-label="Fecha de nacimiento"
              className="w-full rounded-2xl border border-white/10 bg-black/50 py-4 pl-11 pr-4 text-sm text-white outline-none focus:border-[#32CD32]/60"
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
              placeholder="Contraseña de 10+ caracteres"
              autoComplete="new-password"
              minLength={10}
              required
              className="w-full rounded-2xl border border-white/10 bg-black/50 py-4 pl-11 pr-12 text-sm text-white outline-none focus:border-[#32CD32]/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-white/55">
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(event) => setLegalAccepted(event.target.checked)}
              required
              className="mt-0.5"
            />
            <span>
              Declaro ser mayor de 18 años y acepto los{" "}
              <Link href="/terms" className="text-white underline">
                Términos
              </Link>{" "}
              y el{" "}
              <Link href="/privacy" className="text-white underline">
                Aviso de Privacidad
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#32CD32] to-[#00B050] font-black text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Crear cuenta prelaunch"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-5 block text-center text-sm font-bold text-[#00F0FF]"
        >
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  );
}
