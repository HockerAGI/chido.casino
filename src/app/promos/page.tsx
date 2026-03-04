"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Ticket, ShieldAlert, Loader2, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

type PromoOffer = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  min_deposit: string | number | null;
  bonus_percent: string | number | null;
  max_bonus: string | number | null;
  free_rounds: number | null;
  wagering_multiplier: string | number | null;
  ends_at: string | null;
};

type PromoClaim = {
  id: string;
  offer_id: string;
  status: "active" | "applied" | "completed" | string;
  claimed_at: string;
  expires_at: string | null;
  bonus_awarded?: number | null;
  free_rounds_awarded?: number | null;
  wagering_required?: number | null;
  wagering_progress?: number | null;
};

const n = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export default function PromosPage() {
  const [offers, setOffers] = useState<PromoOffer[]>([]);
  const [activeClaim, setActiveClaim] = useState<PromoClaim | null>(null);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const activeOfferId = useMemo(
    () => (activeClaim?.status === "active" ? activeClaim.offer_id : null),
    [activeClaim]
  );

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/promos/list", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando promos");
      setOffers(json.offers || []);
      setActiveClaim(json.activeClaim || null);
    } catch (e: any) {
      setMsg(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const redeem = async (slug: string) => {
    const s = String(slug || "").trim();
    if (!s) return;
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/promos/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: s }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo activar");
      setMsg(json?.message || "Promo activada.");
      setCode("");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const required = n(activeClaim?.wagering_required);
  const progress = n(activeClaim?.wagering_progress);
  const pct = required > 0 ? Math.min(100, Math.round((progress / required) * 100)) : 0;

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-[#121214] border-b border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FF0099]/10 border border-[#FF0099]/20 px-3 py-1 text-[11px] font-black tracking-widest text-[#FF0099]">
            <Sparkles size={14} /> BONOS / PROMOS
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight">Promos reales</h1>
          <p className="mt-2 text-white/65 max-w-2xl">
            Activa una promo y se aplica en tu próximo depósito válido. Si genera bono, el retiro queda bloqueado hasta cumplir el requisito de apuesta.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Estado promo */}
        <Card className="bg-black/30 border-white/10 p-5 rounded-3xl">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                <Gift />
              </div>
              <div>
                <div className="text-sm font-black">Estado de tu promo</div>
                <div className="text-xs text-white/55">
                  {activeClaim?.status === "active"
                    ? "Promo activa: se aplicará en tu próximo depósito que cumpla el mínimo."
                    : activeClaim?.status === "applied"
                      ? "Bono aplicado: estás en rollover. Juega para completar el requisito."
                      : "Sin promo activa."}
                </div>
              </div>
            </div>

            <Link href="/wallet?tab=deposit">
              <Button className="font-black">
                Depositar <ArrowRight size={16} />
              </Button>
            </Link>
          </div>

          {activeClaim?.status === "applied" && required > 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between text-xs text-white/65">
                <span className="font-bold">Rollover</span>
                <span className="font-mono">
                  {progress.toFixed(0)} / {required.toFixed(0)} MXN • {pct}%
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[#32CD32]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 text-[11px] text-white/45 flex items-center gap-2">
                <ShieldAlert size={14} /> Retiro bloqueado hasta completar el requisito.
              </div>
            </div>
          ) : null}

          {activeClaim?.status === "applied" && required <= 0 ? (
            <div className="mt-4 text-xs text-white/55">
              Este bono no tiene requisito de apuesta (o aún no se registró). Si ves inconsistencia, soporte lo revisa.
            </div>
          ) : null}

          {msg ? (
            <div className="mt-4 text-sm text-white/70">{msg}</div>
          ) : null}
        </Card>

        {/* Activación por código */}
        <Card className="bg-black/30 border-white/10 p-5 rounded-3xl">
          <div className="flex items-center gap-2 text-sm font-black">
            <Ticket size={18} /> Activar por código
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: bienvenida-100"
              className="h-12"
            />
            <Button
              onClick={() => void redeem(code)}
              disabled={busy || !code.trim()}
              className="h-12 font-black"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : "Activar"}
            </Button>
          </div>
          <div className="mt-3 text-[11px] text-white/45">
            Regla real: 1 promo activa por usuario a la vez.
          </div>
        </Card>

        {/* Lista de promos */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-black">Promos disponibles</div>
          <Link href="/lobby" className="text-xs text-white/60 hover:text-white">
            Volver al lobby →
          </Link>
        </div>

        {loading ? (
          <div className="text-white/60 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Cargando…
          </div>
        ) : offers.length === 0 ? (
          <div className="text-white/60">No hay promos activas.</div>
        ) : (
          <div className="grid gap-4">
            {offers.map((o) => {
              const isActive = activeOfferId === o.id;
              const min = n(o.min_deposit);
              const pct = n(o.bonus_percent);
              const max = n(o.max_bonus);
              const fr = n(o.free_rounds);

              return (
                <Card key={o.id} className="bg-black/30 border-white/10 p-5 rounded-3xl">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-xl font-black">{o.title}</div>
                      {o.description ? (
                        <div className="mt-1 text-sm text-white/65">{o.description}</div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white/75">
                          Mín: <b className="ml-1 text-white">{min.toFixed(0)} MXN</b>
                        </span>
                        <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white/75">
                          Bono: <b className="ml-1 text-white">{pct.toFixed(0)}%</b> (tope <b className="ml-1 text-white">{max.toFixed(0)}</b>)
                        </span>
                        {fr > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 text-white/75">
                            Free rounds: <b className="ml-1 text-white">{fr}</b>
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-[11px] text-white/45">
                        Código: <span className="font-mono text-white/70">{o.slug}</span>
                        {o.ends_at ? <> • vence: {new Date(o.ends_at).toLocaleString()}</> : null}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2">
                      <Button
                        onClick={() => void redeem(o.slug)}
                        disabled={busy || isActive}
                        className={`font-black ${isActive ? "bg-[#FFD700] text-black" : ""}`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 size={16} /> Activa
                          </>
                        ) : (
                          "Activar"
                        )}
                      </Button>
                      <Link href="/wallet?tab=deposit">
                        <Button variant="secondary" className="w-full font-black">
                          Depositar
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}