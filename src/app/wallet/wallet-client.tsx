"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

type DepositProvider = {
  redirect_url: string;
  provider?: string;
  intent_id?: string;
};

type ManualInstructionsV2 = {
  title: string;
  mode: "manual";
  folio: string;
  amount: number;
  currency: "MXN";
  spei: {
    clabe: string;
    beneficiary: string;
    institution?: string | null;
    concept: string;
    dimo_phone?: string | null;
  };
  steps: string[];
  whatsapp?: { ready: boolean; phone?: string | null; link?: string | null };
  telegram?: { ready: boolean; username?: string | null };
};

type ManualRequest = {
  id: string;
  folio: string;
  amount: number;
  currency?: string;
  status?: string;
  created_at?: string;
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
      instructions: ManualInstructionsV2;
      request: ManualRequest;
    }
  | { ok: false; error: string };

export default function WalletClient() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

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
  const [instructions, setInstructions] = useState<ManualInstructionsV2 | null>(null);
  const [manualReq, setManualReq] = useState<ManualRequest | null>(null);

  // withdraw
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [clabe, setClabe] = useState("");
  const [beneficiary, setBeneficiary] = useState("");

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    if (t === "withdraw") setSelectedTab("withdraw");
    if (t === "deposit") setSelectedTab("deposit");
  }, [searchParams]);

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
      setMessage("Saldo insuficiente (solo saldo real, no bono).");
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
              <div className="text-xs uppercase tracking-wider text-white/50">Total disponible</div>
              <div className="text-2xl font-black tabular-nums">{total.toFixed(2)} MXN</div>
              <div className="text-xs text-white/50">
                Saldo: {balance.toFixed(2)} • Bono: {bonusBalance.toFixed(2)} • En juego: {lockedBalance.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab("deposit")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                selectedTab === "deposit" ? "bg-white text-black" : "bg-white/5 text-white"
              }`}
            >
              Depósito
            </button>
            <button
              onClick={() => setSelectedTab("withdraw")}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                selectedTab === "withdraw" ? "bg-white text-black" : "bg-white/5 text-white"
              }`}
            >
              Retiro
            </button>
          </div>
        </div>

        {message && <div className="mt-4 text-sm text-white/70">{message}</div>}
      </div>

      {selectedTab === "deposit" ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            <div className="text-lg font-black">Depositar</div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Método
              </div>
              <select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value as any)}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm"
              >
                <option value="spei">SPEI (transferencia)</option>
                <option value="oxxo">OXXO (próximamente)</option>
                <option value="card">Tarjeta (próximamente)</option>
              </select>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-2">
              <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Monto
              </div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 500"
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={depositLoading}
            className="w-full rounded-xl bg-white text-black font-black py-3 hover:bg-white/90 disabled:opacity-60"
          >
            {depositLoading ? "Generando..." : "Generar depósito"}
          </button>

          {deposit?.redirect_url && (
            <a
              href={deposit.redirect_url}
              target="_blank"
              rel="noreferrer"
              className="block text-center rounded-xl bg-[#00F0FF] text-black font-black py-3 hover:opacity-90"
            >
              Continuar con pago
            </a>
          )}

          {instructions && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="font-black">{instructions.title}</div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="text-xs text-white/50">CLABE</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="font-mono text-sm">{instructions.spei.clabe}</div>
                    <button onClick={() => copy(instructions.spei.clabe)} className="p-2 rounded-lg bg-white/5">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="text-xs text-white/50">Concepto</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="font-mono text-sm">{instructions.spei.concept}</div>
                    <button onClick={() => copy(instructions.spei.concept)} className="p-2 rounded-lg bg-white/5">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-xs text-white/50">Beneficiario</div>
                <div className="mt-1 text-sm">{instructions.spei.beneficiary}</div>
                {instructions.spei.institution && (
                  <div className="mt-1 text-xs text-white/50">Institución: {instructions.spei.institution}</div>
                )}
              </div>

              <div className="text-sm text-white/70">
                <div className="font-bold mb-1">Pasos</div>
                <ol className="list-decimal list-inside space-y-1">
                  {instructions.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>

              {manualReq?.folio && (
                <div className="text-xs text-white/50">Folio: {manualReq.folio}</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4" />
            <div className="text-lg font-black">Retirar</div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-1">
              <div className="text-xs text-white/50 mb-2">Monto</div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 300"
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-2">
              <div className="text-xs text-white/50 mb-2">CLABE (18 dígitos)</div>
              <input
                value={clabe}
                onChange={(e) => setClabe(e.target.value)}
                placeholder="000000000000000000"
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-3">
              <div className="text-xs text-white/50 mb-2">Beneficiario</div>
              <input
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="Nombre del titular"
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading}
            className="w-full rounded-xl bg-white text-black font-black py-3 hover:bg-white/90 disabled:opacity-60"
          >
            {withdrawLoading ? "Enviando..." : "Solicitar retiro"}
          </button>

          <div className="text-xs text-white/50 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Si tu retiro tarda, soporte te ayuda por el canal oficial.
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="text-lg font-black mb-3">Movimientos</div>
        <div className="space-y-2">
          {txs.length === 0 ? (
            <div className="text-sm text-white/60">Aún no hay movimientos.</div>
          ) : (
            txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 p-3">
                <div>
                  <div className="text-sm font-bold">{t.type}</div>
                  <div className="text-xs text-white/50">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="font-mono text-sm tabular-nums">{Number(t.amount ?? 0).toFixed(2)} MXN</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}