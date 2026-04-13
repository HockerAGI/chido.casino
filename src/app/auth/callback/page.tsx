import { Suspense } from "react";
import AuthCallbackClient from "./auth-callback-client";

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#050510] text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-[0_32px_80px_rgba(0,0,0,0.55)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF]/30 border-t-[#00F0FF]" />
        </div>
        <h1 className="text-2xl font-black text-white">Confirmación de cuenta</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">Validando tu acceso...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage({
  searchParams,
}: {
  searchParams?: { code?: string | string[]; error?: string | string[]; error_description?: string | string[] };
}) {
  const code = Array.isArray(searchParams?.code)
    ? searchParams?.code[0]
    : searchParams?.code || "";

  const error = Array.isArray(searchParams?.error)
    ? searchParams?.error[0]
    : searchParams?.error || "";

  const errorDescription = Array.isArray(searchParams?.error_description)
    ? searchParams?.error_description[0]
    : searchParams?.error_description || "";

  return (
    <Suspense fallback={<LoadingState />}>
      <AuthCallbackClient code={code} error={error} errorDescription={errorDescription} />
    </Suspense>
  );
}