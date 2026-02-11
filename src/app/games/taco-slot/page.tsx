"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { Loader2, Flame, ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";

type ReelSymbol = {
  key: string;
  img: string;
};

type Fair = {
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
};

export default function TacoSlotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { balance, refresh, loading: walletLoading } = useWalletBalance();

  const [bet, setBet] = useState<number>(20);
  const [spinning, setSpinning] = useState(false);

  const [reels, setReels] = useState<ReelSymbol[]>([
    { key: "verde", img: "/badge-verde.png" },
    { key: "jalapeno", img: "/badge-jalapeno.png" },
    { key: "serrano", img: "/badge-serrano.png" },
  ]);

  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [fair, setFair] = useState<Fair | null>(null);
  const [level, setLevel] = useState<{ label: string; badge: string } | null>(null);

  const betPreset = useMemo(() => [10, 20, 50, 120, 250], []);

  const canSpin = useMemo(() => {
    if (walletLoading) return false;
    if (spinning) return false;
    if (balance == null) return true;
    return balance >= bet;
  }, [walletLoading, spinning, balance, bet]);

  function levelFromBetLocal(v: number) {
    if (v <= 20) return { label: "Nivel Verde", badge: "/badge-verde.png" };
    if (v <= 50) return { label: "Nivel Jalapeño", badge: "/badge-jalapeno.png" };
    if (v <= 120) return { label: "Nivel Serrano", badge: "/badge-serrano.png" };
    return { label: "Nivel Habanero", badge: "/badge-habanero.png" };
  }

  useEffect(() => {
    setLevel(levelFromBetLocal(bet));
  }, [bet]);

  async function spin() {
    setSpinning(true);
    setLastPayout(null);
    setLastMultiplier(null);

    try {
      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast({
          title: "No se pudo girar",
          description: data?.error || "Error desconocido",
          variant: "destructive",
        });
        return;
      }

      if (Array.isArray(data.reels)) {
        setReels(data.reels);
      }

      setLastPayout(Number(data.payout || 0));
      setLastMultiplier(Number(data.multiplier || 0));

      if (data.fair) setFair(data.fair);
      if (data.level?.label && data.level?.badge) setLevel(data.level);

      toast({
        title: data.payout > 0 ? "¡Pegó!" : "Otra 🔁",
        description: data.message || (data.payout > 0 ? "Ganaste" : "No pegó"),
      });

      await refresh();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo girar",
        variant: "destructive",
      });
    } finally {
      setSpinning(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#070a0f] text-white">
      {/* Hero */}
      <div className="relative w-full overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.jpg"
            alt="CHIDO Background"
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/lobby")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Lobby
            </button>

            <div className="ml-auto flex items-center gap-2">
              <Badge className="bg-white/10 text-white hover:bg-white/10">
                <ShieldCheck className="mr-1 h-4 w-4" /> Provably Fair
              </Badge>
              <Badge className="bg-white/10 text-white hover:bg-white/10">
                <Sparkles className="mr-1 h-4 w-4" /> Taco-Slot
              </Badge>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <div className="flex items-center gap-4">
                <Image
                  src="/chido-logo.png"
                  alt="CHIDO"
                  width={180}
                  height={60}
                  className="h-auto w-[160px]"
                  priority
                />
                {level && (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                    <Image src={level.badge} alt={level.label} width={28} height={28} />
                    <div className="text-sm">
                      <div className="font-semibold">{level.label}</div>
                      <div className="text-white/60">Apuesta: ${bet} MXN</div>
                    </div>
                  </div>
                )}
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">
                Taco-Slot 🔥
              </h1>
              <p className="mt-3 text-white/70">
                3 chiles. 1 tirada. Si pegas, cobras. Si no, vuelves con más hambre.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">
                  Verde = x3
                </Badge>
                <Badge className="bg-lime-500/20 text-lime-200 hover:bg-lime-500/20">
                  Jalapeño = x5
                </Badge>
                <Badge className="bg-orange-500/20 text-orange-200 hover:bg-orange-500/20">
                  Serrano = x10
                </Badge>
                <Badge className="bg-red-500/20 text-red-200 hover:bg-red-500/20">
                  Habanero = x20
                </Badge>
                <Badge className="bg-white/10 text-white hover:bg-white/10">
                  Par = x1.5
                </Badge>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs text-white/60">Saldo</div>
                  <div className="text-lg font-bold">
                    {walletLoading ? "…" : `$${(balance ?? 0).toFixed(2)} MXN`}
                  </div>
                </div>

                <Button
                  onClick={spin}
                  disabled={!canSpin}
                  className="h-12 rounded-2xl bg-white text-black hover:bg-white/90"
                >
                  {spinning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Girando…
                    </>
                  ) : (
                    <>
                      <Flame className="mr-2 h-4 w-4" />
                      GIRAR
                    </>
                  )}
                </Button>
              </div>

              {!canSpin && !walletLoading && (
                <p className="mt-2 text-sm text-red-300/90">
                  Saldo insuficiente para apostar ${bet}.
                </p>
              )}
            </div>

            {/* Slot */}
            <div className="mx-auto w-full max-w-lg">
              <Card className="rounded-3xl border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="grid grid-cols-3 gap-4">
                  {reels.map((r, idx) => (
                    <div
                      key={`${r.key}-${idx}`}
                      className="flex aspect-square items-center justify-center rounded-3xl border border-white/10 bg-black/40"
                    >
                      <Image src={r.img} alt={r.key} width={120} height={120} />
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Apuesta</div>
                    <div className="text-sm text-white/70">${bet} MXN</div>
                  </div>

                  <div className="mt-3">
                    <Slider
                      value={[bet]}
                      min={10}
                      max={300}
                      step={10}
                      onValueChange={(v) => setBet(v[0])}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {betPreset.map((p) => (
                        <button
                          key={p}
                          onClick={() => setBet(p)}
                          className={`rounded-xl border px-3 py-1 text-sm ${
                            bet === p
                              ? "border-white/30 bg-white/15"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          ${p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {lastPayout != null && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-white/70">Resultado</div>
                        <div className="text-sm font-semibold">
                          {lastPayout > 0 ? "GANASTE" : "NO PEGÓ"}
                        </div>
                      </div>
                      <div className="mt-1 text-2xl font-black">
                        ${lastPayout.toFixed(2)}{" "}
                        <span className="text-base text-white/60">MXN</span>
                      </div>
                      {lastMultiplier != null && (
                        <div className="mt-1 text-sm text-white/70">
                          Multiplicador: <span className="font-semibold">x{lastMultiplier}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Provably Fair details */}
                {fair && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4" /> Provably Fair
                    </div>

                    <div className="space-y-2 text-xs text-white/70">
                      <div>
                        <span className="text-white/60">serverSeedHash:</span>{" "}
                        <span className="break-all">{fair.serverSeedHash}</span>
                      </div>
                      <div>
                        <span className="text-white/60">serverSeed:</span>{" "}
                        <span className="break-all">{fair.serverSeed}</span>
                      </div>
                      <div>
                        <span className="text-white/60">clientSeed:</span>{" "}
                        <span className="break-all">{fair.clientSeed}</span>
                      </div>
                      <div>
                        <span className="text-white/60">nonce:</span> {fair.nonce}
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-white/60">
                      Puedes verificar: SHA256(serverSeed) == serverSeedHash.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <Link
                    href="/promos"
                    className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
                  >
                    Promos
                  </Link>
                  <Link
                    href="/wallet"
                    className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
                  >
                    Wallet
                  </Link>
                </div>
              </Card>
            </div>
          </div>

          <p className="mt-8 text-xs text-white/50">
            CHIDO • Juego experimental. Juega responsable.
          </p>
        </div>
      </div>
    </div>
  );
}