"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useWalletBalance } from "@/lib/useWalletBalance";

type SymbolKey = "verde" | "jalapeno" | "serrano" | "habanero";

type SpinResponse =
  | {
      ok: true;
      spinId: string;
      bet: number;
      payout: number;
      multiplier: number;
      reels: { key: SymbolKey; img: string }[];
      level: { key: SymbolKey; label: string; badge: string };
      fair: {
        serverSeedHash: string;
        serverSeed: string;
        clientSeed: string;
        nonce: number;
      };
      message?: string;
    }
  | { ok: false; error: string };

const SYMBOLS: { key: SymbolKey; img: string; label: string }[] = [
  { key: "verde", img: "/badge-verde.png", label: "Verde" },
  { key: "jalapeno", img: "/badge-jalapeno.png", label: "Jalapeño" },
  { key: "serrano", img: "/badge-serrano.png", label: "Serrano" },
  { key: "habanero", img: "/badge-habanero.png", label: "Habanero" },
];

function levelFromBet(bet: number) {
  if (bet <= 20) return { key: "verde" as const, label: "Nivel Verde", badge: "/badge-verde.png" };
  if (bet <= 50) return { key: "jalapeno" as const, label: "Nivel Jalapeño", badge: "/badge-jalapeno.png" };
  if (bet <= 120) return { key: "serrano" as const, label: "Nivel Serrano", badge: "/badge-serrano.png" };
  return { key: "habanero" as const, label: "Nivel Habanero", badge: "/badge-habanero.png" };
}

function fmt(n: number) {
  return `$${Number(n).toFixed(2)} MXN`;
}

export default function TacoSlotPage() {
  const { balance } = useWalletBalance();
  const [bet, setBet] = useState<number>(20);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(SYMBOLS.slice(0, 3).map((s) => ({ key: s.key, img: s.img })));
  const [last, setLast] = useState<SpinResponse | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const level = useMemo(() => levelFromBet(bet), [bet]);

  const fakeSpinTick = () => {
    // animación simple: cambia símbolos rápido mientras llega respuesta
    const r = Array.from({ length: 3 }).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    setReels(r.map((x) => ({ key: x.key, img: x.img })));
  };

  const onSpin = async () => {
    setMsg(null);
    setLast(null);

    if (!Number.isFinite(bet) || bet <= 0) {
      setMsg("Monto inválido.");
      return;
    }
    if (bet > balance) {
      setMsg("Saldo insuficiente (solo balance).");
      return;
    }

    setSpinning(true);

    let ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      fakeSpinTick();
      if (ticks > 16) clearInterval(iv);
    }, 80);

    try {
      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bet }),
      });

      const data = (await res.json()) as SpinResponse;

      if (!data.ok) {
        setMsg(data.error || "Error en el giro.");
        return;
      }

      setReels(data.reels);
      setLast(data);
      setMsg(data.message || (data.payout > 0 ? "PEGÓ 🔥" : "Nada esta vez… vuelve a darle 😈"));
    } catch (e: any) {
      setMsg(e?.message || "Error al girar.");
    } finally {
      clearInterval(iv);
      setSpinning(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      {/* Fondo México */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-35" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/85" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/chido-logo.png" alt="Logo" width={160} height={44} className="h-auto w-[160px]" />
            <div className="h-8 w-px bg-white/15" />
            <div>
              <div className="text-2xl font-semibold tracking-tight">Taco-Slot</div>
              <div className="text-sm text-white/65">Gira chiles. Sube nivel. Cobra al instante.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs text-white/60">Saldo disponible</div>
            <div className="text-lg font-semibold">{fmt(balance)}</div>
          </div>
        </div>

        {/* Panel principal */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          {/* Máquina */}
          <div className="rounded-3xl border border-white/10 bg-black/35 p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                  <Image src={level.badge} alt={level.label} width={40} height={40} />
                </div>
                <div>
                  <div className="text-sm text-white/65">Nivel</div>
                  <div className="text-lg font-semibold">{level.label}</div>
                </div>
              </div>

              <button
                onClick={onSpin}
                disabled={spinning}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
              >
                {spinning ? "Girando…" : "SPIN"}
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-4">
              <div className="grid grid-cols-3 gap-3">
                {reels.map((r, idx) => (
                  <div
                    key={idx}
                    className="relative flex h-28 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black/40"
                  >
                    <Image src={r.img} alt={r.key} width={90} height={90} className="drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]" />
                    <div className="absolute bottom-2 text-[11px] text-white/60">{r.key.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bet */}
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Apuesta</span>
                  <span className="font-semibold">{fmt(bet)}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={10}
                  value={bet}
                  onChange={(e) => setBet(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 50, 100, 200].map((v) => (
                    <button
                      key={v}
                      onClick={() => setBet(v)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                        bet === v ? "bg-white/15" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {fmt(v)}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-white/55">
                  Tip: sube la apuesta para desbloquear nivel más 🔥 (sin romper UX, solo vibe).
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-white/60">Pago si pega</div>
                <div className="text-lg font-semibold">
                  {last && last.ok ? fmt(last.payout) : "—"}
                </div>
              </div>
            </div>

            {msg && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
                {msg}
              </div>
            )}
          </div>

          {/* Paytable + Fair */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
              <div className="text-lg font-semibold">Paytable</div>
              <div className="mt-3 space-y-3 text-sm text-white/75">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Image src="/badge-habanero.png" alt="habanero" width={24} height={24} /> x3
                  </span>
                  <b className="text-white">20x</b>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Image src="/badge-serrano.png" alt="serrano" width={24} height={24} /> x3
                  </span>
                  <b className="text-white">10x</b>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Image src="/badge-jalapeno.png" alt="jalapeno" width={24} height={24} /> x3
                  </span>
                  <b className="text-white">5x</b>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Image src="/badge-verde.png" alt="verde" width={24} height={24} /> x3
                  </span>
                  <b className="text-white">3x</b>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span>Cualquier par</span>
                  <b className="text-white">1.5x</b>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/55">
                *Pago = apuesta × multiplicador. Si no pega, payout = 0.
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
              <div className="text-lg font-semibold">Provably-Fair</div>
              <div className="mt-2 text-xs text-white/60">
                En cada giro se genera un <b>serverSeed</b> + <b>hash</b>. Puedes verificar el hash con SHA-256.
              </div>

              {last && last.ok && (
                <div className="mt-4 space-y-2 text-xs">
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-white/60">serverSeedHash</div>
                    <div className="break-all font-mono text-white/85">{last.fair.serverSeedHash}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-white/60">serverSeed (reveal)</div>
                    <div className="break-all font-mono text-white/85">{last.fair.serverSeed}</div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-white/60">clientSeed</div>
                      <div className="break-all font-mono text-white/85">{last.fair.clientSeed}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-white/60">nonce</div>
                      <div className="font-mono text-white/85">{last.fair.nonce}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/35 p-5">
              <div className="text-sm text-white/70">
                Assets usados (ya en tu repo):
                <div className="mt-2 font-mono text-xs text-white/55">
                  /hero-bg.jpg<br />
                  /badge-verde.png<br />
                  /badge-jalapeno.png<br />
                  /badge-serrano.png<br />
                  /badge-habanero.png<br />
                  /chido-logo.png
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer mini */}
        <div className="text-center text-xs text-white/45">
          Taco-Slot — branding CHIDO + México vibe (sin rutas raras, sin imports locos).
        </div>
      </div>
    </div>
  );
}