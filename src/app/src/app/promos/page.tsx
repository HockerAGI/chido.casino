"use client";

import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Footer } from "@/components/layout/footer";
import { supabase } from "@/lib/supabaseClient";
import { Gift, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Promo = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  reward_balance: number;
  reward_bonus: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("promo_codes")
        .select("id, code, title, description, reward_balance, reward_bonus, is_active, starts_at, ends_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (error) setMsg({ type: "error", text: error.message });
      setPromos((data as any) || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const list = useMemo(() => {
    return promos.filter((p) => {
      if (p.starts_at && new Date(p.starts_at) > now) return false;
      if (p.ends_at && new Date(p.ends_at) < now) return false;
      return true;
    });
  }, [promos, now]);

  async function redeem(code: string) {
    setMsg(null);
    setRedeeming(code);
    try {
      const res = await fetch("/api/promos/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo reclamar.");
      setMsg({ type: "success", text: `Reclamado: ${code}. Saldo actualizado.` });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Error" });
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-chido-gold/10 rounded-2xl border border-chido-gold/20">
            <Gift className="text-chido-gold" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Bonos & Promos</h1>
            <p className="text-zinc-500 text-sm font-medium">Reclama códigos y recompensas reales.</p>
          </div>
        </div>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-5 ${
              msg.type === "success" ? "bg-chido-green/20 text-chido-green" : "bg-chido-red/20 text-chido-red"
            }`}
          >
            <AlertCircle size={14} /> {msg.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 font-bold">
            <Loader2 className="animate-spin" /> Cargando promos…
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.length ? (
              list.map((p) => (
                <div key={p.id} className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 backdrop-blur-sm">
                  <div className="text-xs font-black text-chido-gold uppercase tracking-wider">{p.code}</div>
                  <div className="text-xl font-black text-white mt-1">{p.title}</div>
                  {p.description && <div className="text-sm text-zinc-400 mt-2">{p.description}</div>}

                  <div className="mt-4 text-sm font-bold text-white">
                    +${Number(p.reward_balance || 0).toFixed(2)} MXN{" "}
                    {Number(p.reward_bonus || 0) > 0 ? (
                      <span className="text-zinc-400"> + bonus ${Number(p.reward_bonus).toFixed(2)}</span>
                    ) : null}
                  </div>

                  <button
                    onClick={() => redeem(p.code)}
                    disabled={redeeming === p.code}
                    className="mt-5 w-full py-3 rounded-xl font-black bg-white text-black hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center gap-2"
                  >
                    {redeeming === p.code ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                    Reclamar
                  </button>
                </div>
              ))
            ) : (
              <div className="text-zinc-500 font-bold">No hay promos activas.</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-14">
        <Footer />
      </div>
    </MainLayout>
  );
}