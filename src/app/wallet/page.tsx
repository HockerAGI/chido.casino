import { Suspense } from "react";
import Link from "next/link";
import WalletClient from "./wallet-client";
import { Wallet, ShieldCheck, ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

function HeroStat({
  title,
  value,
  desc,
  tone = "cyan",
}: {
  title: string;
  value: string;
  desc: string;
  tone?: "cyan" | "green" | "gold" | "pink";
}) {
  const tones = {
    cyan: "border-[#00F0FF]/15 bg-[#00F0FF]/8 text-[#00F0FF]",
    green: "border-[#32CD32]/15 bg-[#32CD32]/8 text-[#32CD32]",
    gold: "border-[#FFD700]/15 bg-[#FFD700]/8 text-[#FFD700]",
    pink: "border-[#FF0099]/15 bg-[#FF0099]/8 text-[#FF0099]",
  } as const;

  return (
    <div className={`rounded-[1.5rem] border p-5 backdrop-blur-xl ${tones[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">{title}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm leading-relaxed text-white/55">{desc}</div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <div className="min-h-screen pb-20 pt-4 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(0,240,255,0.10),rgba(50,205,50,0.08),rgba(0,0,0,0.95))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#00F0FF]/10 blur-[110px]" />
          <div className="absolute left-0 bottom-0 h-64 w-64 rounded-full bg-[#32CD32]/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-white/55 backdrop-blur-xl">
                <ShieldCheck size={14} /> Chido Wallet
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">
                Tu feria,{" "}
                <span className="bg-gradient-to-r from-[#00F0FF] via-[#32CD32] to-[#FFD700] bg-clip-text text-transparent">
                  controlada.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
                Deposita, retira y revisa movimientos con una capa visual más seria, más limpia y lista para operación real.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/wallet?tab=deposit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.02]"
                >
                  <ArrowDownToLine size={16} /> Depositar
                </Link>
                <Link
                  href="/wallet?tab=withdraw"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <ArrowUpFromLine size={16} /> Retirar
                </Link>
                <Link
                  href="/lobby"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-5 py-3 text-sm font-black text-white transition hover:bg-black/50"
                >
                  Volver al lobby <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 lg:w-[46%]">
              <HeroStat
                title="Operación"
                value="SPEI / CLABE"
                desc="Depósito y retiro con estructura clara."
                tone="cyan"
              />
              <HeroStat
                title="Seguridad"
                value="KYC / Control"
                desc="Listo para validación real y soporte."
                tone="green"
              />
              <HeroStat
                title="Soporte"
                value="24/7"
                desc="Atención con flujo de ejecución serio."
                tone="gold"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Depósito</div>
            <div className="mt-2 text-lg font-black text-white">SPEI rápido</div>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Instrucciones claras, sin capas innecesarias y con lectura inmediata.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Retiros</div>
            <div className="mt-2 text-lg font-black text-white">CLABE / Comisión</div>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Dos carriles: saldo de juego y comisiones. Sin confusión.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/35">Control</div>
            <div className="mt-2 text-lg font-black text-white">Trazabilidad</div>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Tus movimientos quedan visibles con una jerarquía más pro.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-3 rounded-[1.75rem] border border-white/10 bg-black/35 py-20 text-white/50 text-sm backdrop-blur-xl">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              Cargando tu Chido Wallet…
            </div>
          }
        >
          <WalletClient />
        </Suspense>
      </div>
    </div>
  );
}