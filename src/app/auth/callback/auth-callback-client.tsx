"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AuthCallbackClient({
  code,
  error,
  errorDescription,
}: {
  code: string;
  error: string;
  errorDescription: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("Validando tu cuenta...");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (error) {
        setLocalError(errorDescription || error || "Hubo un problema con la confirmación.");
        setTimeout(() => router.replace("/login"), 1500);
        return;
      }

      if (!code) {
        setLocalError("Falta el código de confirmación.");
        setTimeout(() => router.replace("/login"), 1200);
        return;
      }

      try {
        const supabase = createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setLocalError(exchangeError.message);
          setTimeout(() => router.replace("/login"), 1500);
          return;
        }

        setMessage("Cuenta confirmada. Entrando al lobby...");
        setTimeout(() => router.replace("/lobby"), 900);
      } catch (e: any) {
        setLocalError(e?.message || "No se pudo completar la confirmación.");
        setTimeout(() => router.replace("/login"), 1500);
      }
    };

    void run();
  }, [code, error, errorDescription, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#050510] text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/10">
          <ShieldCheck className="text-[#00F0FF]" size={30} />
        </div>

        <h1 className="text-2xl font-black text-white">Confirmación de cuenta</h1>

        <p className="mt-3 text-sm leading-relaxed text-white/55">{localError ? localError : message}</p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/35">
          <Loader2 className="animate-spin" size={14} />
          Procesando...
        </div>
      </div>
    </div>
  );
}