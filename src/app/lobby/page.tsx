"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";

export default function LobbyPage() {
  const router = useRouter();
  const { loading, userId, formatted, currency, error } = useWalletBalance();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] bg-[#06070b] text-white px-4 py-10 page-in">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/chido-logo.png"
                alt="Chido Casino"
                className="h-12 w-12 drop-shadow-[0_0_18px_rgba(0,240,255,0.20)]"
                draggable={false}
              />
              <div>
                <div className="text-xl font-black tracking-tight">
                  <span className="text-chido-cyan">CHIDO</span>{" "}
                  <span className="text-chido-red">CASINO</span>
                </div>
                <div className="text-xs text-white/55">
                  Lobby tipo app · wallet realtime · depósitos Stripe
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/85 hover:bg-white/[0.06] active:scale-[0.98]"
            >
              Salir
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/55">Balance</div>
                <div className="text-xs text-white/45">{currency}</div>
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight">
                <span className="text-white/90">$</span>
                <span className="text-white">{loading ? "—" : formatted}</span>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[55%] animate-shimmer rounded-full bg-gradient-to-r from-cyan-300/70 via-emerald-300/70 to-cyan-300/70" />
              </div>

              <p className="mt-3 text-xs text-white/55">
                {error ? `Realtime/DB: ${error}` : "Se actualiza en tiempo real (balances)."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/wallet"
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-extrabold hover:bg-white/15 active:scale-[0.98]"
                >
                  Wallet
                </Link>
                <Link
                  href="/wallet?deposit=1"
                  className="rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 px-4 py-2 text-sm font-extrabold text-black hover:brightness-105 active:scale-[0.98]"
                >
                  Depositar
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-extrabold text-white/85">Juegos (MVP)</div>
              <p className="mt-1 text-xs text-white/55">
                Tiles listos para conectar a Mines/Plinko. Aquí va el “feeling” premium.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-black">Mines</div>
                  <div className="mt-1 text-xs text-white/55">Próximo sprint</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-black">Plinko</div>
                  <div className="mt-1 text-xs text-white/55">Próximo sprint</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
                <div className="font-bold text-white/75">Sesión</div>
                <div className="mt-1">
                  {userId ? `OK: ${userId.slice(0, 8)}…` : "No hay sesión. Ve a login."}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
                <div className="font-bold text-white/75">Nota pro</div>
                <div className="mt-1">
                  Depósitos se acreditan por webhook → RPC atómica (evita doble abono).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom nav estilo app */}
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/lobby"
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-black hover:bg-white/15"
            >
              Lobby
            </Link>
            <Link
              href="/wallet"
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-bold text-white/80 hover:bg-white/[0.06]"
            >
              Wallet
            </Link>
            <Link
              href="/wallet?deposit=1"
              className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 px-4 py-3 text-center text-sm font-black text-black hover:brightness-105"
            >
              Depositar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}