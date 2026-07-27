"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Ticket, ShieldAlert, Loader2, Sparkles, ArrowRight, CheckCircle2, Flame, ChevronRight, Clock3 } from "lucide-react";
import { DailyStreakBar } from "@/components/ui/daily-streak-bar";

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

function money(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

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
      if (!res.ok) throw new Error(json?.error || "Error cargando las promos");
      setOffers(json.offers || []);
      setActiveClaim(json.activeClaim || null);
    } catch (e: any) {
      setMsg(e?.message ?? "Error cargando las promos.");
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
      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || "No se pudo clavar");

      setMsg(json?.message || "¡Promo clavada!");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo clavar la promoción.");
    } finally {
      setBusy(false);
    }
  };

  const required = n(activeClaim?.wagering_required);
  const progress = n(activeClaim?.wagering_progress);
  const pct = required > 0 ? Math.min(100, Math.round((progress / required) * 100)) : 0;

  return (
    <div className="min-h-screen pb-24">
      <div className="relative overflow-hidden border-b border-white/5 bg-[linear-gradient(135deg,rgba(26,10,46,0.96),rgba(12,12,16,0.98))] px-6 py-14">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#FF0099]/10 blur-[110px]" />
        <div className="absolute right-1/4 top-0 h-96 w-96 rounded-full bg-[#00F0FF]/8 blur-[110px]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF0099]/20 bg-[#FF0099]/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#FF0099]">
            <Sparkles size={14} /> Promociones
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">
            Bonos claros,{" "}
            <span className="bg-gradient-to-r from-[#FF0099] to-[#FF5E00] bg-clip-text text-transparent">
              reglas claras.
            </span>
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
            Aquí ves tus promos activas, el progreso de wagering y el estado de tus recompensas. Todo al claro.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <Card className="border-white/10 bg-black/35 p-5 rounded-[2rem]">
          <DailyStreakBar />
        </Card>

        {activeClaim?.status === "active" && (
          <section className="rounded-[2rem] border border-[#FFD700]/20 bg-[linear-gradient(135deg,rgba(26,18,0,0.92),rgba(0,0,0,0.7))] p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/10">
                <ShieldAlert className="text-[#FFD700]" size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-white">Promo activa</div>
                <div className="mt-1 text-sm text-white/55">
                  Código: <span className="font-mono text-white/80">{activeClaim.offer_id}</span>
                </div>

                {required > 0 && (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF5E00]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-white/45">
                      {money(progress)} / {money(required)} • {pct}%
                    </div>
                  </>
                )}
              </div>

              <Link
                href="/wallet?tab=deposit"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.02]"
              >
                Echar lana <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-[#FFD700]" />
            <h2 className="text-base font-black text-white">Clavarlo por código</h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: bienvenida-100"
              className="h-12 border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#FFD700]/40"
            />
            <button
              onClick={() => void redeem(code)}
              disabled={busy || !code.trim()}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-black transition hover:scale-[1.01] disabled:opacity-40"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : "Clavarlo"}
            </button>
          </div>

          <div className="mt-3 text-[11px] text-white/45">Si una promo queda activa, se va a aplicar en tu siguiente depósito válido.</div>

          {msg ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{msg}</div>
          ) : null}
        </section>

        <section className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-white">Promos disponibles</div>
            <div className="text-xs text-white/40">Bonos, free rounds y wagering al tiro.</div>
          </div>
          <Link href="/lobby" className="inline-flex items-center gap-2 text-xs font-black text-white/60 transition hover:text-white">
            Al lobby <ChevronRight size={14} />
          </Link>
        </section>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="animate-spin" size={16} /> Cargando…
          </div>
        ) : offers.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-6 text-white/60">No hay promos activas por ahora, carnal.</div>
        ) : (
          <div className="grid gap-4">
            {offers.map((o) => {
              const isActive = activeOfferId === o.id;
              const min = n(o.min_deposit);
              const pctBonus = n(o.bonus_percent);
              const max = n(o.max_bonus);
              const fr = n(o.free_rounds);
              const wm = n(o.wagering_multiplier);

              return (
                <article
                  key={o.id}
                  className={`rounded-[1.75rem] border p-5 backdrop-blur-xl ${
                    isActive
                      ? "border-[#32CD32]/20 bg-[#32CD32]/8"
                      : "border-white/10 bg-black/35 hover:border-white/15"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                          {o.slug}
                        </div>
                        {isActive ? (
                          <div className="rounded-full border border-[#32CD32]/20 bg-[#32CD32]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#32CD32]">
                            Activa
                          </div>
                        ) : null}
                        {o.ends_at ? (
                          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                            <Clock3 size={11} className="inline mr-1" />
                            Vence {new Date(o.ends_at).toLocaleDateString()}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 text-2xl font-black text-white">{o.title}</div>
                      <div className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                        {o.description || "Promo bien chida con condiciones claras y seguimiento visible."}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/55">
                          Depósito mínimo: {money(min)}
                        </span>
                        <span className="rounded-full border border-[#FF0099]/15 bg-[#FF0099]/8 px-3 py-1 text-[11px] font-bold text-[#FF0099]">
                          Bono: {pctBonus}%
                        </span>
                        <span className="rounded-full border border-[#FFD700]/15 bg-[#FFD700]/8 px-3 py-1 text-[11px] font-bold text-[#FFD700]">
                          Máx: {money(max)}
                        </span>
                        {fr > 0 ? (
                          <span className="rounded-full border border-[#00F0FF]/15 bg-[#00F0FF]/8 px-3 py-1 text-[11px] font-bold text-[#00F0FF]">
                            Free rounds: {fr}
                          </span>
                        ) : null}
                        {wm > 0 ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/55">
                            Wagering x{wm}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        onClick={() => void redeem(o.slug)}
                        disabled={busy || isActive}
                        className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
                          isActive
                            ? "bg-[#32CD32] text-black"
                            : "bg-white text-black hover:scale-[1.02]"
                        } disabled:opacity-40`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 size={16} /> Activa
                          </>
                        ) : (
                          <>
                            Activar <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}