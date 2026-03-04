"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Link as LinkIcon, Copy, TrendingUp, Coins, ShieldAlert, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type ApiMe = {
  ok: boolean;
  affiliate?: { code: string; status: string; created_at?: string };
  link?: string;
  stats?: { clicks: number; registrations: number; firstDeposits: number; totalCommission: number };
  recentCommissions?: { amount: number; status: string; reason: string; created_at: string | null; referred_user_id: string | null }[];
  error?: string;
};

export default function AffiliatesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiMe | null>(null);

  const link = useMemo(() => data?.link || "", [data]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/me", { cache: "no-store" });
      const json = (await res.json()) as ApiMe;
      setData(json);
    } catch {
      setData({ ok: false, error: "No se pudo cargar afiliados." });
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
      toast({ title: "Link copiado", description: "Pégalo donde quieras y listo." });
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia manualmente el link.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 animate-fade-in flex items-center justify-center text-white/70 gap-2">
        <Loader2 className="animate-spin" size={18} /> Cargando afiliados…
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="min-h-screen pb-20 animate-fade-in max-w-4xl mx-auto p-6">
        <Card className="bg-[#1A1A1D] border-white/10 p-6 rounded-2xl">
          <div className="text-xl font-black">Afiliados</div>
          <div className="text-white/60 mt-2">{data?.error || "Error cargando datos."}</div>
          <Button className="mt-4" onClick={() => void load()}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  const s = data.stats!;

  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      <div className="bg-[#121214] border-b border-white/5 pt-10 pb-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
              Panel de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#32CD32] to-[#00F0FF]">
                Afiliados
              </span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-base font-medium">
              Tu código ya está activo. Comparte tu link y gana comisión cuando tu referido haga su primer depósito válido.
            </p>
          </div>

          <Button
            onClick={() => router.push("/wallet?tab=withdraw")}
            className="bg-[#32CD32] text-black hover:bg-[#28a745] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(50,205,50,0.3)]"
          >
            Ir a retiros
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clicks</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{s.clicks}</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registros</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400">
                <Users size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{s.registrations}</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">1er Depósito</div>
              <div className="p-1.5 bg-white/5 rounded-lg text-zinc-400">
                <Users size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{s.firstDeposits}</div>
          </Card>

          <Card className="bg-[#1A1A1D] border-white/5 p-5 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#32CD32]/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="text-[10px] font-bold text-[#32CD32] uppercase tracking-widest">Comisión total</div>
              <div className="p-1.5 bg-[#32CD32]/10 rounded-lg text-[#32CD32]">
                <Coins size={16} />
              </div>
            </div>
            <div className="text-3xl font-black text-[#00F0FF] relative z-10 drop-shadow-md">
              {Number(s.totalCommission || 0).toFixed(2)} <span className="text-lg text-white/50">MXN</span>
            </div>
          </Card>
        </div>

        <Card className="bg-[#1A1A1D] border-white/5 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Tu link</div>
              <div className="flex items-center gap-2">
                <LinkIcon size={16} className="text-[#00F0FF]" />
                <div className="font-mono text-sm text-white/90 break-all">{link}</div>
              </div>
              <div className="text-[11px] text-white/45 mt-2">
                Código: <b className="text-white">{data.affiliate?.code}</b> • Estado: <b className="text-white">{data.affiliate?.status}</b>
              </div>
            </div>

            <Button onClick={copyToClipboard} className="bg-white text-black hover:bg-zinc-200 font-black">
              <Copy size={16} className="mr-2" /> Copiar
            </Button>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-white/60">
            <ShieldAlert size={16} className="mt-0.5" />
            Anti-abuso real: no auto-referidos, no multicuenta. Si se detecta abuso, se bloquean comisiones.
          </div>
        </Card>

        <Card className="bg-[#121214] border-white/5 p-6 rounded-2xl">
          <div className="text-lg font-black mb-3">Últimas comisiones</div>
          {data.recentCommissions && data.recentCommissions.length > 0 ? (
            <div className="space-y-2">
              {data.recentCommissions.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 p-3">
                  <div>
                    <div className="text-sm font-bold">{c.reason}</div>
                    <div className="text-xs text-white/50">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : "—"} • {c.status}
                    </div>
                  </div>
                  <div className="font-mono text-sm tabular-nums text-[#32CD32]">
                    +{Number(c.amount || 0).toFixed(2)} MXN
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/60">Aún no hay comisiones acreditadas.</div>
          )}
        </Card>
      </div>
    </div>
  );
}