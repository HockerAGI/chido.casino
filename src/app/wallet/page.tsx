// src/app/wallet/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Copy, CheckCircle2, Clock3, Landmark, Loader2, Wallet, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { supabaseBrowser } from "@/lib/supabaseClient";

type WalletConfig = {
  bankName: string;
  accountHolder: string;
  clabe: string;
  cardNumber: string;
  referenceLabel: string;
  minDeposit: number;
  maxDeposit: number;
  supportText: string;
};

type DepositRow = {
  id?: string;
  folio?: string;
  amount: number;
  status: string;
  created_at?: string;
  metadata?: Record<string, any> | null;
};

function mxn(n: number) {
  return Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function onlyDigits(v: string) {
  return (v || "").replace(/\D+/g, "");
}

function makeFolio() {
  const d = new Date();
  const yyyy = d.getFullYear().toString();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CHD-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

function statusLabel(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "confirmed" || s === "completed") return "Aprobado";
  if (s === "rejected" || s === "failed" || s === "cancelled") return "Rechazado";
  return "En revisión";
}

function statusClasses(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "confirmed" || s === "completed") {
    return "border-[#32CD32]/25 bg-[#32CD32]/10 text-[#7DFF7D]";
  }
  if (s === "rejected" || s === "failed" || s === "cancelled") {
    return "border-red-500/25 bg-red-500/10 text-red-300";
  }
  return "border-[#FFD700]/25 bg-[#FFD700]/10 text-[#FFE88A]";
}

export default function WalletPage() {
  const { toast } = useToast();
  const { balance, bonusBalance, formatted, formattedBonus, refresh, loading } = useWalletBalance();

  const [config, setConfig] = useState<WalletConfig>({
    bankName: "Banco destino",
    accountHolder: "CHIDO CASINO",
    clabe: "",
    cardNumber: "",
    referenceLabel: "Tu folio",
    minDeposit: 50,
    maxDeposit: 50000,
    supportText: "Si tu depósito tarda más de lo normal, soporte lo revisa en corto.",
  });

  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<number>(300);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [pageBusy, setPageBusy] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [note, setNote] = useState("");

  const available = (balance || 0) + (bonusBalance || 0);

  const quickAmounts = useMemo(() => [100, 200, 500, 1000, 2500, 5000], []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setPageBusy(true);
      try {
        const sb = supabaseBrowser();

        const { data: authData } = await sb.auth.getUser();
        const uid = authData?.user?.id || "";
        if (!mounted) return;
        setCurrentUserId(uid);

        // casino_settings flexible load
        try {
          const { data: settings } = await sb.from("casino_settings").select("*").limit(1).maybeSingle();
          if (settings && mounted) {
            const row: any = settings;

            setConfig((prev) => ({
              bankName:
                row?.spei_bank_name ||
                row?.bank_name ||
                row?.deposit_bank_name ||
                prev.bankName,
              accountHolder:
                row?.spei_account_holder ||
                row?.account_holder ||
                row?.deposit_account_holder ||
                prev.accountHolder,
              clabe:
                row?.spei_clabe ||
                row?.clabe ||
                row?.deposit_clabe ||
                "",
              cardNumber:
                row?.spei_card_number ||
                row?.card_number ||
                row?.deposit_card_number ||
                "",
              referenceLabel:
                row?.spei_reference_label ||
                row?.reference_label ||
                "Tu folio",
              minDeposit:
                Number(row?.min_manual_deposit || row?.min_deposit || prev.minDeposit) || prev.minDeposit,
              maxDeposit:
                Number(row?.max_manual_deposit || row?.max_deposit || prev.maxDeposit) || prev.maxDeposit,
              supportText:
                row?.manual_deposit_support_text ||
                row?.deposit_support_text ||
                prev.supportText,
            }));
          }
        } catch {
          // sin bronca si no existe o no trae columnas
        }

        if (uid) {
          await loadDeposits(uid);
        }
      } finally {
        if (mounted) setPageBusy(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadDeposits(userId: string) {
    const sb = supabaseBrowser();

    const attempts = [
      () =>
        sb
          .from("manual_deposit_requests")
          .select("id,folio,amount,status,created_at,metadata")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(12),
      () =>
        sb
          .from("manual_deposit_requests")
          .select("folio,amount,status,created_at,metadata")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(12),
      () =>
        sb
          .from("manual_deposit_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(12),
    ];

    for (const attempt of attempts) {
      const res = await attempt();
      if (!res.error) {
        const rows = Array.isArray(res.data) ? (res.data as DepositRow[]) : [];
        setDeposits(rows);
        return;
      }
    }

    setDeposits([]);
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      toast({
        title: "Copiado",
        description: `${label} ya quedó en portapapeles.`,
      });
      setTimeout(() => setCopied(""), 1400);
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Haz copy manual tantito.",
        variant: "destructive",
      });
    }
  }

  async function submitManualDeposit() {
    const sb = supabaseBrowser();

    if (!currentUserId) {
      toast({
        title: "Primero inicia sesión",
        description: "Sin cuenta activa no se puede levantar el depósito.",
        variant: "destructive",
      });
      return;
    }

    const amount = Math.floor(Number(depositAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Pon una cantidad real, no inventes humo 😅",
        variant: "destructive",
      });
      return;
    }

    if (amount < config.minDeposit) {
      toast({
        title: "Monto muy bajito",
        description: `El mínimo para esta vuelta es $${mxn(config.minDeposit)} MXN.`,
        variant: "destructive",
      });
      return;
    }

    if (amount > config.maxDeposit) {
      toast({
        title: "Monto demasiado alto",
        description: `El máximo por solicitud es $${mxn(config.maxDeposit)} MXN.`,
        variant: "destructive",
      });
      return;
    }

    if (!config.clabe) {
      toast({
        title: "Falta configurar la CLABE",
        description: "Primero mete los datos SPEI en casino_settings.",
        variant: "destructive",
      });
      return;
    }

    setSubmitBusy(true);

    try {
      const folio = makeFolio();

      const payloads = [
        {
          user_id: currentUserId,
          amount,
          status: "pending",
          folio,
          method: "spei_manual",
          destination: config.clabe,
          metadata: {
            flow: "wallet_spei_manual",
            note: note || null,
            reference_label: config.referenceLabel,
            requested_amount: amount,
          },
        },
        {
          user_id: currentUserId,
          amount,
          status: "pending",
          folio,
          metadata: {
            flow: "wallet_spei_manual",
            note: note || null,
          },
        },
        {
          user_id: currentUserId,
          amount,
          status: "pending",
          folio,
        },
      ];

      let inserted: any = null;
      let lastError: any = null;

      for (const payload of payloads) {
        const res = await sb.from("manual_deposit_requests").insert(payload).select("*").single();
        if (!res.error) {
          inserted = res.data;
          lastError = null;
          break;
        }
        lastError = res.error;
      }

      if (lastError) {
        throw lastError;
      }

      toast({
        title: "Depósito enviado",
        description: "Ya cayó tu solicitud. En cuanto soporte confirme, se refleja en tu wallet.",
      });

      setNote("");
      await loadDeposits(currentUserId);
      await refresh();

      if (inserted?.folio) {
        void copyValue("Folio", String(inserted.folio));
      }
    } catch (e: any) {
      toast({
        title: "No se pudo registrar",
        description:
          e?.message ||
          "La solicitud no entró. Revisa RLS o columnas de manual_deposit_requests.",
        variant: "destructive",
      });
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-90px)] w-full pb-24">
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-20" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(0,240,255,0.12),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,0,153,0.14),transparent_50%),radial-gradient(circle_at_50%_80%,rgba(255,215,0,0.08),transparent_50%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <Image
                src="/isotipo-color.png"
                alt="CHIDO"
                fill
                className="object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]"
              />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">
                Chido Wallet <span className="text-[#00F0FF]">SPEI</span>
              </div>
              <div className="text-xs text-white/55">
                Depósito manual bien armado, claro y listo para operar.
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
            <Wallet size={16} className="text-[#00F0FF]" />
            <div className="text-xs text-white/70">
              Disponible:{" "}
              <span className="font-black text-white">
                {loading ? "..." : formatted}
              </span>
              <span className="text-white/45"> + bono {loading ? "..." : formattedBonus}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Panel izquierdo */}
          <div className="space-y-5">
            {/* Resumen */}
            <section className="rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-black text-white/85">
                <Sparkles size={16} className="text-[#FFD700]" />
                Resumen de tu lana
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Saldo real</div>
                  <div className="mt-1 text-xl font-black tabular-nums">{loading ? "..." : formatted}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Saldo bono</div>
                  <div className="mt-1 text-xl font-black tabular-nums">{loading ? "..." : formattedBonus}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Total visible</div>
                  <div className="mt-1 text-xl font-black tabular-nums">${mxn(available)}</div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-[#00F0FF]/15 bg-[#00F0FF]/5 p-4 text-sm text-white/75">
                Aquí entra tu depósito por <span className="font-black text-white">SPEI manual</span>.  
                Cuando soporte lo confirma, cae a tu wallet. Sin vueltas raras.
              </div>
            </section>

            {/* Formulario depósito */}
            <section className="rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-black text-white/85">
                <Landmark size={16} className="text-[#00F0FF]" />
                Levantar depósito
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/45 font-black">
                    Monto a depositar
                  </label>
                  <div className="mt-2 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 font-black">$</span>
                    <Input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Math.max(0, Math.floor(Number(e.target.value || 0))))}
                      className="h-12 bg-black/40 border-white/10 text-white pl-8 font-mono"
                      disabled={submitBusy}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-white/45">
                    Mínimo ${mxn(config.minDeposit)} MXN • Máximo ${mxn(config.maxDeposit)} MXN
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDepositAmount(value)}
                      disabled={submitBusy}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {value}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/45 font-black">
                    Nota opcional
                  </label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ej. transferí desde BBVA, ya quedó"
                    className="mt-2 h-12 bg-black/40 border-white/10 text-white"
                    disabled={submitBusy}
                  />
                </div>

                <Button
                  onClick={submitManualDeposit}
                  disabled={submitBusy || pageBusy}
                  className={`h-14 rounded-3xl text-lg font-black uppercase tracking-widest transition-all ${
                    submitBusy
                      ? "bg-zinc-700 opacity-60 cursor-not-allowed"
                      : "bg-[#00F0FF] text-black hover:bg-[#00d6e6] shadow-[0_0_30px_rgba(0,240,255,0.22)] hover:scale-[1.01]"
                  }`}
                >
                  {submitBusy ? <Loader2 className="animate-spin" /> : "ENVIAR DEPÓSITO"}
                </Button>

                <div className="rounded-3xl border border-[#FFD700]/20 bg-[#FFD700]/8 p-4 text-sm text-white/75">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 text-[#FFD700]" />
                    <div>
                      <div className="font-black text-white">Ojo aquí</div>
                      <div className="mt-1 text-white/65">
                        Usa la <span className="font-black text-white">misma cantidad</span> que vas a transferir.
                        Así soporte la ubica más rápido y no se hace bolas.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Historial */}
            <section className="rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-black text-white/85">
                  <Clock3 size={16} className="text-[#FFD700]" />
                  Solicitudes recientes
                </div>

                <button
                  type="button"
                  onClick={() => currentUserId && loadDeposits(currentUserId)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/75 transition hover:bg-white/10"
                >
                  Recargar
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {pageBusy ? (
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                    Cargando solicitudes...
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                    Aún no hay solicitudes. Cuando mandes una, aquí mismo sale.
                  </div>
                ) : (
                  deposits.map((row, idx) => (
                    <div
                      key={row.id || row.folio || idx}
                      className="rounded-3xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-sm font-black text-white">
                            {row.folio || "Sin folio"}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString("es-MX")
                              : "Fecha no disponible"}
                          </div>
                        </div>

                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${statusClasses(
                            row.status
                          )}`}
                        >
                          {String(row.status).toLowerCase() === "approved" ||
                          String(row.status).toLowerCase() === "confirmed" ||
                          String(row.status).toLowerCase() === "completed" ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Clock3 size={14} />
                          )}
                          {statusLabel(row.status)}
                        </div>
                      </div>

                      <div className="mt-3 text-lg font-black tabular-nums text-white">
                        ${mxn(row.amount)} MXN
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Panel derecho */}
          <div className="space-y-5">
            <section className="rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-black text-white/85">
                <ShieldCheck size={16} className="text-[#32CD32]" />
                Datos para transferir
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Banco</div>
                  <div className="mt-1 text-sm font-black text-white">{config.bankName || "Pendiente"}</div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">Titular</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-sm font-black text-white break-all">
                      {config.accountHolder || "Pendiente"}
                    </div>
                    {!!config.accountHolder && (
                      <button
                        type="button"
                        onClick={() => copyValue("Titular", config.accountHolder)}
                        className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-2 text-white/75 hover:bg-white/10"
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#00F0FF]/20 bg-[#00F0FF]/5 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">CLABE</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-base font-black text-white tracking-wide break-all">
                      {config.clabe || "Pendiente"}
                    </div>
                    {!!config.clabe && (
                      <button
                        type="button"
                        onClick={() => copyValue("CLABE", config.clabe)}
                        className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {!!config.cardNumber && (
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-white/45">Tarjeta</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-sm font-black text-white break-all">{config.cardNumber}</div>
                      <button
                        type="button"
                        onClick={() => copyValue("Tarjeta", config.cardNumber)}
                        className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-2 text-white/75 hover:bg-white/10"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-[#FFD700]/20 bg-[#FFD700]/8 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/45">
                    Referencia recomendada
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    Usa el <span className="text-[#FFD700]">{config.referenceLabel}</span> que te da la solicitud.
                  </div>
                  <div className="mt-2 text-xs text-white/60">
                    Eso ayuda a que el depósito se ubique más rápido cuando llega.
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl">
              <div className="text-sm font-black text-white/85">Cómo se arma</div>

              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  1. Levantas la solicitud aquí con el monto exacto.
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  2. Mandas el SPEI a la CLABE mostrada.
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  3. Soporte lo valida y cae a tu wallet.
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  4. Si tarda más de lo normal, te ayudan sin hacerla de emoción.
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
                {config.supportText}
              </div>
            </section>
          </div>
        </div>

        {copied ? (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-[#32CD32]/20 bg-[#32CD32]/10 px-4 py-3 text-sm font-black text-[#9BFF9B] shadow-xl">
            {copied} copiado
          </div>
        ) : null}
      </div>
    </div>
  );
}