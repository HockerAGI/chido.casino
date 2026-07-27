"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useProfile } from "@/lib/useProfile";
import { getPlayerLevel } from "@/lib/playerLevel";
import { GAMES, CATEGORY_LABELS, type GameCategory } from "@/lib/games";
import { DailyStreakBar } from "@/components/ui/daily-streak-bar";
import {
  Flame,
  Gift,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  Zap,
  Trophy,
  Clock,
  Lock,
  ChevronRight,
  Dices,
  CircleDot,
  Swords,
  Radio,
  Star,
} from "lucide-react";

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

const SLANG_WINS = ["Va bien armado", "Le lleva la verde", "Todo quedo camión", "Hoy se avienta", "Rifa bonito", "Súbele la afición", "A la carga y a cobrar"];

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
      if (!res.ok) throw new Error(json?.error || "No se pudo rajar");

      toast({
        title: "¡Promo clavada!",
        description: json?.message || "Ya quedó. Se aplica según la regla de la promo, sin trucos.",
      });
      setPromoCode("");
    } catch (e: any) {
      toast({
        title: "No se pudo clavar",
        description: e?.message || "Chale, algo falló",
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
        if (!res.ok || !mounted) return;
        setFeed((json?.items || []) as WinFeedItem[]);
      } catch {
        if (mounted) setFeed([]);
      }
    };
    void load();
    const t = setInterval(load, 20000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlangIdx((i) => (i + 1) % SLANG_WINS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const categories: { key: Category; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "slots", label: "Slots" },
    { key: "crash", label: "Crash" },
    { key: "live", label: "En vivo" },
    { key: "arcade", label: "Arcade" },
    { key: "sports", label: "Deportes" },
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-20" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/90" />
      </div>

      <div className="mx-auto w-full max-w-6xl py-5 px-4 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0533] via-[#0d0d1a] to-black">
          <div className="absolute inset-0 opacity-25">
            <Image src="/opengraph-image.jpg" alt="Promo" fill className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />

          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FF0099]/20 border border-[#FF0099]/30 px-3 py-1 text-[11px] font-black tracking-widest text-[#FF0099] mb-4">
                <Flame size={12} /> Bono pa los nuevos
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3">
                Juega a lo chido y{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0099] to-[#FF5E00]">
                  cobra sin chaquetear.
                </span>
              </h2>
              <p className="text-white/65 text-sm md:text-base mb-6 max-w-xl">
                Juegos originales, promos sin maice y una wallet lista para meter y sacar lana cuando quieras, todo en vivo y sin tramoya.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/wallet?tab=deposit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:scale-105 transition"
                >
                  <Gift size={16} /> Echar lana
                </Link>
                <Link
                  href="/promos"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 text-white px-5 py-3 text-sm font-bold hover:bg-white/15 transition"
                >
                  Ver las promos <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            <div className="md:w-72 rounded-3xl border border-white/10 bg-black/35 p-5 backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-black">Frase del momento</div>
              <div className="mt-3 text-3xl font-black text-white leading-tight">{SLANG_WINS[slangIdx]}</div>
              <div className="mt-2 text-xs text-white/35">La onda de hoy, sin rodeos.</div>
            </div>
          </div>
        </section>

        <DailyStreakBar />

        {profile && (
          <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 flex items-center gap-4">
            <div className="relative w-11 h-11 shrink-0">
              <Image src={lvl.level.badge} alt={lvl.level.label} fill className="object-contain p-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-black text-white">{lvl.level.label}</span>
                <span className="text-xs text-white/45">{lvl.pctToNext}% al siguiente nivel</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF0099] to-[#FF5E00] transition-all"
                  style={{ width: `${lvl.pctToNext}%` }}
                />
              </div>
            </div>
            <Link href="/profile" className="shrink-0 text-xs text-[#FF0099] font-black flex items-center gap-1 hover:underline whitespace-nowrap">
              Ver mi perfil <ChevronRight size={13} />
            </Link>
          </section>
        )}

        {feed.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 py-3 px-4 flex items-center gap-3">
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
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-[#FF5E00]" />
            <h2 className="text-base font-black text-white uppercase tracking-tight">Lo que está rifando</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hotGames.map((g) => (
              <Link
                key={g.id}
                href={g.status === "coming_soon" ? "#" : g.href}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${g.gradient} p-4 transition-all hover:scale-[1.03] hover:border-white/25 ${
                  g.status === "coming_soon" ? "opacity-55 cursor-default" : ""
                }`}
              >
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="text-xs font-black text-white leading-tight mb-1">{g.title}</div>
                {g.status === "coming_soon" ? (
                  <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold">
                    <Clock size={10} /> Viene en camino
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 rounded-full bg-black/30 border border-white/10 px-2 py-0.5 text-[10px] font-black text-white/70">
                    {g.badge}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca tu juego carnal..."
              className="w-full rounded-2xl bg-black/40 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/25 focus:bg-black/50 transition"
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
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              {category === "todos" ? "Todos los juegos" : CATEGORY_LABELS[category]}
            </h2>
            <span className="text-xs font-bold text-white/40">{filtered.length} juegos</span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-black/35 py-16 text-center text-sm font-bold text-white/40">
              <div className="mb-3 text-4xl">🤔</div>
              No le atinamos carnal, no hay coincidencias.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((g) => (
                <Link
                  key={g.id}
                  href={g.status === "coming_soon" ? "#" : g.href}
                  className={`group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${g.gradient} transition-all ${
                    g.status === "coming_soon"
                      ? "cursor-default opacity-55"
                      : "hover:scale-[1.01] hover:border-white/25 hover:shadow-[0_0_25px_rgba(255,255,255,0.04)]"
                  }`}
                >
                  <div className="absolute inset-0 opacity-15">
                    <Image src="/hero-bg.jpg" alt="" fill className="object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />

                  <div className="relative p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest ${
                              g.status === "coming_soon"
                                ? "border-white/10 bg-white/5 text-white/40"
                                : g.status === "hot"
                                  ? "border-[#FF5E00]/30 bg-[#FF5E00]/20 text-[#FF5E00]"
                                  : g.status === "new"
                                    ? "border-[#32CD32]/30 bg-[#32CD32]/20 text-[#32CD32]"
                                    : "border-white/10 bg-white/10 text-white/70"
                            }`}
                          >
                            {g.status === "coming_soon" ? (
                              <>
                                <Clock size={10} /> Viene en camino
                              </>
                            ) : g.status === "hot" ? (
                              <>
                                <Flame size={10} /> {g.badge}
                              </>
                            ) : g.status === "new" ? (
                              <>
                                <Sparkles size={10} /> {g.badge}
                              </>
                            ) : (
                              <>
                                <Zap size={10} /> {g.badge}
                              </>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-white/30">{g.provider}</span>
                        </div>

                        <div className="text-2xl font-black text-white">
                          {g.emoji} {g.title}
                        </div>
                        <div className="mt-1 text-sm leading-relaxed text-white/60 line-clamp-2">{g.subtitle}</div>

                        {(g.rtp || g.maxWin || g.volatility) && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {g.rtp && (
                              <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-black text-white/60">
                                RTP {g.rtp}
                              </span>
                            )}
                            {g.maxWin && (
                              <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-black text-[#FFD700]">
                                Max {g.maxWin}
                              </span>
                            )}
                            {g.volatility && (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${
                                  g.volatility === "alta"
                                    ? "border-[#FF0099]/20 bg-[#FF0099]/10 text-[#FF0099]"
                                    : g.volatility === "media"
                                      ? "border-[#FFD700]/20 bg-[#FFD700]/10 text-[#FFD700]"
                                      : "border-[#32CD32]/20 bg-[#32CD32]/10 text-[#32CD32]"
                                }`}
                              >
                                Vol. {g.volatility}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4">
                          {g.status !== "coming_soon" ? (
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-black transition group-hover:scale-[1.02]">
                              ¡A darle! →
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/40">
                              <Lock size={13} /> Viene en camino
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-3xl">
                        {g.emoji}
                      </div>
                    </div>

                    {g.tags?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {g.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/25"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-[#FFD700]/20 bg-[linear-gradient(135deg,rgba(26,18,0,0.95),rgba(0,0,0,0.6))] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ticket size={18} className="text-[#FFD700]" />
            <h3 className="text-sm font-black text-white">¿Traes un código, carnal?</h3>
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="CODIGO-CHIDO"
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#FFD700]/40 font-mono uppercase tracking-widest transition"
            />
            <button
              onClick={redeem}
              disabled={redeeming || !promoCode.trim()}
              className="rounded-2xl bg-[#FFD700] px-5 py-3 text-sm font-black text-black transition hover:bg-[#FFE44D] disabled:opacity-40"
            >
              {redeeming ? "..." : "Clavarlo"}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/35">La promo se aplica según sus reglas, sin hacerle el paro a nadie.</p>
        </section>

        <section className="rounded-[2rem] border border-[#00F0FF]/15 bg-[linear-gradient(135deg,rgba(0,26,26,0.96),rgba(0,0,0,0.6))] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 text-2xl">
              🤖
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white">Tu compa bot</div>
              <div className="text-xs leading-relaxed text-white/45">
                Si no sabes qué echar, arranca con Crash o Taco Slot. Van directo y se le agarran rápido la onda.
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-4 py-2 text-xs font-black text-[#00F0FF]">
              Online
            </div>
          </div>
        </section>

        <div className="text-center text-[11px] text-white/35 pb-10">
          18+ • Juego responsable • chido casino
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