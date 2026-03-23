"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  Loader2,
  MessageCircle,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Gift,
  Coins,
  Gamepad2,
  Users,
} from "lucide-react";

// --- TIPOS Y CONSTANTES ---
type TxRow = {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  metadata?: any;
};

type ManualInstructionsV2 = any;
type ManualRequest = any;
type CreateDepositResponse = any;

const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "MXN";

// --- COMPONENTE PRINCIPAL ---
export default function WalletClient() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  // --- ESTADO DEL COMPONENTE ---
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"deposit" | "withdraw">("deposit");

  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [commissionBalance, setCommissionBalance] = useState(0);

  const [txs, setTxs] = useState<TxRow[]>([]);
  const [amount, setAmount] = useState("");

  const [depositLoading, setDepositLoading] = useState(false);
  const [instructions, setInstructions] = useState<ManualInstructionsV2 | null>(null);
  const [manualReq, setManualReq] = useState<ManualRequest | null>(null);

  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [clabe, setClabe] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [withdrawType, setWithdrawType] = useState<"balance" | "commission">("balance");

  const [message, setMessage] = useState<string | null>(null);

  // --- EFECTOS Y CARGA DE DATOS ---
  useEffect(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    const type = (searchParams.get("type") || "").toLowerCase();

    if (t === "withdraw") setSelectedTab("withdraw");
    if (t === "deposit") setSelectedTab("deposit");
    if (type === "commission") setWithdrawType("commission");
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setMessage("Error: No se pudo conectar con el backend.");
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        setMessage("Inicia sesión para ver tu Chido Wallet.");
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

    load();
  }, [supabase]);

  // --- LÓGICA DE NEGOCIO Y HELPERS ---
  const total = balance + bonusBalance;
  const amt = Number(amount);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("¡Órale! Copiado ✅");
      setTimeout(() => setMessage(null), 1200);
    } catch {
      setMessage("No se pudo copiar, qué mala onda.");
      setTimeout(() => setMessage(null), 1200);
    }
  };

  const handleDeposit = async () => {
    setMessage(null);
    setInstructions(null);
    setManualReq(null);

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Ese monto no está chido. Intenta de nuevo.");
      return;
    }

    setDepositLoading(true);
    try {
      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: amt, method: "spei" }),
      });

      const data = (await res.json()) as CreateDepositResponse;

      if (!data.ok) {
        setMessage(data.error || "No se armó el depósito. Algo falló.");
        return;
      }

      setMessage(data.message || "¡A huevo! Instrucciones generadas.");
      setInstructions((data as any).instructions);
      setManualReq((data as any).request);
    } catch (e: any) {
      setMessage(e?.message || "No se armó el depósito. Algo falló.");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setMessage(null);
    const withdrawableBalance = withdrawType === "commission" ? commissionBalance : balance;

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Ese monto no está chido.");
      return;
    }
    if (amt > withdrawableBalance) {
      setMessage("No te alcanza, compa. Revisa el saldo que quieres sacar.");
      return;
    }
    if (!/^[0-9]{18}$/.test(clabe.trim())) {
      setMessage("Esa CLABE parece más chueca que un plátano. Deben ser 18 dígitos.");
      return;
    }
    if (beneficiary.trim().length < 3) {
      setMessage("Pon el nombre del mero mero de la cuenta, no seas gacho.");
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

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "KYC_REQUIRED") {
          setMessage("¡Aguas! Necesitas KYC aprobado para retirar. Pídelo en Soporte.");
          return;
        }
        setMessage(data?.error || "No se pudo solicitar el retiro. Qué bajón.");
        return;
      }

      setMessage("¡Ya estás! Tu retiro se está procesando. El saldo se moverá a 'Procesando' en un ratito. ✅");
      setAmount("");
      setClabe("");
      setBeneficiary("");
    } catch (e: any) {
      setMessage(e?.message || "No se pudo solicitar el retiro. Qué bajón.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  // --- RENDERIZADO ---
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando el Chido Wallet... ¡Aguanta la carnita!
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* --- TARJETA DE SALDO --- */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1a0d] via-[#121214] to-black p-6">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#32CD32]/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#32CD32]/20 bg-[#32CD32]/15">
              <Wallet className="h-5 w-5 text-[#32CD32]" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/50">Chido Wallet</div>
              <div className="text-[10px] text-white/30">Aquí guardas tu lana para la acción 🤑</div>
            </div>
          </div>

          <div className="mb-1 text-4xl font-black tabular-nums text-white">
            ${total.toFixed(2)} <span className="text-lg text-white/50">{CURRENCY_SYMBOL}</span>
          </div>

          <div className="space-y-1 text-xs text-white/45">
            <div>
              Saldo Real: <b className="text-white">${balance.toFixed(2)}</b>
            </div>
            <div>
              Bono: <b className="text-[#FFD700]">${bonusBalance.toFixed(2)}</b>
            </div>
            <div>
              Procesando: <b className="text-white/60">${lockedBalance.toFixed(2)}</b>
            </div>
            {commissionBalance > 0 && (
              <div>
                Ganancias de Compas: <b className="text-[#00F0FF]">${commissionBalance.toFixed(2)}</b>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setSelectedTab("deposit")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all ${
                selectedTab === "deposit"
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/8 text-white hover:bg-white/12"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Meter feria
            </button>
            <button
              onClick={() => setSelectedTab("withdraw")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all ${
                selectedTab === "withdraw"
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/8 text-white hover:bg-white/12"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Sacar lana
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
              message.includes("✅")
                ? "border-[#32CD32]/20 bg-[#32CD32]/10 text-[#32CD32]"
                : "border-[#FF0099]/20 bg-[#FF0099]/10 text-[#FF0099]"
            }`}
          >
            {message.includes("✅") ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {message}
          </div>
        )}
      </div>

      {/* --- PESTAÑA DE DEPÓSITO --- */}
      {selectedTab === "deposit" ? (
        <div className="space-y-5 rounded-3xl border border-white/10 bg-black/30 p-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/10">
              <ArrowDownToLine className="h-4 w-4 text-[#00F0FF]" />
            </div>
            <div>
              <div className="text-base font-black">Métele lana con SPEI</div>
              <div className="text-xs text-white/45">Rápido, seguro y sin comisión de nuestra parte. ¡Así de fácil!</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[100, 200, 500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`rounded-2xl border py-3 text-sm font-black transition-all ${
                  amount === String(v)
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/50">
              Otra cantidad ({CURRENCY_SYMBOL})
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 750 (sin centavos)"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none focus:border-white/25"
            />
            <div className="text-[11px] text-white/35">
              Mínimo $50 {CURRENCY_SYMBOL}. Tip: usa cantidades sin centavos para que caiga más rápido.
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={depositLoading}
            className="w-full rounded-2xl bg-white py-3.5 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {depositLoading ? "Generando instrucciones..." : "¡A depositar se ha dicho!"}
          </button>

          {instructions && <DepositInstructions instructions={instructions} manualReq={manualReq} copyFn={copy} />}
        </div>
      ) : (
        /* --- PESTAÑA DE RETIRO --- */
        <div className="space-y-5 rounded-3xl border border-white/10 bg-black/30 p-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/10">
              <ArrowUpFromLine className="h-4 w-4 text-[#FFD700]" />
            </div>
            <div>
              <div className="text-base font-black">Saca tu lana a CLABE</div>
              <div className="text-xs text-white/45">Elige qué saldo quieres retirar. ¡Ponte buzo!</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setWithdrawType("balance")}
              className={`rounded-2xl border p-4 transition-all ${
                withdrawType === "balance" ? "border-white/20 bg-white/10" : "border-transparent bg-white/5"
              }`}
            >
              <div className="text-xs text-white/60">Saldo de Juego</div>
              <div className="text-lg font-black">${balance.toFixed(2)}</div>
            </button>

            <button
              onClick={() => setWithdrawType("commission")}
              disabled={commissionBalance <= 0}
              className={`rounded-2xl border p-4 transition-all ${
                withdrawType === "commission" ? "border-white/20 bg-white/10" : "border-transparent bg-white/5"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="text-xs text-white/60">Ganancias de Compas</div>
              <div className="text-lg font-black">${commissionBalance.toFixed(2)}</div>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/50">
                Monto a sacar ({CURRENCY_SYMBOL})
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 500"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none focus:border-white/25"
              />
              <div className="mt-1 text-[11px] text-white/30">
                Tu saldo para retirar: $
                {withdrawType === "commission" ? commissionBalance.toFixed(2) : balance.toFixed(2)} {CURRENCY_SYMBOL}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/50">
                CLABE (18 dígitos)
              </label>
              <input
                value={clabe}
                onChange={(e) => setClabe(e.target.value)}
                placeholder="000000000000000000"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none focus:border-white/25 font-mono tracking-widest"
                maxLength={18}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/50">
                Nombre del mero mero
              </label>
              <input
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="El nombre del dueño de la cuenta"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 transition focus:outline-none focus:border-white/25"
              />
            </div>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading}
            className="w-full rounded-2xl bg-white py-3.5 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {withdrawLoading ? "Procesando el retiro..." : "¡Sacar mi lana!"}
          </button>
        </div>
      )}

      {/* --- HISTORIAL DE TRANSACCIONES --- */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <TrendingUp className="h-4 w-4 text-white/60" />
          </div>
          <div className="text-base font-black">Donde ha estado tu feria</div>
        </div>

        <div className="space-y-2">
          {txs.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mb-3 text-3xl">💸</div>
              <div className="text-sm font-medium text-white/40">Acá verás toda tu actividad.</div>
              <div className="mt-1 text-xs text-white/25">¡Haz tu primer depósito y que empiece la fiesta!</div>
            </div>
          ) : (
            txs.map((t) => <TransactionRow key={t.id} tx={t} />)
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES ---
function DepositInstructions({
  instructions,
  manualReq,
  copyFn,
}: {
  instructions: ManualInstructionsV2;
  manualReq: ManualRequest;
  copyFn: (text: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 pt-5 animate-fade-in">
      <div className="text-center text-lg font-black">{instructions.title}</div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="text-xs text-white/50">CLABE</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="font-mono text-sm">{instructions.spei.clabe}</div>
            <button onClick={() => copyFn(instructions.spei.clabe)} className="rounded-lg bg-white/5 p-2">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="text-xs text-white/50">Concepto de Pago</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="font-mono text-sm">{instructions.spei.concept}</div>
            <button onClick={() => copyFn(instructions.spei.concept)} className="rounded-lg bg-white/5 p-2">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-white/50">Beneficiario</div>
        <div className="mt-1 text-sm">{instructions.spei.beneficiary}</div>
        {instructions.spei.institution ? (
          <div className="mt-1 text-xs text-white/50">Banco: {instructions.spei.institution}</div>
        ) : null}
      </div>

      <div className="text-sm text-white/70">
        <div className="mb-1 font-bold">Sigue los pasos, es pan comido:</div>
        <ol className="list-inside list-decimal space-y-1">
          {instructions.steps.map((s: string, i: number) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      {manualReq?.folio && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
          <span>
            Folio: <b className="text-white">{manualReq.folio}</b>
          </span>
          <button
            onClick={() => copyFn(manualReq.folio)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <Copy className="h-4 w-4" /> Copiar folio
          </button>
        </div>
      )}

      {instructions.whatsapp?.ready && instructions.whatsapp.link && (
        <a
          href={instructions.whatsapp.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-black text-black hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Enviar comprobante por WhatsApp
        </a>
      )}
    </div>
  );
}

function TransactionRow({ tx }: { tx: TxRow }) {
  const amt = Number(tx.amount ?? 0);
  const isPositive = amt >= 0;
  const type = tx.type.toLowerCase();

  let icon = <Coins className="h-4 w-4" />;
  let title = tx.type.replace(/_/g, " ");

  if (type === "deposit") {
    icon = <ArrowDownToLine className="h-4 w-4" />;
    title = "Depósito";
  }
  if (type === "withdraw" || type === "withdraw_commission") {
    icon = <ArrowUpFromLine className="h-4 w-4" />;
    title = "Retiro";
  }
  if (type === "bonus") {
    icon = <Gift className="h-4 w-4" />;
    title = "Bono Recibido";
  }
  if (type === "win") {
    icon = <Sparkles className="h-4 w-4" />;
    title = `Ganaste en ${tx.metadata?.game || "un juego"}`;
  }
  if (type === "bet") {
    icon = <Gamepad2 className="h-4 w-4" />;
    title = `Apuesta en ${tx.metadata?.game || "un juego"}`;
  }
  if (type === "commission") {
    icon = <Users className="h-4 w-4" />;
    title = "Comisión de Compa";
  }
  if (type === "promo_clear_bonus") {
    icon = <Zap className="h-4 w-4" />;
    title = "Bono Convertido a Real";
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            isPositive ? "bg-[#32CD32]/10 text-[#32CD32]" : "bg-[#FF0099]/10 text-[#FF0099]"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold capitalize">{title}</div>
          <div className="text-xs text-white/40">{new Date(tx.created_at).toLocaleString("es-MX")}</div>
        </div>
      </div>

      <div className={`font-mono text-sm font-black tabular-nums ${isPositive ? "text-[#32CD32]" : "text-white/70"}`}>
        {isPositive ? "+" : "-"}${Math.abs(amt).toFixed(2)}
      </div>
    </div>
  );
}