import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-[#06070b] text-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <img
              src="/chido-logo.png"
              alt="Chido Casino"
              className="h-14 w-14 drop-shadow-[0_0_18px_rgba(0,240,255,0.20)]"
              draggable={false}
            />
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                <span className="text-chido-cyan">CHIDO</span>{" "}
                <span className="text-chido-red">CASINO</span>
              </h1>
              <p className="text-white/60">
                Auth + Lobby tipo app + Wallet realtime (balances) + Depósitos Stripe.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-white/10 px-5 py-3 font-extrabold text-white hover:bg-white/15 active:scale-[0.98]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 px-5 py-3 font-extrabold text-black hover:brightness-105 active:scale-[0.98]"
            >
              Crear cuenta
            </Link>
            <Link
              href="/lobby"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 font-bold text-white/80 hover:bg-white/[0.06] active:scale-[0.98]"
            >
              Ir al Lobby →
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-extrabold">Modo Casino Pro</h2>
          <p className="mt-1 text-white/60">
            Diseño minimal premium, microfeedback, PWA, y seguridad base (risk server-side).
          </p>
        </div>
      </div>
    </div>
  );
}