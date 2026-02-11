"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Tag } from "lucide-react";

type Promo = {
  id: string;
  code: string;
  title: string;
  description: string;
  rewardType: "bonus" | "balance" | string;
  rewardAmount: number;
  expiresAt: string | null;
  perUserLimit?: number;
  maxRedemptions?: number | null;
  redeemed: boolean;
  redeemedAt?: string | null;
};

type ListResponse =
  | { ok: true; promos: Promo[]; warning?: string }
  | { ok: false; error: string };

type RedeemResponse =
  | { ok: true; message?: string; promo?: any }
  | { ok: false; error: string };

function fmtMoney(n: number) {
  return `$${Number(n).toFixed(2)} MXN`;
}

export default function PromosPage() {
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hasPromos = promos.length > 0;

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/promos/list", { cache: "no-store" });
      const data = (await res.json()) as ListResponse;
      if (!data.ok) {
        setMsg(data.error || "Error al cargar promos.");
        setPromos([]);
      } else {
        setPromos(data.promos || []);
        if (data.warning === "PROMOS_TABLE_MISSING") {
          setMsg("Falta tabla `promos` en DB. Corre el SQL del BLOQUE 4.");
        }
      }
    } catch (e: any) {
      setMsg(e?.message || "Error al cargar promos.");
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copiado ✅");
      setTimeout(() => setMsg(null), 1100);
    } catch {
      setMsg("No se pudo copiar.");
      setTimeout(() => setMsg(null), 1100);
    }
  };

  const redeem = async (redeemCode?: string) => {
    const finalCode = String(redeemCode ?? code).trim();
    if (!finalCode) {
      setMsg("Escribe un código.");
      return;
    }

    setRedeeming(true);
    setMsg(null);

    try {
      const res = await fetch("/api/promos/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: finalCode }),
      });

      const data = (await res.json()) as RedeemResponse;

      if (!data.ok) {
        if (data.error === "ALREADY_REDEEMED") setMsg("Ya canjeaste esta promo.");
        else if (data.error === "PROMO_NOT_FOUND") setMsg("Código inválido.");
        else if (data.error === "PROMO_EXPIRED") setMsg("Promo expirada.");
        else if (data.error === "PROMO_SOLD_OUT") setMsg("Promo agotada.");
        else setMsg(data.error || "Error al canjear.");
        return;
      }

      setMsg(data.message || "Canjeado ✅");
      setCode("");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Error al canjear.");
    } finally {
      setRedeeming(false);
    }
  };

  const sorted = useMemo(() => {
    // no tocamos las redeemeds, solo orden visual
    return [...promos].sort((a, b) => Number(a.redeemed) - Number(b.redeemed));
  }, [promos]);

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      {/* Fondo */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/85" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight">Promos</div>
              <div className="text-sm text-white/65">Canjea códigos y recibe saldo o bonus.</div>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-black/35 p-4">
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CÓDIGO (ej: CHIDO50)"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none uppercase"
              />
              <button
                onClick={() => redeem()}
                disabled={redeeming}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
              >
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Canjear"}
              </button>
            </div>
            {msg && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
                {msg}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Promos activas</div>
            <button
              onClick={load}
              className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Refrescar
            </button>
          </div>

          {loading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : !hasPromos ? (
            <div className="mt-5 text-sm text-white/60">No hay promos activas por ahora.</div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {sorted.map((p) => (
                <div
                  key={p.id}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-semibold">{p.title}</div>
                      <div className="text-sm text-white/70">{p.description}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                      <div className="text-[11px] text-white/60">Reward</div>
                      <div className="text-sm font-semibold">
                        +{fmtMoney(p.rewardAmount)} {String(p.rewardType).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs">
                      <span className="text-white/60">Código:</span>
                      <span className="font-mono text-white/85">{p.code}</span>
                      <button onClick={() => copy(p.code)} className="opacity-80 hover:opacity-100">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    {p.expiresAt && (
                      <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/65">
                        Expira: {new Date(p.expiresAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/55">
                      {p.redeemed ? "Ya canjeada ✅" : "Disponible"}
                    </div>

                    <button
                      onClick={() => redeem(p.code)}
                      disabled={redeeming || p.redeemed}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                        p.redeemed ? "bg-white/5" : "bg-white/10 hover:bg-white/15"
                      }`}
                    >
                      {p.redeemed ? "Canjeada" : "Canjear"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-xs text-white/45">
          * Las promos pueden ser saldo o bonus. Canje = una vez por usuario (según límite).
        </div>
      </div>
    </div>
  );
}