"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Copy, MousePointerClick, Users, BadgeDollarSign, RefreshCw } from "lucide-react";

type AffiliateMe = {
  ok: boolean;
  code: string;
  link: string;
  stats: { clicks: number; signups: number; earnings: number };
  recent: {
    referrals: Array<{
      created_at: string;
      referred_user_id: string;
      status: string;
      total_commission: number;
      total_deposited: number;
    }>;
    commissions: Array<{
      created_at: string;
      referred_user_id: string;
      amount: number;
      reason: string;
      status: string;
    }>;
  };
};

export default function AffiliatesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<AffiliateMe | null>(null);
  const [loading, setLoading] = useState(true);

  const shortLink = useMemo(() => (data?.link ? data.link.replace(/^https?:\/\//, "") : ""), [data]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/me");
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo cargar afiliados");
      }
      setData(json);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!data?.link) return;
    await navigator.clipboard.writeText(data.link);
    toast({ title: "Copiado", description: "Tu link de afiliado ya está en el portapapeles." });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Afiliados</h1>
        <Button
          onClick={load}
          variant="secondary"
          className="rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <p className="mt-2 text-white/70">
        Comparte tu link, trae usuarios y cobra. Simple y directo.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/60">Tu código</div>
          <div className="mt-1 text-2xl font-black">{loading ? "…" : data?.code}</div>
          <div className="mt-4 text-sm text-white/60">Tu link</div>
          <div className="mt-1 break-all text-sm text-white/80">{loading ? "…" : shortLink}</div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={copyLink}
              disabled={loading || !data?.link}
              className="rounded-2xl bg-white text-black hover:bg-white/90"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-white/70">
            <MousePointerClick className="h-4 w-4" /> Clicks
          </div>
          <div className="mt-2 text-4xl font-black">{loading ? "…" : data?.stats.clicks ?? 0}</div>
          <p className="mt-2 text-sm text-white/60">Cuántas veces abrieron tu link.</p>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-white/70">
            <Users className="h-4 w-4" /> Registros
          </div>
          <div className="mt-2 text-4xl font-black">{loading ? "…" : data?.stats.signups ?? 0}</div>
          <p className="mt-2 text-sm text-white/60">Usuarios atribuidos a tu código.</p>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 p-6 md:col-span-3">
          <div className="flex items-center gap-2 text-white/70">
            <BadgeDollarSign className="h-4 w-4" /> Ganancias
          </div>
          <div className="mt-2 text-4xl font-black">
            {loading ? "…" : `$${(data?.stats.earnings ?? 0).toFixed(2)} MXN`}
          </div>
          <p className="mt-2 text-sm text-white/60">Comisiones acreditadas (primer depósito, etc.).</p>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold">Últimos referidos</h2>
          <div className="mt-4 space-y-3">
            {(data?.recent.referrals || []).slice(0, 10).map((r) => (
              <div
                key={r.referred_user_id + r.created_at}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold">{r.status}</div>
                  <div className="text-xs text-white/60">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-white/80">Dep: ${Number(r.total_deposited || 0).toFixed(2)}</div>
                  <div className="text-white/80">Com: ${Number(r.total_commission || 0).toFixed(2)}</div>
                </div>
              </div>
            ))}
            {!loading && (data?.recent.referrals || []).length === 0 && (
              <div className="text-sm text-white/60">Aún no hay referidos.</div>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold">Últimas comisiones</h2>
          <div className="mt-4 space-y-3">
            {(data?.recent.commissions || []).slice(0, 10).map((c) => (
              <div
                key={c.referred_user_id + c.created_at + c.reason}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold">{c.reason}</div>
                  <div className="text-xs text-white/60">
                    {new Date(c.created_at).toLocaleString()} • {c.status}
                  </div>
                </div>
                <div className="text-sm font-bold">${Number(c.amount || 0).toFixed(2)}</div>
              </div>
            ))}
            {!loading && (data?.recent.commissions || []).length === 0 && (
              <div className="text-sm text-white/60">Aún no hay comisiones.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}