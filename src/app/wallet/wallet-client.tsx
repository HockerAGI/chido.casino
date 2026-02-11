"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  MessageCircle,
  Wallet,
} from "lucide-react";

type TxRow = {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  metadata?: any;
};

type ManualInstructions = {
  clabe: string;
  beneficiary: string;
  institution?: string;
  amount: number;
  folio: string;
  concept: string;
  phone?: string;
  generated_at?: string;
};

type ManualRequest = {
  id: string;
  folio: string;
  amount: number;
  currency?: string;
  status?: string;
  created_at?: string;
};

type DepositProvider = {
  redirect_url: string;
  provider?: string;
  intent_id?: string;
};

type CreateDepositResponse =
  | {
      ok: true;
      mode: "provider";
      message: string;
      deposit: DepositProvider;
    }
  | {
      ok: true;
      mode: "manual";
      message: string;
      instructions: ManualInstructions;
      request: ManualRequest;
      whatsapp_url?: string;
      telegram_username?: string | null;
    }
  | { ok: false; error: string };

export default function WalletClient() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"deposit" | "withdraw">("deposit");

  const [balance, setBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [lockedBalance, setLockedBalance] = useState<number>(0);

  const [txs, setTxs] = useState<TxRow[]>([]);
  const [amount, setAmount] = useState<string>("");

  // deposit
  const [depositMethod, setDepositMethod] = useState<"card" | "spei" | "oxxo">("spei");
  const [depositLoading, setDepositLoading] = useState(false);
  const [deposit, setDeposit] = useState<DepositProvider | null>(null);

  const [instructions, setInstructions] = useState<ManualInstructions | null>(null);
  const [manualReq, setManualReq] = useState<ManualRequest | null>(null);
  const [whatsUrl, setWhatsUrl] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<string | null>(null);

  // withdraw
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [clabe, setClabe] = useState("");
  const [beneficiary, setBeneficiary] = useState("");

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        setMessage("Inicia sesión para ver tu wallet.");
        setLoading(false);
        return;
      }

      const { data: bal } = await supabase
        .from("balances")
        .select("balance, bonus_balance, locked_balance")
        .eq("user_id", userRes.user.id)
        .maybeSingle();

      setBalance(Number(bal?.balance ?? 0));
      setBonusBalance(Number(bal?.bonus_balance ?? 0));
      setLockedBalance(Number(bal?.locked_balance ?? 0));

      const { data: tx } = await supabase
        .from("transactions")
        .select("id, type, amount, created_at, metadata")
        .eq("user_id", userRes.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setTxs((tx ?? []) as any);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const total = balance + bonusBalance;
  const amt = Number(amount);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copiado ✅");
      setTimeout(() => setMessage(null), 1200);
    } catch {
      setMessage("No se pudo copiar.");
      setTimeout(() => setMessage(null), 1200);
    }
  };

  const handleDeposit = async () => {
    setMessage(null);
    setDeposit(null);
    setInstructions(null);
    setManualReq(null);
    setWhatsUrl(null);
    setTelegramUser(null);

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Monto inválido.");
      return;
    }

    setDepositLoading(true);
    try {
      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: amt, method: depositMethod }),
      });

      const data = (await res.json()) as CreateDepositResponse;

      if (!data.ok) {
        setMessage(data.error || "Error al crear depósito.");
        return;
      }

      setMessage(data.message || "Listo.");

      if (data.mode === "provider") {
        setDeposit(data.deposit);
      } else {
        setInstructions(data.instructions);
        setManualReq(data.request);
        setWhatsUrl(data.whatsapp_url || null);
        setTelegramUser((data.telegram_username as any) ?? null);
      }
    } catch (e: any) {
      setMessage(e?.message || "Error al crear depósito.");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setMessage(null);

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Monto inválido.");
      return;
    }
    if (amt > balance) {
      setMessage("Saldo insuficiente (solo cuenta balance, no bonus).");
      return;
    }
    if (!/^[0-9]{18}$/.test(clabe.trim())) {
      setMessage("CLABE inválida (18 dígitos).");
      return;
    }
    if (beneficiary.trim().length < 3) {
      setMessage("Beneficiario inválido.");
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "KYC_REQUIRED") {
          setMessage("Necesitas KYC aprobado para retirar.");
          return;
        }
        setMessage(data?.error || "Error al solicitar retiro.");
        return;
      }

      setMessage("Retiro solicitado. Tu saldo quedó bloqueado mientras se procesa ✅");
      setAmount("");
      setClabe("");
      setBeneficiary("");
    } catch (e: any) {
      setMessage(e?.message || "Error al solicitar retiro.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando wallet…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/5 p-3">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-neutral-400">Saldo disponible</div>
              <div className="text-2xl font-semibold">${balance.toFixed(2)} MXN</div>
              <div className="text-xs text-neutral-500">
                Bonus: ${bonusBalance.toFixed(2)} · Bloqueado: ${lockedBalance.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab("deposit")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                selectedTab === "deposit" ? "bg-white/10" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              Depositar
            </button>
            <button
              onClick={() => setSelectedTab("withdraw")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                selectedTab === "withdraw" ? "bg-white/10" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              Retirar
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-neutral-200">
            {message}
          </div>
        )}
      </div>

      {/* Deposit */}
      {selectedTab === "deposit" && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            <div className="text-lg font-semibold">Depósito</div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              onClick={() => setDepositMethod("card")}
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                depositMethod === "card" ? "bg-white/10" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Tarjeta
            </button>

            <button
              onClick={() => setDepositMethod("spei")}
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                depositMethod === "spei" ? "bg-white/10" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <Landmark className="h-4 w-4" />
              SPEI (Manual)
            </button>

            <button
              onClick={() => setDepositMethod("oxxo")}
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                depositMethod === "oxxo" ? "bg-white/10" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <Landmark className="h-4 w-4" />
              OXXO
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto (MXN)"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />
            <button
              disabled={depositLoading}
              onClick={handleDeposit}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
            >
              {depositLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
            </button>
          </div>

          {/* Provider redirect */}
          {deposit?.redirect_url && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="text-sm text-neutral-300">Pago generado ✅</div>
              <a
                href={deposit.redirect_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
              >
                Abrir pago
              </a>
            </div>
          )}

          {/* Manual instructions */}
          {instructions && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="text-sm text-neutral-200 font-semibold">Instrucciones SPEI</div>

              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
                  <span className="text-neutral-400">CLABE</span>
                  <span className="font-mono">{instructions.clabe}</span>
                  <button onClick={() => copy(instructions.clabe)} className="opacity-80 hover:opacity-100">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
                  <span className="text-neutral-400">Beneficiario</span>
                  <span className="truncate max-w-[240px]">{instructions.beneficiary}</span>
                  <button onClick={() => copy(instructions.beneficiary)} className="opacity-80 hover:opacity-100">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
                  <span className="text-neutral-400">Monto</span>
                  <span>${Number(instructions.amount).toFixed(2)} MXN</span>
                  <button
                    onClick={() => copy(String(instructions.amount))}
                    className="opacity-80 hover:opacity-100"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
                  <span className="text-neutral-400">Concepto</span>
                  <span className="font-mono">{instructions.concept}</span>
                  <button onClick={() => copy(instructions.concept)} className="opacity-80 hover:opacity-100">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {manualReq?.folio && (
                <div className="text-xs text-neutral-400">
                  Folio: <span className="font-mono text-neutral-200">{manualReq.folio}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {whatsUrl && (
                  <a
                    href={whatsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Mandar captura por Whats
                  </a>
                )}

                {telegramUser ? (
                  <a
                    href={`https://t.me/${telegramUser.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Telegram
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-neutral-400">
                    <MessageCircle className="h-4 w-4" />
                    Telegram (pronto)
                  </div>
                )}
              </div>

              <div className="text-xs text-neutral-500">
                Nota: el abono es manual. Si ya transferiste, manda la captura y tu folio para que se procese rápido.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdraw */}
      {selectedTab === "withdraw" && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4" />
            <div className="text-lg font-semibold">Retiro (SPEI)</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto (MXN) — solo saldo disponible"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />
            <input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="Beneficiario"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />
            <input
              value={clabe}
              onChange={(e) => setClabe(e.target.value)}
              placeholder="CLABE (18 dígitos)"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none md:col-span-2"
            />
          </div>

          <button
            disabled={withdrawLoading}
            onClick={handleWithdraw}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
          >
            {withdrawLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </span>
            ) : (
              "Solicitar retiro"
            )}
          </button>

          <div className="text-xs text-neutral-500">
            Al solicitar retiro: el monto se mueve a <b>bloqueado</b> mientras se procesa (no se pierde, solo se “congela”).
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3">
        <div className="text-lg font-semibold">Movimientos</div>
        <div className="space-y-2">
          {txs.length === 0 && <div className="text-sm text-neutral-500">Sin movimientos todavía.</div>}
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <div>
                <div className="text-sm font-medium">{t.type}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
              <div className={`text-sm font-semibold ${t.amount >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {t.amount >= 0 ? "+" : ""}
                {Number(t.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}