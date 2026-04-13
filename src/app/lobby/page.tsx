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

const SLANG_WINS = ["¡Que curado!", "¡No hay falla!", "¡A todo dar!", "¡Está cañón!", "¡Qué chido!", "¡Se armó!", "¡Órale!"];

function StatBox({ label, value, tone = "cyan" }: { label: string; value: string; tone?: "cyan" | "pink" | "green" | "gold" }) {
  const tones = {
    cyan: "border-[#00F0FF]/15 bg-[#00F0FF]/8 text-[#00F0FF]",
    pink: "border-[#FF0099]/15 bg-[#FF0099]/8 text-[#FF0099]",
    green: "border-[#32CD32]/15 bg-[#32CD32]/8 text-[#32CD32]",
    gold: "border-[#FFD700]/15 bg-[#FFD700]/8 text-[#FFD700]",
  } as const;

  return (
    <div className={`rounded-3xl border px-4 py-4 backdrop-blur-xl ${tones[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}

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

      toast({
        title: "¡Que curado! ✅",
        description: json?.message || "Ya quedó. Se aplica en tu próximo depósito.",
      });
      setPromoCode("");
    } catch (e: any) {
      toast({
        title: "No se armó 😅",
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
        if (!res.ok || !mounted) return;
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

  useEffect(() => {
    const t = setInterval(() => setSlangIdx((i) => (i + 1) % SLANG_WINS.length), 2800);
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/95" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-5 space-y-6 md:px-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,0,153,0.16),rgba(0,240,255,0.08),rgba(0,0,0,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 opacity-20">
            <Image src="/opengraph-image.jpg" alt="Promo" fill className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/68 to-black/20" />

          <div className="relative z-10 grid gap-8 p-6 md:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF0099]/30 bg-[#FF0099]/15 px-3 py-1 text-[11px] font-black tracking-[0.28em] text-[#FF0099]">
                <Flame size={12} /> BONO DE BIENVENIDA
              </div>

              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
                Juega chido.{" "}
                <span className="bg-gradient-to-r from-[#FF0099] via-[#FF5E00] to-[#FFD700] bg-clip-text text-transparent">
                  Gana con flow.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                Chido Casino entra con cara de marca grande: juegos originales, promos reales, lectura limpia y una UX pensada para convertir sin verse genérica.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/wallet?tab=deposit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.02]"
                >
                  <Gift size={16} /> Reclamar bono
                </Link>
                <Link
                  href="/vip"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Ver VIP <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Frase del momento</div>
                <div className="mt-3 text-4xl font-black leading-none text-white">{SLANG_WINS[slangIdx]}</div>
                <div className="mt-2 text-xs text-white/40">UI con sabor real, no maqueta vacía.</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Juegos" value={`${GAMES.length}`} tone="cyan" />
                <StatBox label="Top" value={`${hotGames.length}`} tone="pink" />
              </div>
            </div>
          </div>
        </section>

        <DailyStreakBar />

        {profile && (
          <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative h-14 w-14 shrink-0">
                <Image src={lvl.level.badge} alt={lvl.level.label} fill className="object-contain p-1" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Tu nivel actual</div>
                    <div className="text-xl font-black text-white">{lvl.level.label}</div>
                  </div>
                  <div className="text-xs text-white/45">{lvl.pctToNext}% al siguiente nivel</div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF0099] via-[#FF5E00] to-[#FFD700]"
                    style={{ width: `${lvl.pctToNext}%` }}
                  />
                </div>
              </div>

              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Ver perfil <ChevronRight size={16} />
              </Link>
            </div>
          </section>
        )}

        {feed.length > 0 && (
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-[#FFD700]">
                <TrendingUp size={14} /> En vivo
              </div>
              <div className="overflow-hidden flex-1">
                <div className="animate-marquee whitespace-nowrap text-xs text-white/60">
                  {feed.concat(feed).map((w, i) => (
                    <span key={i} className="inline-block mx-5">
                      <span className="font-bold text-white">{w.user}</span>
                      {" ganó "}
                      <span className="font-black text-[#32CD32]">+${w.profit.toFixed(0)} MXN</span>
                      {" en "}
                      <span className="capitalize text-white/80">{w.game.replace(/_/g, " ")}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-[#FF5E00]" />
            <h2 className="text-base font-black uppercase tracking-tight text-white">Está ardiendo</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {hotGames.map((g) => (
              <Link
                key={g.id}
                href={g.status === "coming_soon" ? "#" : g.href}
                className={`group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${g.gradient} p-4 transition-all ${
                  g.status === "coming_soon"
                    ? "cursor-default opacity-55"
                    : "hover:scale-[1.02] hover:border-white/25 hover:shadow-[0_0_25px_rgba(255,255,255,0.05)]"
                }`}
              >
                <div className="text-3xl mb-2">{g.emoji}</div>
                <div className="text-xs font-black leading-tight text-white">{g.title}</div>
                <div className="mt-1 text-[11px] text-white/55 line-clamp-2">{g.subtitle}</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-black text-white/65">
                  {g.status === "coming_soon" ? (
                    <>
                      <Clock size={10} /> Próximamente
                    </>
                  ) : (
                    <>
                      <Sparkles size={10} /> {g.badge}
                    </>
                  )}
                </div>
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
              placeholder="Busca tu juego favorito..."
              className="w-full rounded-[1.25rem] border border-white/10 bg-black/45 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/25 focus:bg-black/60"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((c) => {
              const Icon = CATEGORY_ICONS[c.key] || Sparkles;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`shrink-0 rounded-2xl border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                    category === c.key
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-black/35 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon size={13} />
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black uppercase tracking-tight text-white">
              {category === "todos" ? "Todos los juegos" : CATEGORY_LABELS[category]}
            </h2>
            <span className="text-xs font-bold text-white/40">{filtered.length} juegos</span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-black/35 py-16 text-center text-sm font-bold text-white/40">
              <div className="mb-3 text-4xl">🤔</div>
              Ese juego no lo tenemos aún... pero más viene en camino.
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
                                <Clock size={10} /> Próximamente
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
                              Jugar ahora →
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/40">
                              <Lock size={13} /> Próximamente
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
            <h3 className="text-sm font-black text-white">¿Tienes un código? Úsalo ya</h3>
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="CODIGO-CHIDO"
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm uppercase tracking-widest text-white outline-none transition placeholder:text-white/30 focus:border-[#FFD700]/40"
            />
            <button
              onClick={redeem}
              disabled={redeeming || !promoCode.trim()}
              className="rounded-2xl bg-[#FFD700] px-5 py-3 text-sm font-black text-black transition hover:bg-[#FFE44D] disabled:opacity-40"
            >
              {redeeming ? "..." : "¡Activar!"}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/35">Rollover aplica. Ver detalles en la sección Bonos.</p>
        </section>

        <section className="rounded-[2rem] border border-[#00F0FF]/15 bg-[linear-gradient(135deg,rgba(0,26,26,0.95),rgba(0,0,0,0.55))] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 text-2xl">
              🤖
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white">Chidowins — Tu IA de suerte</div>
              <div className="text-xs leading-relaxed text-white/45">
                ¿No sabes qué jugar? Pregúntale a Chidowins. Te suelta la ruta más clara sin inventarte nada.
              </div>
            </div>
            <button
              onClick={() =>
                toast({
                  title: "🤖 Chidowins",
                  description: "Empieza con Chido Crash o Taco Slot. Está más directo y más limpio para calentar.",
                })
              }
              className="shrink-0 rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-4 py-2 text-xs font-black text-[#00F0FF] transition hover:bg-[#00F0FF]/20"
            >
              Preguntar →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}