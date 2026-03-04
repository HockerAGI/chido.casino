"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Flame, Gift, Search, Sparkles, Ticket, TrendingUp } from "lucide-react";

type WinFeedItem = {
  id: string;
  game: "crash" | "taco_slot";
  user: string;
  profit: number;
  ts: string;
};

type Category = "todos" | "slots" | "crash";

export default function LobbyPage() {
  const { toast } = useToast();

  const [category, setCategory] = useState<Category>("todos");
  const [query, setQuery] = useState("");

  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const [feed, setFeed] = useState<WinFeedItem[]>([]);

  const games = useMemo(
    () => [
      {
        id: "taco_slot",
        title: "Taco Slot",
        subtitle: "Slots original • rápido • paytable claro",
        badge: "Slot",
        href: "/games/taco-slot",
        cover: "/hero-bg.jpg",
        accent: "from-[#FF0099]/20 to-[#FF3D00]/20",
      },
      {
        id: "crash",
        title: "Chido Crash",
        subtitle: "Originals • multiplica • cashout automático",
        badge: "Crash",
        href: "/games/crash",
        cover: "/hero-bg.jpg",
        accent: "from-[#00F0FF]/20 to-[#32CD32]/20",
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => {
      if (category === "slots" && g.id !== "taco_slot") return false;
      if (category === "crash" && g.id !== "crash") return false;
      if (!q) return true;
      return (g.title + " " + g.subtitle).toLowerCase().includes(q);
    });
  }, [games, category, query]);

  const redeem = async () => {
    const code = promoCode.trim();
    if (!code) return;

    setRedeeming(true);
    try {
      const res = await fetch("/api/promos/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo activar");

      toast({
        title: "Promo activada",
        description: json?.message || "Se aplicará en tu próximo depósito que cumpla el mínimo.",
      });
      setPromoCode("");
    } catch (e: any) {
      toast({
        title: "No se pudo activar",
        description: e?.message || "Error",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch("/api/feed/wins", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) return;
        if (!mounted) return;
        setFeed((json?.items || []) as WinFeedItem[]);
      } catch {
        // ignore
      }
    };

    void load();
    const t = setInterval(load, 20000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-25" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85" />
      </div>

      <div className="mx-auto w-full max-w-3xl py-5 space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
          <div className="absolute inset-0 opacity-30">
            <Image src="/opengraph-image.jpg" alt="Promo" fill className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />

          <div className="relative p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 px-3 py-1 text-[11px] font-black tracking-widest text-[#FFD700]">
              <Sparkles size={14} /> OFERTA EXCLUSIVA NUEVOS USUARIOS
            </div>

            <div className="mt-4 text-4xl sm:text-5xl font-black tracking-tight leading-[0.95]">
              DUPLICAMOS
              <br />
              TU PRIMER
              <br />
              DEPÓSITO
            </div>

            <div className="mt-3 text-white/75 text-sm sm:text-base">
              Deposita desde <b>$50</b> y recibe el <b>100% extra</b> hasta <b>$5,000 MXN</b>.
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link
                href="/promos"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-black px-6 py-3 hover:bg-white/90"
              >
                <Gift size={18} /> Reclamar bono
              </Link>
              <Link
                href="/wallet?tab=deposit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#00F0FF] text-black font-black px-6 py-3 hover:opacity-90"
              >
                Depositar ahora
              </Link>
            </div>

            <div className="mt-4 text-[11px] text-white/50">
              *Bonos sujetos a rollover / límites. Detalles en Promos.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCategory("todos")}
            className={`shrink-0 rounded-2xl px-5 py-3 font-black text-sm border transition ${
              category === "todos"
                ? "bg-[#FF0099] text-white border-[#FF0099]/40 shadow-[0_0_20px_rgba(255,0,153,0.25)]"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setCategory("slots")}
            className={`shrink-0 rounded-2xl px-5 py-3 font-black text-sm border transition ${
              category === "slots"
                ? "bg-white text-black border-white/40"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            Slots
          </button>
          <button
            onClick={() => setCategory("crash")}
            className={`shrink-0 rounded-2xl px-5 py-3 font-black text-sm border transition ${
              category === "crash"
                ? "bg-white text-black border-white/40"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            Crash
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 flex items-center gap-3">
            <Search className="text-white/40" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar juego…"
              className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/35"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 flex items-center gap-3">
            <Ticket className="text-white/40" size={18} />
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Código promo"
              className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/35"
            />
            <button
              onClick={() => void redeem()}
              disabled={!promoCode.trim() || redeeming}
              className="shrink-0 rounded-xl bg-white text-black px-4 py-2 text-xs font-black disabled:opacity-60"
            >
              {redeeming ? "…" : "OK"}
            </button>
          </div>
        </div>

        {feed.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 flex items-center gap-3 overflow-hidden">
            <div className="shrink-0 inline-flex items-center gap-2 text-xs font-black text-[#32CD32]">
              <TrendingUp size={16} /> GANANDO AHORA
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="whitespace-nowrap text-xs text-white/70 animate-marquee">
                {feed
                  .slice(0, 10)
                  .map((x) => `${x.user} +$${x.profit.toFixed(0)} en ${x.game === "crash" ? "Crash" : "Taco Slot"}`)
                  .join("  •  ")}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          {filtered.map((g) => (
            <Link
              key={g.id}
              href={g.href}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black/35 p-5 hover:bg-black/45 transition"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${g.accent}`} />
              <div className="absolute inset-0 opacity-20">
                <Image src={g.cover} alt="" fill className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[11px] font-black tracking-widest">
                    <Flame size={14} className="text-[#FF5E00]" /> {g.badge}
                  </div>
                  <div className="mt-3 text-2xl font-black">{g.title}</div>
                  <div className="mt-1 text-sm text-white/70">{g.subtitle}</div>

                  <div className="mt-4 inline-flex items-center rounded-2xl bg-white text-black px-5 py-3 text-sm font-black group-hover:scale-[1.02] transition">
                    Jugar →
                  </div>
                </div>

                {g.id === "taco_slot" ? (
                  <div className="flex items-center gap-2">
                    <Image src="/badge-verde.png" alt="verde" width={38} height={38} />
                    <Image src="/badge-jalapeno.png" alt="jalapeño" width={38} height={38} />
                    <Image src="/badge-serrano.png" alt="serrano" width={38} height={38} />
                  </div>
                ) : null}
              </div>

              {g.id === "taco_slot" ? (
                <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/75">
                  Paytable: Verde x3=3x · Jalapeño x3=5x · Serrano x3=10x · Habanero x3=20x · Par=0.82x
                </div>
              ) : (
                <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/75">
                  Tip: define tu auto-cashout. (House edge aplicado; juego sostenible.)
                </div>
              )}
            </Link>
          ))}
        </div>

        <div className="text-center text-[11px] text-white/45 pb-10">
          18+ • Entretenimiento • Juega responsable.
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          padding-left: 100%;
          animation: marquee 18s linear infinite;
        }
      `}</style>
    </div>
  );
}