"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  Link as LinkIcon,
  Copy,
  TrendingUp,
  Coins,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Wallet,
  BadgeCheck,
} from "lucide-react";

type ApiMe = {
  ok: boolean;
  affiliate?: { code: string; status: string; created_at?: string };
  link?: string;
  stats?: { clicks: number; registrations: number; firstDeposits: number; totalCommission: number };
  recentCommissions?: {
    amount: number;
    status: string;
    reason: string;
    created_at: string | null;
    referred_user_id: string | null;
  }[];
  error?: string;
};

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export default function AffiliatesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiMe | null>(null);

  const link = useMemo(() => data?.link || "", [data]);
  const totalCommission = useMemo(() => data?.stats?.totalCommission || 0, [data]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/me", { cache: "no-store" });
      const json = (await res.json()) as ApiMe;
      setData(json);
    } catch {
      setData({ ok: false, error: "No se pudo cargar el panel de afiliados." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Enlace copiado", description: "Ya lo puedes compartir." });
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia el enlace manualmente.", variant: "destructive" });
    }
  };

  const stats = data?.stats || { clicks: 0, registrations: 0, firstDeposits: 0, totalCommission: 0 };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 animate-fade-in flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="animate-spin" size={18} /> Cargando tu panel de afiliados…
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="min-h-screen pb-20 animate-fade-in max-w-5xl mx-auto p-6">
        <Card className="bg-[#1A1A1D] border-white/10 p-6 rounded-2xl">
          <div className="text-xl font-black text-white">Afiliados</div>
          <div className="text-white/60 mt-2">{data?.error || "Error cargando datos."}</div>
          <Button className="mt-4" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      <div className="bg-[#121214] border-b border-white/5 pt-10 pb-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
              Programa de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#32CD32] to-[#00F0FF]">
                Afiliados
              </span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-base font-medium">
              Comparte tu enlace, trae jugadores y gana comisión sobre actividad validada.
            </p>
          </div>

          {totalCommission > 0 && (
            <Button
              onClick={() => router.push("/wallet?tab=withdraw&type=commission")}
              className="bg-[#32CD32] text-black hover:bg-[#28a745] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(50,205,50,0.3)]"
            >
              <Wallet size={16} /> Retirar ganancias
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clicks</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><TrendingUp size={16} /></div>
            </div>
            <div className="text-3xl font-black text-white">{stats.clicks}</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registros</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><Users size={16} /></div>
            </div>
            <div className="text-3xl font-black text-white">{stats.registrations}</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Primeros depósitos</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><BadgeCheck size={16} /></div>
            </div>
            <div className="text-3xl font-black text-white">{stats.firstDeposits}</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Comisión</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400"><Coins size={16} /></div>
            </div>
            <div className="text-3xl font-black text-[#32CD32]">{money(stats.totalCommission)}</div>
          </Card>
        </div>

        <Card className="bg-[#1A1A1D] border-white/5 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Tu enlace</div>
              <div className="flex items-center gap-2">
                <LinkIcon size={16} className="text-[#00F0FF]" />
                <div className="font-mono text-sm text-white/90 break-all">{link}</div>
              </div>
              <div className="text-[11px] text-white/45 mt-2">
                Código: <b className="text-white">{data.affiliate?.code || "—"}</b> • Estado:{" "}
                <b className="text-white capitalize">{data.affiliate?.status || "—"}</b>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={copyToClipboard} className="bg-white text-black hover:bg-zinc-200 font-black">
                <Copy size={16} className="mr-2" /> Copiar
              </Button>
              <Link href="/wallet?tab=withdraw&type=commission">
                <Button variant="secondary" className="font-black">
                  <ArrowRight size={16} /> Ir a retiros
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-white/60">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            Las comisiones se acreditan solo sobre actividad validada y sin fraude.
          </div>
        </Card>

        <Card className="bg-[#121214] border-white/5 p-6 rounded-2xl">
          <div className="text-lg font-black mb-3 text-white">Últimas comisiones</div>
          {data.recentCommissions && data.recentCommissions.length > 0 ? (
            <div className="space-y-2">
              {data.recentCommissions.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 p-3">
                  <div>
                    <div className="text-sm font-bold text-white">{c.reason}</div>
                    <div className="text-xs text-white/50">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : "—"} •{" "}
                      <span className="capitalize">{c.status}</span>
                    </div>
                  </div>
                  <div className="font-mono text-sm tabular-nums text-[#32CD32]">
                    +{Number(c.amount || 0).toFixed(2)} MXN
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/60">
              Aquí aparecerán tus comisiones cuando tus referidos generen actividad real.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}