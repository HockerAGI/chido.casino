"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  Landmark,
  Loader2,
  MessageCircle,
  Wallet,
  ExternalLink,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
} from "lucide-react";

type TxRow = {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  metadata?: any;
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
  const [depositLoading, setDepositLoading] = useState(false);
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
        setMessage("Inicia sesión para ver tu Chido Wallet.");
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
        .limit(25);

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
        body: JSON.stringify({ amount: amt, method: "spei" }),
      });

      const data = (await res.json()) as CreateDepositResponse;

      if (!data.ok) {
        setMessage(data.error || "Error al crear depósito.");
        return;
      }

      setMessage(data.message || "Listo.");
      setInstructions((data as any).instructions);
      setManualReq((data as any).request);
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
          setMessage("Para retirar necesitas KYC aprobado. Pídelo en Soporte.");
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
        Cargando Chido Wallet…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* BALANCE CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1a0d] via-[#121214] to-black p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#32CD32]/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#32CD32]/15 border border-[#32CD32]/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-[#32CD32]" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50 font-bold">Chido Wallet</div>
              <div className="text-[10px] text-white/30">Tu tesoro chido 🤑</div>
            </div>
          </div>

          <div className="text-4xl font-black tabular-nums text-white mb-1">${total.toFixed(2)} <span className="text-lg text-white/50">MXN</span></div>
          <div className="text-xs text-white/45 mb-5">
            Saldo real: <b className="text-white">${balance.toFixed(2)}</b> • Bono: <b className="text-[#FFD700]">${bonusBalance.toFixed(2)}</b> • Procesando: <b className="text-white/60">${lockedBalance.toFixed(2)}</b>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSelectedTab("deposit")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all ${
                selectedTab === "deposit"
                  ? "bg-white text-black"
                  : "bg-white/8 border border-white/10 text-white hover:bg-white/12"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" /> Depositar
            </button>
            <button
              onClick={() => setSelectedTab("withdraw")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all ${
                selectedTab === "withdraw"
                  ? "bg-white text-black"
                  : "bg-white/8 border border-white/10 text-white hover:bg-white/12"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" /> Retirar
            </button>
          </div>
        </div>

        {message && (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium flex items-start gap-2 ${
            message.includes("✅") || message.includes("Listo") || message.includes("solicitado")
              ? "bg-[#32CD32]/10 border-[#32CD32]/20 text-[#32CD32]"
              : "bg-[#FF0099]/10 border-[#FF0099]/20 text-[#FF0099]"
          }`}>
            {message.includes("✅") ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            {message}
          </div>
        )}
      </div>

      {selectedTab === "deposit" ? (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 flex items-center justify-center">
              <ArrowDownToLine className="h-4 w-4 text-[#00F0FF]" />
            </div>
            <div>
              <div className="text-base font-black">Depósito vía SPEI</div>
              <div className="text-xs text-white/45">Rápido, seguro y sin comisión por nuestra parte</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[100, 200, 500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`rounded-2xl border py-3 text-sm font-black transition-all ${
                  amount === String(v)
                    ? "bg-white text-black border-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/50 font-bold uppercase tracking-widest">Monto personalizado (MXN)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 750"
              className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
            />
            <div className="text-[11px] text-white/35">Mínimo $50 MXN. Tip: usa cantidades redondas para conciliación más rápida.</div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={depositLoading}
            className="w-full rounded-2xl bg-white text-black font-black py-3.5 hover:bg-white/90 disabled:opacity-50 transition text-sm"
          >
            {depositLoading ? "Generando instrucciones..." : "¡Quiero depositar!"}
          </button>

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
                {instructions.spei.institution ? (
                  <div className="mt-1 text-xs text-white/50">Institución: {instructions.spei.institution}</div>
                ) : null}
              </div>

              <div className="text-sm text-white/70">
                <div className="font-bold mb-1">Pasos</div>
                <ol className="list-decimal list-inside space-y-1">
                  {instructions.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>

              {manualReq?.folio ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                  <span>Folio: <b className="text-white">{manualReq.folio}</b></span>
                  <button
                    onClick={() => copy(manualReq.folio)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                  >
                    <Copy className="h-4 w-4" /> Copiar folio
                  </button>
                </div>
              ) : null}

              {instructions.whatsapp?.ready && instructions.whatsapp.link ? (
                <a
                  href={instructions.whatsapp.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] text-black font-black py-3 hover:opacity-90"
                >
                  Enviar comprobante por WhatsApp <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <div className="text-xs text-white/45">
                  Si tu saldo no se refleja, contacta a Soporte y manda tu folio + comprobante.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
              <ArrowUpFromLine className="h-4 w-4 text-[#FFD700]" />
            </div>
            <div>
              <div className="text-base font-black">Retiro a CLABE</div>
              <div className="text-xs text-white/45">Solo saldo real (no bono). KYC obligatorio.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#FFD700]/15 bg-[#FFD700]/5 p-4 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-[#FFD700] shrink-0 mt-0.5" />
            <div className="text-xs text-white/65 leading-relaxed">
              Para retirar necesitas <b className="text-white">KYC aprobado</b>. Tarda 1–3 días hábiles. Sin comisión por parte de Chido Casino. Si no tienes KYC o tu retiro tarda, ve a <b className="text-[#25D366]">Soporte</b>.
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 font-bold uppercase tracking-widest mb-2 block">Monto (MXN)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 500"
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
              />
              <div className="text-[11px] text-white/30 mt-1">Saldo disponible para retiro: ${balance.toFixed(2)} MXN</div>
            </div>

            <div>
              <label className="text-xs text-white/50 font-bold uppercase tracking-widest mb-2 block">CLABE (18 dígitos)</label>
              <input
                value={clabe}
                onChange={(e) => setClabe(e.target.value)}
                placeholder="000000000000000000"
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition font-mono tracking-widest"
                maxLength={18}
              />
            </div>

            <div>
              <label className="text-xs text-white/50 font-bold uppercase tracking-widest mb-2 block">Nombre del titular</label>
              <input
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="Como aparece en tu cuenta bancaria"
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
              />
            </div>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading}
            className="w-full rounded-2xl bg-white text-black font-black py-3.5 hover:bg-white/90 disabled:opacity-50 transition text-sm"
          >
            {withdrawLoading ? "Procesando retiro..." : "Solicitar retiro"}
          </button>

          <div className="text-xs text-white/35 flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            Si tu retiro tarda más de 3 días, comunícate al Soporte con tu folio.
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white/60" />
          </div>
          <div className="text-base font-black">Historial de movimientos</div>
        </div>
        <div className="space-y-2">
          {txs.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-3">💸</div>
              <div className="text-sm text-white/40 font-medium">Todavía no hay movimientos.</div>
              <div className="text-xs text-white/25 mt-1">¡Haz tu primer depósito y empieza a rifarte!</div>
            </div>
          ) : (
            txs.map((t) => {
              const amt = Number(t.amount ?? 0);
              const isPositive = ["deposit", "bonus", "win", "commission"].includes(t.type);
              return (
                <div key={t.id} className="flex items-center justify-between rounded-2xl bg-black/30 border border-white/8 px-4 py-3 gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                      isPositive ? "bg-[#32CD32]/10 text-[#32CD32]" : "bg-[#FF0099]/10 text-[#FF0099]"
                    }`}>
                      {isPositive ? "+" : "-"}
                    </div>
                    <div>
                      <div className="text-sm font-bold capitalize">{t.type.replace(/_/g, " ")}</div>
                      <div className="text-xs text-white/40">{new Date(t.created_at).toLocaleString("es-MX")}</div>
                    </div>
                  </div>
                  <div className={`font-mono text-sm font-black tabular-nums ${isPositive ? "text-[#32CD32]" : "text-white/70"}`}>
                    {isPositive ? "+" : "-"}${Math.abs(amt).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}