"use client";

import Image from "next/image";
import Link from "next/link";
import { useProfile } from "@/lib/useProfile";
import { getPlayerLevel } from "@/lib/playerLevel";
import { useMemo } from "react";
import { Star, Zap, Gift, Crown, ShieldCheck, ChevronRight, Sparkles, Trophy } from "lucide-react";

const LEVELS = [
  {
    key: "verde",
    label: "Nivel Verde 🌱",
    badge: "/badge-verde.png",
    minXp: 0,
    color: "#32CD32",
    perks: ["Acceso a todos los juegos", "Feed de ganadores en vivo", "Bonos de bienvenida", "Soporte por WhatsApp"],
    cashback: "0%",
    maxBet: "Sin límite especial",
  },
  {
    key: "jalapeno",
    label: "Nivel Jalapeño 🌶️",
    badge: "/badge-jalapeno.png",
    minXp: 500,
    color: "#FFD700",
    perks: ["Todo lo de Verde", "+2% cashback semanal", "Torneos prioritarios", "Bonos de recarga exclusivos"],
    cashback: "2%",
    maxBet: "+25% límite de apuesta",
  },
  {
    key: "serrano",
    label: "Nivel Serrano 🔥",
    badge: "/badge-serrano.png",
    minXp: 1500,
    color: "#FF5E00",
    perks: ["Todo lo de Jalapeño", "+5% cashback semanal", "Retiros prioritarios (24h)", "Gestor de cuenta dedicado"],
    cashback: "5%",
    maxBet: "+50% límite de apuesta",
  },
  {
    key: "habanero",
    label: "Nivel Habanero 💎",
    badge: "/badge-habanero.png",
    minXp: 3000,
    color: "#FF0099",
    perks: ["Todo lo de Serrano", "+8% cashback semanal", "Mesa Blackjack VIP exclusiva", "Retiros en 12h", "Regalos físicos trimestrales"],
    cashback: "8%",
    maxBet: "Sin límite",
  },
  {
    key: "salsa",
    label: "Nivel Salsa Pro 👑",
    badge: "/badge-verde.png",
    minXp: 6000,
    color: "#00F0FF",
    perks: ["Todo lo de Habanero", "+12% cashback semanal", "Acceso a juegos privados antes del lanzamiento", "Línea directa 24/7 con gerente VIP", "Evento presencial anual", "Bonos personalizados ilimitados"],
    cashback: "12%",
    maxBet: "Sin límite + mesas especiales",
  },
];

export default function VIPPage() {
  const { profile } = useProfile();
  const lvl = useMemo(() => getPlayerLevel((profile as any)?.xp), [profile]);

  return (
    <div className="min-h-screen pb-24">
      {/* HERO */}
      <div className="relative bg-gradient-to-br from-[#1a0a2e] via-[#121214] to-black border-b border-white/5 py-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF0099]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00F0FF]/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/10 text-[#FFD700] text-xs font-black uppercase tracking-widest mb-6 border border-[#FFD700]/20">
            <Crown size={14} /> VIP Club
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
            Sube de nivel,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF5E00]">
              gana más
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Entre más juegas, más chido te ponemos. Cashback real, bonos exclusivos, gestor personal y mesas VIP. ¡Si ya te la guau para qué te la miau!
          </p>

          {profile && (
            <div className="inline-flex items-center gap-4 rounded-3xl border border-white/10 bg-black/40 px-6 py-4 backdrop-blur">
              <div className="relative w-12 h-12">
                <Image src={lvl.level.badge} alt={lvl.level.label} fill className="object-contain" />
              </div>
              <div className="text-left">
                <div className="text-xs text-white/50 font-bold uppercase tracking-widest">Tu nivel actual</div>
                <div className="text-xl font-black text-white">{lvl.level.label}</div>
                <div className="text-xs text-white/40 mt-0.5">{lvl.pctToNext}% al siguiente nivel</div>
              </div>
              <div className="ml-4 w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF0099] to-[#FF5E00]" style={{ width: `${lvl.pctToNext}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-white mb-3">¿Cómo funciona el VIP?</h2>
          <p className="text-white/50 text-sm max-w-xl mx-auto">Cada peso apostado te da XP. A más XP, mayor nivel. Sin trampa, sin cartón.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Zap, title: "Juega y acumula XP", desc: "Cada apuesta en Crash y Slots te da puntos de experiencia automáticamente." },
            { icon: Star, title: "Sube de nivel", desc: "Los niveles se van desbloqueando: Verde → Jalapeño → Serrano → Habanero → Salsa Pro." },
            { icon: Gift, title: "Disfruta beneficios reales", desc: "Cashback semanal, bonos exclusivos, retiros rápidos y mucho más." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-black/30 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Icon size={24} className="text-[#FF0099]" />
              </div>
              <div className="text-base font-black text-white mb-2">{title}</div>
              <div className="text-sm text-white/55 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        {/* LEVELS TABLE */}
        <h2 className="text-2xl font-black text-white mb-6 text-center">Los 5 niveles VIP</h2>
        <div className="space-y-4">
          {LEVELS.map((l) => {
            const isCurrentLevel = l.key === lvl.level.key;
            return (
              <div
                key={l.key}
                className={`relative overflow-hidden rounded-3xl border p-6 transition-all ${
                  isCurrentLevel
                    ? "border-[#FF0099]/40 bg-gradient-to-br from-[#1a0533]/60 to-black/60"
                    : "border-white/10 bg-black/30"
                }`}
              >
                {isCurrentLevel && (
                  <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-[#FF0099]/20 border border-[#FF0099]/30 px-3 py-1 text-[10px] font-black text-[#FF0099] uppercase tracking-widest">
                    <Sparkles size={10} /> Tu nivel
                  </div>
                )}
                <div className="flex items-start gap-5">
                  <div className="shrink-0 w-16 h-16 relative">
                    <Image src={l.badge} alt={l.label} fill className="object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-black text-white mb-0.5">{l.label}</div>
                    <div className="text-xs text-white/40 mb-3">Desde {l.minXp.toLocaleString()} XP</div>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {l.perks.map((perk) => (
                        <div key={perk} className="flex items-center gap-2 text-sm text-white/70">
                          <ShieldCheck size={13} style={{ color: l.color }} className="shrink-0" />
                          {perk}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-4">
                      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                        <div className="text-white/40 font-bold uppercase tracking-widest text-[10px] mb-0.5">Cashback</div>
                        <div className="font-black text-white">{l.cashback}</div>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
                        <div className="text-white/40 font-bold uppercase tracking-widest text-[10px] mb-0.5">Apuesta</div>
                        <div className="font-black text-white">{l.maxBet}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center space-y-4">
          <h3 className="text-2xl font-black text-white">¿Listo para subir de nivel?</h3>
          <p className="text-white/50 text-sm">Deposita, juega y gana XP automáticamente. ¡No hay falla!</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/wallet?tab=deposit" className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-6 py-3 text-sm font-black hover:scale-105 transition">
              <Gift size={16} /> Depositar ahora
            </Link>
            <Link href="/lobby" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 text-white px-6 py-3 text-sm font-bold hover:bg-white/15 transition">
              Ir al lobby <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* CHIDOWINS HINT */}
        <div className="mt-10 rounded-3xl border border-[#00F0FF]/15 bg-gradient-to-br from-[#001a1a] to-black/60 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 flex items-center justify-center text-2xl shrink-0">🤖</div>
          <div className="flex-1">
            <div className="text-sm font-black text-white mb-0.5">Chido Gerente — Optimización VIP</div>
            <div className="text-xs text-white/45 leading-relaxed">Nuestro sistema de IA analiza tu historial y te sugiere la estrategia óptima para subir de nivel más rápido. ¡Próximamente disponible para todos los niveles!</div>
          </div>
          <div className="shrink-0 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] px-4 py-2 text-xs font-black">Pronto →</div>
        </div>
      </div>
    </div>
  );
}
