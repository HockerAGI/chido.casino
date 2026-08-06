"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { getPlayerLevel } from "@/lib/playerLevel";
import { GAMES, CATEGORY_LABELS, type GameCategory } from "@/lib/games";
import {
  BadgeCheck,
  ChevronRight,
  CircleDot,
  Clock,
  Dices,
  FlaskConical,
  Lock,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";

type Category = "todos" | GameCategory;

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  todos: Sparkles,
  slots: Dices,
  crash: Zap,
  live: Radio,
  arcade: CircleDot,
  sports: Swords,
};

export default function LobbyPage() {
  const { profile } = useProfile();
  const [category, setCategory] = useState<Category>("todos");
  const [query, setQuery] = useState("");

  const level = useMemo(
    () => getPlayerLevel((profile as { xp?: number } | null)?.xp),
    [profile]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      if (category !== "todos" && game.category !== category) return false;
      if (!normalized) return true;
      return `${game.title} ${game.subtitle} ${game.tags?.join(" ") || ""}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [category, query]);

  const previewGames = useMemo(
    () => GAMES.filter((game) => game.status !== "coming_soon"),
    []
  );

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
        <Image
          src="/hero-bg.jpg"
          alt="Fondo abstracto de CHIDO"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/90" />
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0533] via-[#0d0d1a] to-black">
          <div className="absolute inset-0 opacity-20">
            <Image
              src="/opengraph-image.jpg"
              alt="Identidad visual de CHIDO"
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/45" />

          <div className="relative z-10 flex flex-col justify-between gap-6 p-6 md:flex-row md:p-8">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#00F0FF]">
                <FlaskConical size={12} /> Catálogo prelaunch
              </div>
              <h1 className="mb-3 text-3xl font-black leading-tight text-white md:text-5xl">
                Dos motores en preview.
                <span className="block bg-gradient-to-r from-[#00F0FF] to-[#32CD32] bg-clip-text text-transparent">
                  El resto sigue en concepto.
                </span>
              </h1>
              <p className="mb-6 max-w-xl text-sm text-white/65 md:text-base">
                Este entorno no autoriza apuestas, depósitos ni premios con
                dinero real. Taco Slot y Chido Crash están disponibles solo para
                validación técnica; su matemática todavía no está certificada.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/legal"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-105"
                >
                  <ShieldCheck size={16} /> Revisar controles
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Reportar un problema <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:w-72">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">
                Estado operativo
              </div>
              <div className="mt-4 space-y-3 text-sm text-white/65">
                <div className="flex items-center gap-2">
                  <BadgeCheck size={15} className="text-[#32CD32]" /> Preview
                  firmado y auditable
                </div>
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-[#FFD700]" /> Dinero real
                  bloqueado
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[#00F0FF]" /> KYC y
                  autoexclusión fail-closed
                </div>
              </div>
            </div>
          </div>
        </section>

        {profile && (
          <section className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
            <div className="relative h-11 w-11 shrink-0">
              <Image
                src={level.level.badge}
                alt={level.level.label}
                fill
                className="object-contain p-0.5"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-black text-white">
                  {level.level.label}
                </span>
                <span className="text-xs text-white/45">Perfil de prueba</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF0099] to-[#FF5E00] transition-all"
                  style={{ width: `${level.pctToNext}%` }}
                />
              </div>
            </div>
            <Link
              href="/profile"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-black text-[#FF0099] hover:underline"
            >
              Ver perfil <ChevronRight size={13} />
            </Link>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FlaskConical size={18} className="text-[#00F0FF]" />
            <h2 className="text-base font-black uppercase tracking-tight text-white">
              Motores disponibles para revisión
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {previewGames.map((game) => (
              <Link
                key={game.id}
                href={game.href}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${game.gradient} p-5 transition-all hover:scale-[1.01] hover:border-white/25`}
              >
                <div className="mb-3 text-4xl">{game.emoji}</div>
                <div className="text-lg font-black text-white">{game.title}</div>
                <div className="mt-1 text-sm text-white/55">{game.subtitle}</div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                  <span className="rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3 py-1 text-[#00F0FF]">
                    {game.badge}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-white/50">
                    Matemática no certificada
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en el catálogo..."
              className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/35 transition focus:border-white/25 focus:bg-black/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => {
              const Icon = CATEGORY_ICONS[item.key] || Sparkles;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                    category === item.key
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-black/40 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon size={13} /> {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black uppercase tracking-tight text-white">
              {category === "todos"
                ? "Catálogo completo"
                : CATEGORY_LABELS[category]}
            </h2>
            <span className="text-xs font-bold text-white/40">
              {filtered.length} conceptos
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((game) => {
              const unavailable = game.status === "coming_soon";
              const content = (
                <>
                  <div className="absolute inset-0 opacity-15">
                    <Image
                      src="/hero-bg.jpg"
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />
                  <div className="relative p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-black tracking-wider text-white/70">
                            {game.badge}
                          </span>
                          {!game.mathCertified && (
                            <span className="rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-1 text-[10px] font-black text-[#FFD700]">
                              Sin certificación matemática
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-white">
                          {game.title}
                        </h3>
                        <p className="mt-1 text-sm text-white/50">
                          {game.subtitle}
                        </p>
                      </div>
                      <div className="text-4xl">{game.emoji}</div>
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-white/45">
                      <span>{game.provider}</span>
                      {unavailable ? (
                        <span className="flex items-center gap-1 font-bold">
                          <Clock size={12} /> No jugable
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold text-[#00F0FF]">
                          <FlaskConical size={12} /> Abrir preview
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );

              return unavailable ? (
                <div
                  key={game.id}
                  className={`relative cursor-not-allowed overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${game.gradient} opacity-55`}
                >
                  {content}
                </div>
              ) : (
                <Link
                  key={game.id}
                  href={game.href}
                  className={`group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${game.gradient} transition-all hover:scale-[1.01] hover:border-white/25`}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
