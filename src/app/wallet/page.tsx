"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

type Tx = {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
};

export default function WalletPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const depositStatus = sp.get("deposit");

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [balance, setBalance] = useState<number>(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositLoading, setDepositLoading] = useState(false);

  const presets = useMemo(() => [100, 200, 500], []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email ?? null);
      await refresh(data.user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async (uid: string) => {
    const prof = await supabase.from("profiles").select("balance").eq("id", uid).single();
    if (!prof.error && prof.data?.balance != null) setBalance(Number(prof.data.balance));

    const t = await supabase
      .from("transactions")
      .select("id,amount,type,status,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(12);

    if (!t.error && t.data) setTxs(t.data as Tx[]);
  };

  const startDeposit = async (amountMXN: number) => {
    if (!userId || !email) return alert("Falta sesión o correo.");
    setDepositLoading(true);

    const res = await fetch("/api/payments/create-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMXN, userId, email })
    });

    const data = await res.json();
    setDepositLoading(false);

    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    alert(data?.error ?? "No se pudo iniciar depósito");
  };

  if (loading) return <div className="text-white/70">Cargando wallet...</div>;

  return (
    <div className="space-y-6">
      {depositStatus === "ok" && (
        <div className="rounded-xl border border-chido-green/30 bg-chido-card p-4 text-chido-green">
          Depósito iniciado. Si fue OXXO, se acredita cuando Stripe confirme el pago.
        </div>
      )}
      {depositStatus === "cancel" && (
        <div className="rounded-xl border border-chido-red/30 bg-chido-card p-4 text-chido-red">
          Depósito cancelado.
        </div>
      )}

      <div className="rounded-2xl bg-chido-card border border-white/5 p-6">
        <p className="text-white/60 text-sm">Tu saldo</p>
        <div className="="mt-1 flex items-end gap-2">
          <span className="text-5xl font-black text-chido-green">${balance.toFixed(2)}</span>
          <span className="pb-2 text-white/60 font-bold">MXN</span>
        </div>

        <div className="mt-5">
          <p className="text-white/70 font-bold mb-3">Depositar</p>
          <div className="flex gap-3 flex-wrap">
            {presets.map((a) => (
              <button
                key={a}
                onClick={() => startDeposit(a)}
                disabled={depositLoading}
                className="rounded-xl bg-chido-green px-4 py-3 font-extrabold text-black shadow-neon-green disabled:opacity-60 active:scale-[0.99]"
              >
                ${a}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/55">
            * Se crea un depósito “pendiente” y se acredita cuando el webhook de Stripe confirme.
          </p>

          <button
            onClick={async () => {
              const { data } = await supabase.auth.getUser();
              if (data.user) await refresh(data.user.id);
            }}
            className="mt-4 rounded-xl border border-white/10 px-4 py-3 font-bold text-white/80 active:scale-[0.99]"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-chido-card border border-white/5 p-6">
        <h2 className="text-lg font-extrabold">Movimientos</h2>
        <div className="mt-3 space-y-2">
          {txs.length === 0 && <div className="text-white/60">Aún no hay movimientos.</div>}
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3">
              <div>
                <div className="font-bold">{t.type}</div>
                <div className="text-xs text-white/55">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className={`font-black ${Number(t.amount) >= 0 ? "text-chido-green" : "text-chido-red"}`}>
                  {Number(t.amount) >= 0 ? "+" : "-"}${Math.abs(Number(t.amount)).toFixed(2)}
                </div>
                <div className="text-xs text-white/55">{t.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}