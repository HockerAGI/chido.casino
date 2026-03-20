"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useProfile } from "@/lib/useProfile";
import { getPlayerLevel } from "@/lib/playerLevel";
import {
  Flame, Gift, Search, Sparkles, Ticket, TrendingUp, Info,
  Zap, Star, Trophy, Clock, Lock, ChevronRight, Gamepad2,
  Radio, Dices, CircleDot, Swords,
} from "lucide-react";
import { GAMES, CATEGORY_LABELS, type GameCategory } from "@/lib/games";
import { DailyStreakBar } from "@/components/ui/daily-streak-bar";

type WinFeedItem = {
  id: string;
  game: string;
  user: string;
  profit: number;
  ts: string;
};

type Category = "todos" | GameCategory;

const CATEGORY_ICONS: Record<string, any> = {
  todos: Sparkles,
  slots: Dices,
  crash: Zap,
  live: Radio,
  arcade: CircleDot,
  sports: Swords,
};

const SLANG_WINS = ["¡Que curado!", "¡No hay falla!", "¡A todo dar!", "¡Está cañón!", "¡Qué chido!", "¡Se armó!", "¡Órale!"];

export default function LobbyPage() {
  const { toast } = useToast();
  const { profile } = useProfile();

  const [category, setCategory] = useState<Category>("todos");
  const [query, setQuery] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [feed, setFeed] = useState<WinFeedItem[]>([]);
  const [slangIdx, setSlangIdx] = useState(0);

  const lvl = useMemo(() => getPlayerLevel((profile as any)?.xp), [profile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((g) => {
      if (category !== "todos" && g.category !== category) return false;
      if (!q) return true;
      return (g.title + " " + g.subtitle + " " + (g.tags?.join(" ") || "")).toLowerCase().includes(q);
    });
  }, [category, query]);

  const hotGames = useMemo(() => GAMES.filter((g) => g.status === "hot" || g.status === "new").slice(0, 4), []);

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
      toast({ title: "¡Que curado! ✅", description: json?.message || "Ya quedó. Se aplica en tu próximo depósito." });
      setPromoCode("");
    } catch (e: any) {
      toast({ title: "No se armó 😅", description: e?.message || "Error", variant: "destructive" });
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
        if (!res.ok || !mounted) return;
        setFeed((json?.items || []) as WinFeedItem[]);
      } catch {}
    };
    void load();
    const t = setInterval(load, 20000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlangIdx((i) => (i + 1) % SLANG_WINS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const categories: { key: Category; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "slots", label: "Slots" },
    { key: "crash", label: "Crash" },
    { key: "live", label: "En Vivo" },
    { key: "arcade", label: "Arcade" },
    { key: "sports", label: "Deportes" },
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-20" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/90" />
      </div>

      <div className="mx-auto w-full max-w-5xl py-5 px-4 space-y-6">

        {/* HERO PROMO BANNER */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0533] via-[#0d0d1a] to-black">
          <div className="absolute inset-0 opacity-25">
            <Image src="/opengraph-image.jpg" alt="Promo" fill className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />
          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FF0099]/20 border border-[#FF0099]/30 px-3 py-1 text-[11px] font-black tracking-widest text-[#FF0099] mb-4">
                <Flame size={12} /> BONO DE BIENVENIDA
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                Primer depósito{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0099] to-[#FF5E00]">
                  +100% extra
                </span>
              </h2>
              <p className="text-white/65 text-sm mb-5">
                Deposita desde $100 MXN y te la rifamos al doble. Sin letra chica, sin rollos.{" "}
                <span className="text-[#FFD700] font-bold">¡No hay falla!</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/wallet?tab=deposit" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-105 transition">
                  <Gift size={16} /> Reclamar bono
                </Link>
                <Link href="/promos" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 text-white px-5 py-3 text-sm font-bold hover:bg-white/15 transition">
                  Ver todos los bonos <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center flex-col gap-2 pr-4">
              <div className="text-4xl font-black text-center transition-all">{SLANG_WINS[slangIdx]}</div>
              <div className="text-white/35 text-xs font-bold tracking-widest uppercase">Frase del momento</div>
            </div>
          </div>
        </div>

        {/* DAILY STREAK BONUS */}
        <DailyStreakBar />

        {/* VIP LEVEL BAR */}
        {profile && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 flex items-center gap-4">
            <div className="relative w-11 h-11 shrink-0">
              <Image src={lvl.level.badge} alt={lvl.level.label} fill className="object-contain p-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-black text-white">{lvl.level.label}</span>
                <span className="text-xs text-white/45">{lvl.pctToNext}% al siguiente nivel</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF0099] to-[#FF5E00] transition-all" style={{ width: `${lvl.pctToNext}%` }} />
              </div>
            </div>
            <Link href="/profile" className="shrink-0 text-xs text-[#FF0099] font-black flex items-center gap-1 hover:underline whitespace-nowrap">
              Ver VIP <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* WIN FEED TICKER */}
        {feed.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 py-3 px-4 flex items-center gap-3">
            <div className="shrink-0 flex items-center gap-2 text-[#FFD700] text-xs font-black uppercase tracking-widest">
              <TrendingUp size={14} /> En vivo
            </div>
            <div className="overflow-hidden flex-1">
              <div className="animate-marquee whitespace-nowrap text-xs text-white/60">
                {feed.concat(feed).map((w, i) => (
                  <span key={i} className="inline-block mx-5">
                    <span className="text-white font-bold">{w.user}</span>
                    {" ganó "}
                    <span className="text-[#32CD32] font-black">+${w.profit.toFixed(0)} MXN</span>
                    {" en "}
                    <span className="capitalize text-white/80">{w.game.replace(/_/g, " ")}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HOT PICKS */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-[#FF5E00]" />
            <h2 className="text-base font-black text-white uppercase tracking-tight">Está ardiendo 🔥</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hotGames.map((g) => (
              <Link
                key={g.id}
                href={g.status === "coming_soon" ? "#" : g.href}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${g.gradient} p-4 transition-all hover:scale-[1.03] hover:border-white/25 ${g.status === "coming_soon" ? "opacity-55 cursor-default" : ""}`}
              >
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="text-xs font-black text-white leading-tight mb-1">{g.title}</div>
                {g.status === "coming_soon" ? (
                  <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold"><Clock size={10} /> Próximamente</div>
                ) : (
                  <div className="inline-flex items-center gap-1 rounded-full bg-black/30 border border-white/10 px-2 py-0.5 text-[10px] font-black text-white/70">{g.badge}</div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* SEARCH + CATEGORIES */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca tu juego favorito..."
              className="w-full rounded-2xl bg-black/40 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/25 focus:bg-black/50 transition"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((c) => {
              const Icon = CATEGORY_ICONS[c.key] || Sparkles;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all border ${
                    category === c.key
                      ? "bg-white text-black border-white"
                      : "bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/20"
                  }`}
                >
                  <Icon size={13} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* GAME GRID */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              {category === "todos" ? "Todos los juegos" : (CATEGORY_LABELS as any)[category] || category}
            </h2>
            <span className="text-xs text-white/40 font-bold">{filtered.length} juegos</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/40 text-sm font-bold">
              <div className="text-4xl mb-3">🤔</div>
              Ese juego no lo tenemos aún... ¡pero más viene en camino!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((g) => (
                <Link
                  key={g.id}
                  href={g.status === "coming_soon" ? "#" : g.href}
                  className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${g.gradient} bg-black/40 transition-all ${
                    g.status === "coming_soon"
                      ? "opacity-55 cursor-default"
                      : "hover:border-white/25 hover:shadow-[0_0_25px_rgba(255,255,255,0.04)] hover:scale-[1.01]"
                  }`}
                >
                  <div className="absolute inset-0 opacity-15">
                    <Image src="/hero-bg.jpg" alt="" fill className="object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/80" />

                  <div className="relative p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest ${
                          g.status === "coming_soon" ? "bg-white/5 border-white/10 text-white/40" :
                          g.status === "hot" ? "bg-[#FF5E00]/20 border-[#FF5E00]/30 text-[#FF5E00]" :
                          g.status === "new" ? "bg-[#32CD32]/20 border-[#32CD32]/30 text-[#32CD32]" :
                          "bg-white/10 border-white/10 text-white/70"
                        }`}>
                          {g.status === "coming_soon" ? <><Clock size={10} /> Próximamente</> :
                           g.status === "hot" ? <><Flame size={10} /> {g.badge}</> :
                           g.status === "new" ? <><Sparkles size={10} /> {g.badge}</> :
                           <><Zap size={10} /> {g.badge}</>}
                        </div>
                        <span className="text-[10px] text-white/30 font-bold">{g.provider}</span>
                      </div>

                      <div className="text-xl font-black text-white mb-1">
                        {g.emoji} {g.title}
                      </div>
                      <div className="text-sm text-white/60 mb-3 leading-relaxed line-clamp-2">{g.subtitle}</div>

                      {(g.rtp || g.maxWin || g.volatility) && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {g.rtp && <span className="inline-flex rounded-full bg-white/8 border border-white/10 px-2.5 py-1 text-[10px] font-black text-white/55">RTP {g.rtp}</span>}
                          {g.maxWin && <span className="inline-flex rounded-full bg-white/8 border border-white/10 px-2.5 py-1 text-[10px] font-black text-[#FFD700]">Max {g.maxWin}</span>}
                          {g.volatility && (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${
                              g.volatility === "alta" ? "bg-[#FF0099]/10 border-[#FF0099]/20 text-[#FF0099]" :
                              g.volatility === "media" ? "bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700]" :
                              "bg-[#32CD32]/10 border-[#32CD32]/20 text-[#32CD32]"
                            }`}>Vol. {g.volatility}</span>
                          )}
                        </div>
                      )}

                      {g.status !== "coming_soon" ? (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-2.5 text-sm font-black group-hover:scale-[1.02] transition">
                          Jugar ahora →
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 px-5 py-2.5 text-sm font-bold">
                          <Lock size={13} /> Próximamente
                        </div>
                      )}
                    </div>

                    <div className="h-14 w-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 text-3xl">
                      {g.emoji}
                    </div>
                  </div>

                  {g.tags && g.tags.length > 0 && (
                    <div className="relative px-5 pb-4 flex gap-2 flex-wrap">
                      {g.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-white/25 font-bold bg-white/5 rounded-full px-2 py-0.5 border border-white/5">#{tag}</span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* PROMO CODE */}
        <div className="rounded-3xl border border-[#FFD700]/20 bg-gradient-to-br from-[#1a1200] to-black/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ticket size={18} className="text-[#FFD700]" />
            <h3 className="text-sm font-black text-white">¿Tienes un código? ¡Úsalo ya!</h3>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="CODIGO-CHIDO"
              className="flex-1 rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFD700]/40 font-mono uppercase tracking-widest transition"
            />
            <button
              onClick={redeem}
              disabled={redeeming || !promoCode.trim()}
              className="rounded-2xl bg-[#FFD700] text-black px-5 py-3 text-sm font-black hover:bg-[#FFE44D] disabled:opacity-40 transition"
            >
              {redeeming ? "..." : "¡Activar!"}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/35">Rollover aplica. Ver detalles en sección Bonos.</p>
        </div>

        {/* CHIDOWINS AI HINT */}
        <div className="rounded-3xl border border-[#00F0FF]/15 bg-gradient-to-br from-[#001a1a] to-black/60 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 flex items-center justify-center text-2xl shrink-0">🤖</div>
          <div className="flex-1">
            <div className="text-sm font-black text-white mb-0.5">Chidowins — Tu IA de suerte</div>
            <div className="text-xs text-white/45 leading-relaxed">¿No sabes qué jugar? Pregúntale a Chidowins. Tiene las mejores estrategias para que te la rifes al máximo. ¡Si ya te la guau para qué te la miau!</div>
          </div>
          <button
            onClick={() => toast({ title: "🤖 Chidowins", description: "¡Qué onda! Yo te ayudo. Juega Taco Slot o Chido Crash para empezar, ¡no hay falla!" })}
            className="shrink-0 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] px-4 py-2 text-xs font-black hover:bg-[#00F0FF]/20 transition"
          >
            Preguntar →
          </button>
        </div>

        <div className="text-center text-[11px] text-white/35 pb-10">
          18+ • Solo entretenimiento para adultos • Juega responsable • chidocasino.com
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
          animation: marquee 22s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}