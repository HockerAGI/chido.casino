"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { safeJson } from "@/lib/safeJson";
import { triggerWalletRefresh } from "@/lib/wallet-refresh";
import MercadoPagoPaymentBrick from "./mercadopago-payment-brick";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Landmark,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

type TxRow = {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  metadata?: any;
};

type CreateDepositResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  mode?: "mercadopago" | "stripe";
  checkoutUrl?: string | null;
  initPoint?: string;
  sandboxInitPoint?: string;
  preferenceId?: string;
  sessionId?: string;
  folio?: string;
};

type WithdrawResponse = {
  ok: boolean;
  error?: string;
  status?: string;
  externalId?: string;
};

type DepositMethod = "mercadopago" | "stripe";

type PaymentBrickIntent = {
  amount: number;
  folio: string;
  preferenceId: string;
  fallbackUrl?: string | null;
};

const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "MXN";

function mxn(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export default function WalletClient() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"deposit" | "withdraw">("deposit");

  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [commissionBalance, setCommissionBalance] = useState(0);

  const [txs, setTxs] = useState<TxRow[]>([]);
  const [amount, setAmount] = useState("");

  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("mercadopago");
  const [mpBrickIntent, setMpBrickIntent] = useState<PaymentBrickIntent | null>(null);

  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [clabe, setClabe] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [withdrawType, setWithdrawType] = useState<"balance" | "commission">("balance");

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    const type = (searchParams.get("type") || "").toLowerCase();

    if (t === "withdraw") setSelectedTab("withdraw");
    if (t === "deposit") setSelectedTab("deposit");
    if (type === "commission") setWithdrawType("commission");
  }, [searchParams]);

  useEffect(() => {
    setMpBrickIntent(null);
  }, [amount, depositMethod]);

  const loadWallet = async () => {
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes?.user) {
      setMessage("Inicia sesion para ver tu wallet.");
      setLoading(false);
      return;
    }

    const { data: bal } = await supabase
      .from("balances")
      .select("balance, bonus_balance, locked_balance, commission_balance")
      .eq("user_id", userRes.user.id)
      .maybeSingle();

    setBalance(Number(bal?.balance ?? 0));
    setBonusBalance(Number(bal?.bonus_balance ?? 0));
    setLockedBalance(Number(bal?.locked_balance ?? 0));
    setCommissionBalance(Number(bal?.commission_balance ?? 0));

    const { data: tx } = await supabase
      .from("transactions")
      .select("id, type, amount, created_at, metadata")
      .eq("user_id", userRes.user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    setTxs((tx ?? []) as TxRow[]);
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage(null);
      try {
        await loadWallet();
      } catch (e: any) {
        setMessage(e?.message || "No se pudo cargar la wallet.");
        setLoading(false);
      }
    };

    void load();

    const interval = window.setInterval(() => {
      void loadWallet().catch(() => {});
    }, 20000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const total = balance + bonusBalance;
  const amt = Number(amount);

  const handleDeposit = async () => {
    setMessage(null);

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Ingresa un monto valido.");
      return;
    }

    if (amt < 20) {
      setMessage("El deposito minimo es de $20 MXN.");
      return;
    }

    setDepositLoading(true);

    try {
      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: amt, method: depositMethod }),
      });

      const data = await safeJson<CreateDepositResponse>(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo generar el deposito.");
      }

      const checkoutUrl = data.checkoutUrl || data.initPoint || data.sandboxInitPoint;
      if (data.mode === "stripe") {
        if (!checkoutUrl) {
          throw new Error("Stripe no devolvio URL de checkout.");
        }

        setMessage("Listo. Te estamos mandando a Stripe...");
        window.location.href = checkoutUrl;
        return;
      }

      if (!data.preferenceId || !data.folio) {
        if (!checkoutUrl) {
          throw new Error("Mercado Pago no devolvio datos para continuar.");
        }

        setMessage("Listo. Te estamos mandando a Mercado Pago...");
        window.location.href = checkoutUrl;
        return;
      }

      setMpBrickIntent({
        amount: amt,
        folio: data.folio,
        preferenceId: data.preferenceId,
        fallbackUrl: checkoutUrl,
      });
      setMessage("Completa el pago con Mercado Pago.");
    } catch (e: any) {
      setMessage(e?.message || "No se pudo generar el deposito.");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setMessage(null);

    const withdrawableBalance = withdrawType === "commission" ? commissionBalance : balance;

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Ingresa un monto valido.");
      return;
    }

    if (amt > withdrawableBalance) {
      setMessage("No tienes saldo suficiente para retirar ese monto.");
      return;
    }

    if (!/^[0-9]{18}$/.test(clabe.trim())) {
      setMessage("La CLABE debe tener 18 digitos.");
      return;
    }

    if (beneficiary.trim().length < 3) {
      setMessage("Escribe el nombre del beneficiario.");
      return;
    }

    setWithdrawLoading(true);

    try {
      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          clabe: clabe.trim(),
          beneficiary: beneficiary.trim(),
          from: withdrawType,
        }),
      });

      const data = await safeJson<WithdrawResponse>(res);

      if (!res.ok) {
        if (data?.error === "KYC_REQUIRED") {
          setMessage("Necesitas KYC aprobado para retirar.");
          return;
        }

        setMessage(data?.error || "No se pudo solicitar el retiro.");
        return;
      }

      setMessage("Retiro solicitado. El saldo se actualizo.");
      setAmount("");
      setClabe("");
      setBeneficiary("");
      triggerWalletRefresh();
      await loadWallet();
    } catch (e: any) {
      setMessage(e?.message || "No se pudo solicitar el retiro.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400 py-20 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando wallet...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1a0d] via-[#121214] to-black p-6">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#32CD32]/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#32CD32]/20 bg-[#32CD32]/15">
              <Wallet className="h-5 w-5 text-[#32CD32]" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/50">Chido Wallet</div>
              <div className="text-[10px] text-white/30">Mercado Pago, Stripe y retiros con KYC.</div>
            </div>
          </div>

          <div className="mb-1 text-4xl font-black tabular-nums text-white">
            {mxn(total)} <span className="text-lg text-white/50">{CURRENCY_SYMBOL}</span>
          </div>

          <div className="space-y-1 text-xs text-white/45">
            <div>
              Saldo Real: <b className="text-white">{mxn(balance)}</b>
            </div>
            <div>
              Bono: <b className="text-[#FFD700]">{mxn(bonusBalance)}</b>
            </div>
            <div>
              Procesando: <b className="text-white/60">{mxn(lockedBalance)}</b>
            </div>
            {commissionBalance > 0 && (
              <div>
                Comisiones: <b className="text-[#00F0FF]">{mxn(commissionBalance)}</b>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3 flex-wrap">
            <button
              onClick={() => setSelectedTab("deposit")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                selectedTab === "deposit" ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <ArrowDownToLine size={16} /> Depositar
            </button>
            <button
              onClick={() => setSelectedTab("withdraw")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                selectedTab === "withdraw" ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <ArrowUpFromLine size={16} /> Retirar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {selectedTab === "deposit" ? (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <div className="flex items-center gap-2 text-sm font-black">
                <Sparkles size={18} /> Depositar
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDepositMethod("mercadopago")}
                  className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition-all ${
                    depositMethod === "mercadopago"
                      ? "border-[#32CD32]/60 bg-[#32CD32]/15 text-white"
                      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
                  }`}
                >
                  <span className="mb-1 flex items-center gap-2 text-sm text-white">
                    <Landmark size={16} /> Mercado Pago
                  </span>
                  Principal para tarjeta, SPEI y OXXO.
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMethod("stripe")}
                  className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition-all ${
                    depositMethod === "stripe"
                      ? "border-[#00B0EF]/60 bg-[#00B0EF]/15 text-white"
                      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
                  }`}
                >
                  <span className="mb-1 flex items-center gap-2 text-sm text-white">
                    <CreditCard size={16} /> Stripe
                  </span>
                  Segunda opcion cuando aplique.
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min="20"
                  step="1"
                  placeholder="Monto a depositar (min. $20)"
                  className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30"
                />
                <button
                  onClick={handleDeposit}
                  disabled={depositLoading || (depositMethod === "mercadopago" && Boolean(mpBrickIntent))}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-black transition hover:scale-[1.01] disabled:opacity-40"
                >
                  {depositLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : depositMethod === "mercadopago" && mpBrickIntent ? (
                    "Pago preparado"
                  ) : depositMethod === "mercadopago" ? (
                    "Continuar"
                  ) : (
                    "Crear deposito"
                  )}
                </button>
              </div>

              {depositMethod === "mercadopago" && mpBrickIntent && (
                <MercadoPagoPaymentBrick
                  amount={mpBrickIntent.amount}
                  folio={mpBrickIntent.folio}
                  preferenceId={mpBrickIntent.preferenceId}
                  fallbackUrl={mpBrickIntent.fallbackUrl}
                  onDone={async (nextMessage) => {
                    setMessage(nextMessage);
                    setAmount("");
                    setMpBrickIntent(null);
                    triggerWalletRefresh();
                    await loadWallet();
                  }}
                  onError={(nextMessage) => setMessage(nextMessage)}
                />
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <div className="flex items-center gap-2 text-sm font-black">
                <ArrowUpFromLine size={18} /> Solicitar retiro
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Monto"
                    className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30"
                  />
                  <select
                    value={withdrawType}
                    onChange={(e) => setWithdrawType(e.target.value as "balance" | "commission")}
                    className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
                  >
                    <option value="balance">Saldo real</option>
                    <option value="commission" disabled={commissionBalance <= 0}>
                      Comisiones
                    </option>
                  </select>
                </div>

                <input
                  value={clabe}
                  onChange={(e) => setClabe(e.target.value)}
                  type="text"
                  inputMode="numeric"
                  placeholder="CLABE 18 digitos"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30"
                />
                <input
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  type="text"
                  placeholder="Nombre del beneficiario"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none placeholder:text-white/30"
                />

                <button
                  onClick={handleWithdraw}
                  disabled={withdrawLoading}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#32CD32] to-[#00B050] px-5 text-sm font-black text-black transition hover:scale-[1.01] disabled:opacity-40"
                >
                  {withdrawLoading ? <Loader2 className="animate-spin" size={16} /> : "Solicitar retiro"}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              {message}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="flex items-center gap-2 text-sm font-black">
              <TrendingUp size={18} /> Ultimos movimientos
            </div>

            <div className="mt-4 space-y-3">
              {txs.length === 0 ? (
                <div className="text-sm text-white/45">Aun no tienes movimientos.</div>
              ) : (
                txs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-white capitalize">{tx.type.replace(/_/g, " ")}</div>
                      <div className="text-[11px] text-white/40">{new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`text-sm font-black ${Number(tx.amount) >= 0 ? "text-[#32CD32]" : "text-[#FF5E00]"}`}>
                      {Number(tx.amount) >= 0 ? "+" : ""}
                      {mxn(Number(tx.amount))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/55">
            <div className="flex items-center gap-2 font-black text-white">
              <ShieldCheck size={18} /> Pagos protegidos
            </div>
            <div className="mt-2 leading-relaxed">
              Mercado Pago procesa los depositos como pasarela principal y Stripe queda como segunda opcion. Los retiros requieren KYC aprobado.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
