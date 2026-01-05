import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-chido-card p-6 border border-white/5">
        <h1 className="text-3xl font-black">
          <span className="text-chido-cyan drop-shadow-[0_0_14px_rgba(0,240,255,0.55)]">CHIDO</span>{" "}
          <span className="text-chido-red drop-shadow-[0_0_14px_rgba(255,61,0,0.55)]">CASINO</span>
        </h1>
        <p className="mt-2 text-white/70">
          MVP listo: login real + wallet + depósito por Stripe (con webhook que acredita saldo).
        </p>

        <div className="mt-5 flex gap-3">
          <Link
            className="rounded-xl bg-chido-green px-4 py-3 font-extrabold text-black shadow-neon-green active:scale-95"
            href="/signup"
          >
            Crear cuenta
          </Link>
          <Link
            className="rounded-xl border border-white/10 px-4 py-3 font-bold text-white/85 active:scale-95"
            href="/login"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-chido-card p-6">
        <h2 className="text-lg font-extrabold text-white">Siguiente paso</h2>
        <p className="mt-1 text-white/70">
          Cuando esto ya corra, agregamos el primer juego (Mines/Plinko) con ledger y reglas.
        </p>
        <Link className="mt-4 inline-block text-chido-cyan font-bold" href="/wallet">
          Ir a Wallet →
        </Link>
      </div>
    </div>
  );
}