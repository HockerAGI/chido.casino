"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { AlertCircle, Coins, Copy, Check, Loader2, ShieldCheck } from "lucide-react";

type PaymentMethod = "card" | "spei" | "oxxo";

export default function WalletClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, formatted, balance } = useWalletBalance();

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [method, setMethod] = useState<PaymentMethod>("spei");
  const [amount, setAmount] = useState("100");
  const [creating, setCreating] = useState(false);

  const [withdrawClabe, setWithdrawClabe] = useState("");
  const [withdrawBeneficiary, setWithdrawBeneficiary] = useState("");

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [instructions, setInstructions] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = params.get("deposit");
    if (d === "ok") setMsg({ type: "success", text: "Depósito: recibido. Si fue SPEI/OXXO puede tardar un poco en reflejar." });

    if (params.get("action") === "withdraw") setActiveTab("withdraw");
  }, [params]);

  const amountNumber = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }, [amount]);

  const handleCopy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  async function createDeposit() {
    setMsg(null);
    setInstructions(null);
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNumber, method }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error iniciando depósito.");

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.instructions) {
        setInstructions(data.instructions);
        setMsg({ type: "success", text: "Depósito creado. Usa las instrucciones abajo para pagar." });
      } else {
        setMsg({ type: "success", text: "Depósito creado. Revisa la plataforma/proveedor para completar el pago." });
      }
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Error" });
    } finally {
      setCreating(false);
    }
  }

  async function handleWithdraw() {
    setMsg(null);

    if (amountNumber < 200) {
      setMsg({ type: "error", text: "El retiro mínimo es $200 MXN." });
      return;
    }
    if (!/^[0-9]{18}$/.test(withdrawClabe.trim())) {
      setMsg({ type: "error", text: "CLABE inválida (18 dígitos)." });
      return;
    }
    if (withdrawBeneficiary.trim().length < 3) {
      setMsg({ type: "error", text: "Beneficiario inválido." });
      return;
    }

    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNumber,
          clabe: withdrawClabe.trim(),
          beneficiary: withdrawBeneficiary.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "KYC_REQUIRED") throw new Error("KYC requerido para retirar.");
        throw new Error(data.error || "Error en solicitud de retiro.");
      }

      setMsg({ type: "success", text: "Retiro solicitado. Estado: pending." });
      setAmount("");
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Error" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto animate-fade-in px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-chido-cyan/10 rounded-2xl border border-chido-cyan/20">
            <Coins className="text-chido-cyan" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Bóveda Numia</h1>
            <p className="text-zinc-500 text-sm font-medium">Depósitos y retiros.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border border-white/10 p-8 shadow-2xl h-fit">
            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex justify-between items-start">
                <div className="text-zinc-400 font-bold text-xs uppercase tracking-[0.2em]">Saldo Total</div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                  ${loading ? "..." : formatted}
                </span>
                <span className="text-xl font-bold text-zinc-500">MXN</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 backdrop-blur-sm">
            <div className="flex p-1 bg-black/40 rounded-xl mb-6">
              <button
                onClick={() => setActiveTab("deposit")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeTab === "deposit" ? "bg-white text-black shadow" : "text-zinc-500 hover:text-white"
                }`}
              >
                Depositar
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeTab === "withdraw" ? "bg-white text-black shadow" : "text-zinc-500 hover:text-white"
                }`}
              >
                Retirar
              </button>
            </div>

            {activeTab === "deposit" ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => setMethod("spei")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      method === "spei"
                        ? "border-chido-cyan bg-chido-cyan/10 text-white"
                        : "border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5"
                    }`}
                  >
                    <div className="font-black text-xs uppercase tracking-wider">SPEI</div>
                  </button>
                  <button
                    onClick={() => setMethod("oxxo")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      method === "oxxo"
                        ? "border-chido-gold bg-chido-gold/10 text-white"
                        : "border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5"
                    }`}
                  >
                    <div className="font-black text-xs uppercase tracking-wider text-chido-gold">OXXO</div>
                  </button>
                  <button
                    onClick={() => setMethod("card")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      method === "card"
                        ? "border-chido-pink bg-chido-pink/10 text-white"
                        : "border-white/10 bg-black/20 text-zinc-500 hover:bg-white/5"
                    }`}
                  >
                    <div className="font-black text-xs uppercase tracking-wider">CARD</div>
                  </button>
                </div>

                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto</label>
                <div className="relative mt-1 mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black text-xl">$</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-black text-lg focus:border-white outline-none"
                    inputMode="numeric"
                  />
                </div>

                <button
                  onClick={createDeposit}
                  disabled={creating}
                  className="w-full py-3 rounded-xl font-bold bg-white text-black hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="animate-spin" /> : "PROCEDER AL PAGO"}
                </button>

                {instructions && (
                  <div className="mt-4 p-4 rounded-xl border border-white/10 bg-black/30 text-xs text-zinc-300 space-y-2">
                    <div className="font-black text-white">INSTRUCCIONES DE PAGO</div>
                    <pre className="whitespace-pre-wrap break-words opacity-90">
                      {typeof instructions === "string" ? instructions : JSON.stringify(instructions, null, 2)}
                    </pre>
                    <button
                      onClick={() => handleCopy(typeof instructions === "string" ? instructions : JSON.stringify(instructions))}
                      className="px-3 py-2 rounded-lg bg-white text-black font-bold inline-flex items-center gap-2"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />} Copiar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="p-4 bg-chido-green/10 border border-chido-green/20 rounded-xl mb-4 flex items-center gap-3">
                  <ShieldCheck className="text-chido-green" size={24} />
                  <div className="text-xs text-chido-green/80">
                    <span className="font-bold block text-chido-green">Retiros SPEI</span>
                    <span className="text-zinc-400">KYC puede ser requerido.</span>
                  </div>
                </div>

                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">CLABE (18 dígitos)</label>
                <input
                  value={withdrawClabe}
                  onChange={(e) => setWithdrawClabe(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white font-bold mb-3 outline-none"
                  inputMode="numeric"
                  placeholder="012345678901234567"
                />

                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Beneficiario</label>
                <input
                  value={withdrawBeneficiary}
                  onChange={(e) => setWithdrawBeneficiary(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white font-bold mb-3 outline-none"
                  placeholder="Nombre completo"
                />

                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Monto</label>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black text-xl">$</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white font-black text-2xl focus:border-white outline-none transition-colors"
                    inputMode="numeric"
                  />
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={creating || amountNumber > balance}
                  className="w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all mt-2 bg-white text-black hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="animate-spin" /> : "RETIRAR"}
                </button>
              </>
            )}

            {msg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 mt-4 ${
                  msg.type === "success" ? "bg-chido-green/20 text-chido-green" : "bg-chido-red/20 text-chido-red"
                }`}
              >
                <AlertCircle size={14} /> {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-20">
        <Footer />
      </div>
    </MainLayout>
  );
}