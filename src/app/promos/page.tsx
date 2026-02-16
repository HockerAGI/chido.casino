"use client";

import { useEffect, useMemo, useState } from "react";

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
  status: string;
  claimed_at: string;
  expires_at: string | null;
};

export default function PromosPage() {
  const [offers, setOffers] = useState<PromoOffer[]>([]);
  const [activeClaim, setActiveClaim] = useState<PromoClaim | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

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
  }, []);

  const redeem = async (slug: string) => {
    setBusySlug(slug);
    setMsg(null);
    try {
      const res = await fetch("/api/promos/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo activar");
      setMsg(json?.message ?? "Listo");
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Error");
    } finally {
      setBusySlug(null);
    }
  };

  const n = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Promos</h1>
      <p className="text-white/70 mb-6">
        Activa una promo y se aplicará cuando hagas tu próximo depósito que cumpla
        el mínimo.
      </p>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-6">
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            className="flex-1 rounded bg-black/40 border border-white/10 px-3 py-2"
            placeholder="Pega tu código (slug)…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="px-4 py-2 rounded bg-emerald-500 text-black font-semibold disabled:opacity-60"
            disabled={!code.trim()}
            onClick={() => void redeem(code.trim())}
          >
            Activar
          </button>
        </div>

        {activeClaim?.status === "active" ? (
          <div className="mt-3 text-amber-300">
            Tienes una promo activa. Primero úsala con tu siguiente depósito.
          </div>
        ) : null}
      </div>

      {msg ? (
        <div className="mb-6 rounded border border-white/10 bg-white/5 p-3 text-white/80">
          {msg}
        </div>
      ) : null}

      {loading ? (
        <div className="text-white/70">Cargando…</div>
      ) : offers.length === 0 ? (
        <div className="text-white/70">No hay promos activas.</div>
      ) : (
        <div className="grid gap-3">
          {offers.map((o) => {
            const isActive = activeOfferId === o.id;
            return (
              <div
                key={o.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-lg">{o.title}</div>
                    {o.description ? (
                      <div className="text-white/70 mt-1">{o.description}</div>
                    ) : null}

                    <div className="text-sm text-white/70 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Mín: <b>${n(o.min_deposit).toFixed(0)} MXN</b>
                      </span>
                      <span>
                        Bono: <b>{n(o.bonus_percent).toFixed(0)}%</b> (tope{" "}
                        <b>${n(o.max_bonus).toFixed(0)}</b>)
                      </span>
                      {n(o.free_rounds) > 0 ? (
                        <span>
                          Free rounds: <b>{n(o.free_rounds)}</b>
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-white/50 mt-2">
                      Código: <span className="font-mono">{o.slug}</span>
                      {o.ends_at ? (
                        <>
                          {" "}• vence: {new Date(o.ends_at).toLocaleString()}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      className={`px-4 py-2 rounded font-semibold disabled:opacity-60 ${
                        isActive
                          ? "bg-amber-400 text-black"
                          : "bg-white text-black"
                      }`}
                      disabled={isActive || busySlug === o.slug}
                      onClick={() => void redeem(o.slug)}
                    >
                      {isActive
                        ? "Activa"
                        : busySlug === o.slug
                          ? "Activando…"
                          : "Activar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
