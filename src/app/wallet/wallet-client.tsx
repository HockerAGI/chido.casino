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
  Users
} from "lucide-react";

// --- TIPOS ---
type TxRow = {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  metadata?: any;
};

const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "MXN";

// --- COMPONENTE ---
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
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [clabe, setClabe] = useState("");
  const [beneficiary, setBeneficiary] = useState("");

  const [message, setMessage] = useState<string | null>(null);

  const amt = Number(amount);
  const total = balance + bonusBalance;

  // --- INIT ---
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "withdraw") setSelectedTab("withdraw");
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        setMessage("Debes iniciar sesión.");
        setLoading(false);
        return;
      }

      const { data: bal } = await supabase
        .from("balances")
        .select("*")
        .eq("user_id", userRes.user.id)
        .maybeSingle();

      setBalance(Number(bal?.balance ?? 0));
      setBonusBalance(Number(bal?.bonus_balance ?? 0));
      setLockedBalance(Number(bal?.locked_balance ?? 0));
      setCommissionBalance(Number(bal?.commission_balance ?? 0));

      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userRes.user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      setTxs(tx || []);
      setLoading(false);
    };

    load();
  }, [supabase]);

  // --- HELPERS ---
  const sanitizeAmount = (v: string) => v.replace(/[^0-9]/g, "");
  const sanitizeClabe = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 18);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setMessage("Copiado ✅");
    setTimeout(() => setMessage(null), 1200);
  };

  // --- ACTIONS ---
  const handleDeposit = async () => {
    if (depositLoading) return;
    setDepositLoading(true);
    setMessage(null);

    if (!amt || amt < 50) {
      setMessage("Mínimo $50");
      setDepositLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setMessage("Instrucciones generadas ✅");
    } catch (e: any) {
      setMessage(e.message || "Error depósito");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (withdrawLoading) return;
    setWithdrawLoading(true);
    setMessage(null);

    if (!amt || amt <= 0) return setMessage("Monto inválido");
    if (amt > balance) return setMessage("Saldo insuficiente");
    if (clabe.length !== 18) return setMessage("CLABE inválida");

    try {
      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: amt, clabe, beneficiary }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Retiro enviado ✅");
    } catch (e: any) {
      setMessage(e.message || "Error retiro");
    } finally {
      setWithdrawLoading(false);
    }
  };

  // --- UI ---
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="animate-spin" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* SALDO */}
      <div className="p-6 rounded-2xl bg-black border border-white/10">
        <div className="text-3xl font-bold">
          ${total.toFixed(2)} {CURRENCY_SYMBOL}
        </div>
      </div>

      {/* INPUT */}
      <input
        value={amount}
        onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
        placeholder="Monto"
        className="w-full p-3 rounded bg-black border"
      />

      {/* BOTONES */}
      <div className="flex gap-3">
        <button
          onClick={handleDeposit}
          disabled={depositLoading}
          className="flex-1 bg-white text-black p-3 rounded"
        >
          {depositLoading ? "Procesando..." : "Depositar"}
        </button>

        <button
          onClick={handleWithdraw}
          disabled={withdrawLoading}
          className="flex-1 bg-white text-black p-3 rounded"
        >
          {withdrawLoading ? "Procesando..." : "Retirar"}
        </button>
      </div>

      {/* MENSAJE */}
      {message && (
        <div className="text-sm flex gap-2">
          {message.includes("✅") ? <CheckCircle2 /> : <AlertCircle />}
          {message}
        </div>
      )}

      {/* TX */}
      {txs.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} />
      ))}
    </div>
  );
}

// --- TX ROW ---
function TransactionRow({ tx }: { tx: TxRow }) {
  const type = tx.type.toLowerCase();

  let icon = <Coins />;
  if (type === "commission") icon = <Users />;

  return (
    <div className="flex justify-between border-b py-2">
      <div className="flex gap-2 items-center">
        {icon}
        <span>{tx.type}</span>
      </div>
      <span>${tx.amount}</span>
    </div>
  );
}