"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowUpRight, Sparkles, ShieldCheck, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "pink" | "cyan" | "green" | "amber" | "violet" | "emerald" | "red";

const toneMap: Record<Tone, { glow: string; border: string; fill: string; accent: string }> = {
  pink: { glow: "rgba(255,0,153,0.25)", border: "border-[#FF0099]/20", fill: "from-[#FF0099]/25", accent: "text-[#FF0099]" },
  cyan: { glow: "rgba(0,240,255,0.25)", border: "border-[#00F0FF]/20", fill: "from-[#00F0FF]/25", accent: "text-[#00F0FF]" },
  green: { glow: "rgba(50,205,50,0.22)", border: "border-[#32CD32]/20", fill: "from-[#32CD32]/25", accent: "text-[#32CD32]" },
  amber: { glow: "rgba(255,190,0,0.22)", border: "border-[#FFD700]/20", fill: "from-[#FFD700]/25", accent: "text-[#FFD700]" },
  violet: { glow: "rgba(168,85,247,0.22)", border: "border-[#A855F7]/20", fill: "from-[#A855F7]/25", accent: "text-[#A855F7]" },
  emerald: { glow: "rgba(16,185,129,0.22)", border: "border-[#10B981]/20", fill: "from-[#10B981]/25", accent: "text-[#10B981]" },
  red: { glow: "rgba(255,61,0,0.22)", border: "border-[#FF3D00]/20", fill: "from-[#FF3D00]/25", accent: "text-[#FF3D00]" },
};

type Stat = { label: string; value: string };
type Feature = { title: string; copy: string; icon: LucideIcon };
type ProgressItem = { label: string; value: number };

type Action = {
  label: string;
  href: string;
  external?: boolean;
  variant?: "primary" | "secondary";
  icon?: LucideIcon;
};

type Props = {
  badge: string;
  badgeTone?: Tone;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  stats: Stat[];
  features: Feature[];
  progress?: ProgressItem[];
  note?: string;
  actions: Action[];
  backHref?: string;
};

export default function ReleaseGamePage({
  badge,
  badgeTone = "cyan",
  emoji,
  title,
  subtitle,
  description,
  stats,
  features,
  progress = [],
  note,
  actions,
  backHref = "/lobby",
}: Props) {
  const tone = toneMap[badgeTone];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07070b]">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 34%), radial-gradient(circle at 75% 10%, rgba(0,240,255,0.10), transparent 26%), radial-gradient(circle at 50% 100%, rgba(255,0,153,0.12), transparent 28%)",
        }}
      />
      <motion.div
        className="absolute -left-20 top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: tone.glow }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/5 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.42, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.2fr_0.9fr]">
        <div>
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.28em] uppercase", tone.border, tone.accent, "bg-white/5")}>
            <Sparkles size={12} /> {badge}
          </div>

          <div className="mt-5 flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl shadow-[0_0_40px_rgba(255,255,255,0.06)]">
              {emoji}
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">{subtitle}</p>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/68 md:text-base">
            {description}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">{stat.label}</div>
                <div className="mt-2 text-xl font-black text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-black/40 p-4 transition hover:border-white/20">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5", tone.accent)}>
                      <Icon size={18} />
                    </div>
                    <div className="font-black text-white">{feature.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/52">{feature.copy}</p>
                </div>
              );
            })}
          </div>

          {progress.length > 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-black/35 p-5">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <ShieldCheck size={16} className={tone.accent} />
                Capa de lanzamiento
              </div>

              <div className="mt-4 grid gap-4">
                {progress.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-xs text-white/55">
                      <span>{item.label}</span>
                      <span className={tone.accent}>{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r", tone.fill)}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {actions.map((action) => {
              const Icon = action.icon || ArrowUpRight;
              const base =
                action.variant === "secondary"
                  ? "border border-white/12 bg-white/6 text-white hover:bg-white/10"
                  : "bg-white text-black hover:scale-[1.01]";
              const content = (
                <>
                  <Icon size={16} />
                  {action.label}
                </>
              );

              return action.external ? (
                <a
                  key={action.label}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition", base)}
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn("inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition", base)}
                >
                  {content}
                </Link>
              );
            })}

            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-transparent px-5 py-3 text-sm font-bold text-white/75 transition hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft size={16} />
                Volver
              </Link>
            )}
          </div>

          {note && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/55">
              <Gamepad2 size={14} className={tone.accent} />
              {note}
            </div>
          )}
        </div>

        <div className="lg:pt-8">
          <motion.div
            className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/8 to-white/3 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="rounded-[1.5rem] border border-white/10 bg-[#050507] p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">Live Preview</div>
                <div className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]", tone.border, tone.accent, "bg-white/5")}>
                  Ready for launch
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/4 p-4">
                  <div className="text-sm font-black text-white">UI core</div>
                  <div className="mt-2 text-xs leading-relaxed text-white/50">
                    Motion, feedback, claridad visual y un stack listo para conectar provider real.
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {["Glow", "Motion", "UX"].map((item, idx) => (
                    <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 text-center">
                      <div className={cn("text-[10px] font-black uppercase tracking-[0.24em]", tone.accent)}>{item}</div>
                      <div className="mt-2 text-lg font-black text-white">{idx === 0 ? "4K" : idx === 1 ? "60fps" : "Pro"}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs font-black uppercase tracking-[0.24em] text-white/40">Integración</div>
                  <div className="mt-3 space-y-2">
                    {[
                      "Arquitectura de slots / mesa / arcade",
                      "Capas de bonus, audio y animación",
                      "Conexión con backend de control HOCKER",
                    ].map((line) => (
                      <div key={line} className="flex items-center gap-2 text-sm text-white/70">
                        <span className={cn("h-1.5 w-1.5 rounded-full", tone.accent.replace("text-", "bg-"))} />
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}