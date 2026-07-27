"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useProfile } from "@/lib/useProfile";
import { getPlayerLevel } from "@/lib/playerLevel";
import { Crown, Gift, ShieldCheck, Sparkles, Trophy, Zap, ChevronRight, Star, Wallet } from "lucide-react";

const LEVELS = [
  {
    key: "verde",
    label: "Nivel Verde",
    badge: "/badge-verde.png",
    minXp: 0,
    color: "#32CD32",
    perks: ["Acceso completo al lobby", "Bonos pa' los nuevos", "Soporte estándar"],
    cashback: "0%",
    maxBet: "Sin límite especial",
  },
  {
    key: "jalapeno",
    label: "Nivel Jalapeño",
    badge: "/badge-jalapeno.png",
    minXp: 500,
    color: "#FFD700",
    perks: ["Cashback semanal", "Promos preferentes", "Prioridad en soporte"],
    cashback: "2%",
    maxBet: "+25% límite",
  },
  {
    key: "serrano",
    label: "Nivel Serrano",
    badge: "/badge-serrano.png",
    minXp: 1500,
    color: "#FF5E00",
    perks: ["Cashback ampliado", "Retiros más rapidito", "Bonos exclusivos"],
    cashback: "5%",
    maxBet: "+50% límite",
  },
  {
    key: "habanero",
    label: "Nivel Habanero",
    badge: "/badge-habanero.png",
    minXp: 3000,
    color: "#FF0099",
    perks: ["Mesas y beneficios VIP", "Gestión prioritaria", "Regalos especiales"],
    cashback: "8%",
    maxBet: "Sin límite",
  },
  {
    key: "salsa",
    label: "Nivel Salsa Pro",
    badge: "/badge-salsa.png",
    minXp: 6000,
    color: "#00F0FF",
    perks: ["Beneficios al máximo", "Eventos especiales", "Atención VIP directa"],
    cashback: "12%",
    maxBet: "Sin límite + mesas especiales",
  },
];

export default function VIPPage() {
  const { profile } = useProfile();
  const lvl = useMemo(() => getPlayerLevel((profile as any)?.xp), [profile]);

  return (
    <div className="min-h-screen pb-24">
      <div className="relative overflow-hidden border-b border-white/5 bg-[linear-gradient(135deg,rgba(26,10,46,0.96),rgba(10,10,12,0.98))] px-6 py-16">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#FF0099]/10 blur-[110px]" />
        <div className="absolute right-1/4 top-0 h-96 w-96 rounded-full bg-[#00F0FF]/8 blur-[110px]" />

        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#FFD700]">
            <Crown size={14} /> VIP
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-7xl">
            Sube de nivel,{" "}
            <span className="bg-gradient-to-r from-[#FFD700] via-[#FF5E00] to-[#FF0099] bg-clip-text text-transparent">
              gana más.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-white/60">
            Entre más juegas, más se arman los beneficios. Cashback, soporte al tiro y acceso a ondas superiores, todo sin tramoya.
          </p>

          {profile && (
            <div className="mx-auto mt-8 inline-flex max-w-3xl flex-wrap items-center gap-4 rounded-[2rem] border border-white/10 bg-black/40 px-6 py-5 backdrop-blur-xl">
              <div className="relative h-14 w-14 shrink-0">
                <Image src={lvl.level.badge} alt={lvl.level.label} fill className="object-contain" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Tu nivel actual</div>
                <div className="text-2xl font-black text-white">{lvl.level.label}</div>
                <div className="text-xs text-white/40">{lvl.pctToNext}% al siguiente nivel</div>
              </div>
              <div className="h-2 w-36 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF0099] via-[#FF5E00] to-[#FFD700]"
                  style={{ width: `${lvl.pctToNext}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12 space-y-12">
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, title: "Juega y jala XP", desc: "Cada apuesta te suma experiencia al toque, sin hacerle nada." },
            { icon: Star, title: "Sube de nivel", desc: "Verde → Jalapeño → Serrano → Habanero → Salsa Pro." },
            { icon: Gift, title: "Beneficios bien reales", desc: "Cashback, bonos, retiros rapidito y trato preferente." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-[1.75rem] border border-white/10 bg-black/35 p-6 text-center backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Icon size={24} className="text-[#FF0099]" />
              </div>
              <div className="text-lg font-black text-white">{title}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.28em] text-[#FFD700]">
            <Trophy size={16} /> Beneficios por nivel
          </div>

          <div className="mt-5 grid gap-4">
            {LEVELS.map((lvlItem, idx) => {
              const current = lvl.level.key === lvlItem.key;
              const reached = Number((profile as any)?.xp || 0) >= lvlItem.minXp;

              return (
                <div
                  key={lvlItem.key}
                  className={`rounded-[1.5rem] border p-5 transition ${
                    current
                      ? "border-white/20 bg-white/8 shadow-[0_0_30px_rgba(255,255,255,0.04)]"
                      : "border-white/10 bg-black/30 hover:border-white/15"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="relative h-14 w-14 shrink-0">
                      <Image src={lvlItem.badge} alt={lvlItem.label} fill className="object-contain" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-white">{lvlItem.label}</div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                          XP {lvlItem.minXp}+
                        </span>
                        {current ? (
                          <span className="rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#00F0FF]">
                            Activo
                          </span>
                        ) : reached ? (
                          <span className="rounded-full border border-[#32CD32]/20 bg-[#32CD32]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#32CD32]">
                            Desbloqueado
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
                            Bloqueado
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-white/45">
                        Cashback: <span className="font-black text-white">{lvlItem.cashback}</span> • Límite:{" "}
                        <span className="font-black text-white">{lvlItem.maxBet}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {lvlItem.perks.map((perk) => (
                          <span
                            key={perk}
                            className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/55"
                          >
                            {perk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-black uppercase tracking-[0.28em] text-white/35">
                      {idx + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#00F0FF]/15 bg-[linear-gradient(135deg,rgba(0,26,26,0.96),rgba(0,0,0,0.6))] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10">
              <ShieldCheck size={22} className="text-[#00F0FF]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white">Centro VIP</div>
              <div className="text-xs leading-relaxed text-white/45">
                Tu actividad se convierte en mejores beneficios, sin procesos chafa ni rodeos visibles.
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-4 py-2 text-xs font-black text-[#00F0FF]">
              Listo
            </div>
          </div>
        </section>

        <section className="text-center">
          <h3 className="text-2xl font-black text-white">¿Listo pa' subir de nivel?</h3>
          <p className="mt-2 text-sm text-white/50">Echa lana, juega y jala XP automático.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/wallet?tab=deposit"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-[1.02]"
            >
              <Wallet size={16} /> Echar lana ya
            </Link>
            <Link
              href="/lobby"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Al lobby <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}