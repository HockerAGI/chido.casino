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

export default function WalletClient() {
  const router = useRouter();
  const params = useSearchParams();

  const { loading, userId, formatted, currency } = useWalletBalance();

  const [amount, setAmount] = useState("200");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const depositFlag = params.get("deposit");

  useEffect(() => {
    if (depositFlag === "ok")
      setMsg("Depósito iniciado. Se acredita cuando Stripe confirma el pago.");
    if (depositFlag === "cancel") setMsg("Depósito cancelado.");
    if (depositFlag === "1") setMsg(null);
  }, [depositFlag]);

  // 🔐 validar sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

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
        return;
      }

      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amountNumber }),
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
              <img
                src="/chido-logo.png"
                alt="Chido Casino"
                className="h-10 w-10"
                draggable={false}
              />
              <div>
                <div className="text-lg font-black">Wallet</div>
                <div className="text-xs text-white/55">
                  Realtime (balances) + Stripe
                </div>
              </div>
            </div>

            <Link
              href="/lobby"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/[0.06]"
            >
              Volver al Lobby
            </Link>
          </div>

          {/* Balance */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/55">Balance</div>
              <div className="text-xs text-white/45">{currency}</div>
            </div>
            <div className="mt-2 text-3xl font-black">
              <span>$</span>{" "}
              <span>{loading ? "—" : formatted}</span>
            </div>
          </div>

          {/* Depósito */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-extrabold">Crear depósito</div>
              <p className="mt-1 text-xs text-white/55">
                Mínimo $50 · Máximo $50,000 MXN
              </p>

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
                inputMode="numeric"
              />

              <button
                onClick={createDeposit}
                disabled={!canDeposit}
                className={cn(
                  "mt-4 w-full rounded-2xl px-4 py-3 font-black transition",
                  canDeposit
                    ? "bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 text-black"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                )}
              >
                {creating ? (
                  <span className="inline-flex items-center gap-2">
                    <SoftSpinner /> Creando…
                  </span>
                ) : (
                  "Ir a pagar"
                )}
              </button>
            </div>

            {/* Estado */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-extrabold">Estado</div>

              {msg && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
                  {msg}
                </div>
              )}

              <div className="mt-3 text-xs text-white/60">
                El saldo se acredita cuando Stripe confirma el pago vía webhook.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
          <div className="flex gap-2">
            <Link
              href="/lobby"
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-bold"
            >
              Lobby
            </Link>
            <Link
              href="/wallet"
              className="flex-1 rounded-2xl bg-white/15 px-4 py-3 text-center text-sm font-black"
            >
              Wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}