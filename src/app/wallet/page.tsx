"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { cn } from "@/lib/cn";

function SoftSpinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
  );
}

export default function WalletPage() {
  const router = useRouter();
  const params = useSearchParams();

  const { loading, userId, formatted, currency } = useWalletBalance();

  const [amount, setAmount] = useState<string>("200");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const depositFlag = params.get("deposit");

  useEffect(() => {
    if (depositFlag === "ok") setMsg("Depósito iniciado. Se acredita cuando Stripe confirma el pago.");
    if (depositFlag === "cancel") setMsg("Depósito cancelado.");
    if (depositFlag === "1") setMsg(null);
  }, [depositFlag]);

  // si no hay sesión, manda a login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  }, [amount]);

  const canDeposit = useMemo(() => {
    return !creating && !!userId && amountNumber >= 50 && amountNumber <= 50000;
  }, [creating, userId, amountNumber]);

  async function createDeposit() {
    setMsg(null);
    if (!canDeposit) return;

    setCreating(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push("/login");
        router.refresh();
        return;
      }

      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amountNumber })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setMsg(json?.error || "No se pudo crear el depósito.");
        return;
      }

      window.location.href = json.url;
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#06070b] text-white px-4 py-10 page-in">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/chido-logo.png" alt="Chido Casino" className="h-10 w-10" draggable={false} />
              <div>
                <div className="text-lg font-black">Wallet</div>
                <div className="text-xs text-white/55">Realtime (balances) + Depósitos Stripe</div>
              </div>
            </div>
            <Link
              href="/lobby"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/[0.06]"
            >
              Volver al Lobby
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
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
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-extrabold text-white/85">Crear depósito</div>
              <p className="mt-1 text-xs text-white/55">
                Card / OXXO (según Stripe). Mínimo $50, máximo $50,000.
              </p>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold text-white/75">Monto (MXN)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/25"
                  placeholder="Ej: 200"
                  inputMode="numeric"
                />
              </div>

              <button
                onClick={createDeposit}
                disabled={!canDeposit}
                className={cn(
                  "mt-4 w-full rounded-2xl px-4 py-3 font-black shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition active:scale-[0.99]",
                  canDeposit
                    ? "bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 text-black hover:brightness-105"
                    : "cursor-not-allowed bg-white/10 text-white/40"
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {creating ? <SoftSpinner /> : null}
                  {creating ? "Creando..." : "Ir a pagar"}
                </span>
              </button>

              <div className="mt-2 text-xs text-white/50">
                El saldo se acredita por webhook cuando Stripe confirma el pago.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-extrabold text-white/85">Estado</div>
              <p className="mt-1 text-xs text-white/55">Mensajes del depósito y sesión.</p>

              {msg && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/85">
                  {msg}
                </div>
              )}

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
                <div className="font-bold text-white/75">Sesión</div>
                <div className="mt-1">
                  {userId ? `OK (${userId.slice(0, 8)}…)` : "No hay sesión (regresa al login)."}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
                <div className="font-bold text-white/75">Integridad</div>
                <div className="mt-1">
                  Confirmación atómica vía RPC: evita doble abono si Stripe reintenta eventos.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom nav estilo app */}
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/lobby"
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-bold text-white/80 hover:bg-white/[0.06]"
            >
              Lobby
            </Link>
            <Link
              href="/wallet"
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-black hover:bg-white/15"
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