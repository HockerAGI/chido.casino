"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { useToast } from "@/components/ui/use-toast";
import { sfx } from "@/lib/sfx";
import {
  Loader2,
  Info,
  Volume2,
  VolumeX,
  ShieldAlert,
  Ban,
  Zap,
  Play,
  Pause,
  Sparkles,
  Flame,
} from "lucide-react";

type PromoLimit =
  | { ok: true; hasRollover: false }
  | {
      ok: true;
      hasRollover: true;
      maxBet: number;
      required: number;
      progress: number;
      pct: number;
    }
  | { ok: false; error: string };

type ResponsibleStatus =
  | { ok: true; excluded: boolean; until: string | null; reason: string | null }
  | { ok: false; error: string };

type SpinApi =
  | {
      ok: true;
      spinId: string;
      bet: number;
      payout: number;
      multiplier: number;
      reels: Array<{ key: string; img?: string }> | string[];
      level?: { key: string; label: string; badge: string };
      rtp?: number;
      fair?: {
        serverSeedHash?: string;
        serverSeed?: string;
        clientSeed?: string;
        nonce?: number;
      };
      message?: string;
    }
  | { ok: false; error: string; message?: string; maxBet?: number };

const SLOT_SYMBOLS_PRIMARY: Record<string, string> = {
  verde: "/slot-verde.png",
  jalapeno: "/slot-jalapeno.png",
  serrano: "/slot-serrano.png",
  habanero: "/slot-habanero.png",
};

const LEVEL_BADGES: Record<string, string> = {
  verde: "/badge-verde.png",
  jalapeno: "/badge-jalapeno.png",
  serrano: "/badge-serrano.png",
  habanero: "/badge-habanero.png",
};

function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function money(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeNowIso() {
  return new Date().toISOString();
}

function useLocalSetting<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      setValue(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}

function vibrate(ms: number) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      // @ts-ignore
      navigator.vibrate(ms);
    }
  } catch {}
}

function SymbolImg({ symbolKey, spinning }: { symbolKey: string; spinning: boolean }) {
  const [src, setSrc] = useState<string>(() => SLOT_SYMBOLS_PRIMARY[symbolKey] || `/slot-${symbolKey}.png`);
  const fallback = LEVEL_BADGES[symbolKey] || "/badge-verde.png";

  useEffect(() => {
    setSrc(SLOT_SYMBOLS_PRIMARY[symbolKey] || `/slot-${symbolKey}.png`);
  }, [symbolKey]);

  return (
    <div className={`w-[82%] h-[82%] relative ${spinning ? "blur-[1px]" : ""}`}>
      <Image
        src={src}
        alt={symbolKey}
        fill
        className={`object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)] ${spinning ? "animate-slotJitter" : ""}`}
        onError={() => setSrc(fallback)}
        priority={false}
      />
    </div>
  );
}

export default function TacoSlotPro() {
  const { balance, bonusBalance, refresh, formatted, formattedBonus } = useWalletBalance();
  const { toast } = useToast();

  const available = (balance || 0) + (bonusBalance || 0);

  const [soundEnabled, setSoundEnabled] = useLocalSetting<boolean>("chido_sound", true);
  const [turbo, setTurbo] = useLocalSetting<boolean>("chido_slot_turbo", false);
  const [vfx, setVfx] = useLocalSetting<boolean>("chido_vfx", true);
  const [haptics, setHaptics] = useLocalSetting<boolean>("chido_haptics", true);

  const [promo, setPromo] = useState<PromoLimit>({ ok: true, hasRollover: false });
  const [resp, setResp] = useState<ResponsibleStatus>({ ok: true, excluded: false, until: null, reason: null });

  const maxBet = promo.ok && promo.hasRollover ? promo.maxBet : Infinity;

  const clampBet = (v: number) => {
    let n = Number(v);
    if (!Number.isFinite(n) || n <= 0) n = 10;
    if (promo.ok && promo.hasRollover) n = Math.min(n, promo.maxBet);
    return Math.max(1, Math.floor(n));
  };

  const [bet, setBet] = useState(10);

  const [spinning, setSpinning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "spin" | "reveal1" | "reveal2" | "reveal3">("idle");

  const [reels, setReels] = useState<string[]>(["verde", "verde", "verde"]);
  const [level, setLevel] = useState<{ key: string; label: string; badge: string } | null>(null);

  const [winData, setWinData] = useState<{ payout: number; mult: number; kind: "small" | "big" | "mega" } | null>(
    null
  );
  const [lastFair, setLastFair] = useState<{ hash?: string; seed?: string; nonce?: number; ts: string } | null>(null);

  // Autoplay
  const [autoLeft, setAutoLeft] = useState<number>(0);
  const autoRef = useRef<number>(0);
  autoRef.current = autoLeft;

  const durations = useMemo(() => {
    return turbo ? { spin: 520, revealGap: 150 } : { spin: 1100, revealGap: 260 };
  }, [turbo]);

  const randomSymbol = () => {
    const keys = Object.keys(LEVEL_BADGES);
    return keys[Math.floor(Math.random() * keys.length)];
  };

  const loadGates = async () => {
    try {
      const [p, r] = await Promise.all([
        fetch("/api/promos/limits", { cache: "no-store" }),
        fetch("/api/responsible/status", { cache: "no-store" }),
      ]);

      const pj = (await p.json().catch(() => ({}))) as PromoLimit;
      const rj = (await r.json().catch(() => ({}))) as any;

      if (p.ok) setPromo(pj);
      if (r.ok) setResp({ ok: true, excluded: !!rj.excluded, until: rj.until ?? null, reason: rj.reason ?? null });
    } catch {}
  };

  useEffect(() => {
    void loadGates();
    const t = setInterval(loadGates, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setBet((b) => clampBet(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo.ok, (promo as any).hasRollover, (promo as any).maxBet]);

  useEffect(() => {
    // si desactivas sonido, corta loops
    sfx.setEnabled(soundEnabled);
    if (!soundEnabled) sfx.stopAllLoops();
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      sfx.stopAllLoops();
    };
  }, []);

  const classifyWin = (payout: number, betAmount: number) => {
    const ratio = betAmount > 0 ? payout / betAmount : 0;
    if (ratio >= 20) return "mega" as const;
    if (ratio >= 8) return "big" as const;
    if (ratio > 0) return "small" as const;
    return "small" as const;
  };

  const doSpin = async (triggeredByAuto = false) => {
    if (spinning) return;

    sfx.setEnabled(soundEnabled);
    sfx.unlock();

    if (resp.ok && resp.excluded) {
      if (!triggeredByAuto) {
        toast({
          title: "Autoexclusión activa",
          description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "Ahorita no se arma.",
          variant: "destructive",
        });
      }
      setAutoLeft(0);
      return;
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      if (!triggeredByAuto) {
        toast({
          title: "Saldo insuficiente",
          description: "Te falta feria. Tu disponible incluye bono si aplica.",
          variant: "destructive",
        });
      }
      setAutoLeft(0);
      return;
    }

    setSpinning(true);
    setWinData(null);
    setPhase("spin");

    if (haptics) vibrate(turbo ? 20 : 35);
    if (soundEnabled) {
      sfx.uiClick();
      sfx.slotSpinStart(turbo);
    }

    // visual jitter
    const jitter = setInterval(() => {
      setReels([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, turbo ? 55 : 90);

    let api: SpinApi | null = null;

    try {
      const res = await fetch("/api/games/taco-slot/spin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bet: safeBet }),
      });

      api = (await res.json().catch(() => ({}))) as SpinApi;

      if (!res.ok || !("ok" in api) || (api as any).ok !== true) {
        const err = (api as any)?.error || "Error al girar";
        if (err === "PROMO_MAX_BET") setBet(clampBet(Number((api as any).maxBet || safeBet)));
        if (err === "SELF_EXCLUDED") await loadGates();
        throw new Error((api as any)?.message || err);
      }
    } catch (e: any) {
      clearInterval(jitter);
      sfx.stopLoop("slotSpin");
      setPhase("idle");
      setSpinning(false);
      setAutoLeft(0);

      if (!triggeredByAuto) {
        toast({ title: "No se armó", description: e?.message || "Intenta otra vez.", variant: "destructive" });
      }
      return;
    }

    const okApi = api as Extract<SpinApi, { ok: true }>;
    const finalKeys =
      Array.isArray(okApi.reels) && typeof okApi.reels[0] === "string"
        ? (okApi.reels as string[])
        : (okApi.reels as Array<{ key: string }>).map((x) => x.key);

    const payout = Number(okApi.payout || 0);
    const mult = Number(okApi.multiplier || 0);

    const t0 = setTimeout(() => {
      setPhase("reveal1");
      setReels([finalKeys[0] || "verde", randomSymbol(), randomSymbol()]);
      if (soundEnabled) sfx.slotStop();
      if (haptics) vibrate(15);
    }, durations.spin);

    const t1 = setTimeout(() => {
      setPhase("reveal2");
      setReels([finalKeys[0] || "verde", finalKeys[1] || "verde", randomSymbol()]);
      if (soundEnabled) sfx.slotStop();
      if (haptics) vibrate(15);
    }, durations.spin + durations.revealGap);

    const t2 = setTimeout(() => {
      clearInterval(jitter);
      sfx.stopLoop("slotSpin");

      setPhase("reveal3");
      setReels([finalKeys[0] || "verde", finalKeys[1] || "verde", finalKeys[2] || "verde"]);

      if (okApi.level) setLevel(okApi.level);
      setLastFair({
        hash: okApi.fair?.serverSeedHash,
        seed: okApi.fair?.serverSeed,
        nonce: okApi.fair?.nonce,
        ts: safeNowIso(),
      });

      if (payout > 0) {
        const kind = classifyWin(payout, safeBet);
        setWinData({ payout, mult, kind });

        if (soundEnabled) {
          if (kind === "mega") sfx.winMega();
          else if (kind === "big") sfx.winBig();
          else sfx.winSmall();
        }

        if (haptics) vibrate(kind === "mega" ? 90 : kind === "big" ? 60 : 35);

        toast({
          title: kind === "mega" ? "MEGA WIN 🔥" : kind === "big" ? "¡Qué chido! Ganaste" : "Pegó 👌",
          description: `x${mult} (+${money(payout)} MXN)`,
        });
      } else {
        if (soundEnabled) sfx.slotLose();
      }

      refresh();
      void loadGates();

      setTimeout(() => {
        setPhase("idle");
        setSpinning(false);

        if (autoRef.current > 0) {
          setAutoLeft((n) => Math.max(0, n - 1));
        }
      }, turbo ? 120 : 220);
    }, durations.spin + durations.revealGap * 2);

    return () => {
      clearInterval(jitter);
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      sfx.stopLoop("slotSpin");
    };
  };

  useEffect(() => {
    if (autoLeft <= 0) return;
    if (spinning) return;

    const t = setTimeout(() => {
      void doSpin(true);
    }, turbo ? 180 : 260);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLeft, spinning, turbo]);

  const toggleAuto = (count?: number) => {
    if (autoLeft > 0) {
      setAutoLeft(0);
      toast({ title: "Auto detenido", description: "Listo. Tú mandas." });
      return;
    }
    const c = clampInt(Number(count || 10), 1, 200);
    setAutoLeft(c);
    toast({ title: "Auto activado", description: `Se arma con ${c} giros.` });
  };

  const showCap = promo.ok && promo.hasRollover;

  const headline = useMemo(() => {
    const lines = [
      "Se armó el slot 👀",
      "A ver si cae la buena",
      "Dale, que hoy pinta chido",
      "Puro sabor, puro CHIDO",
      "Que ruede la suerte, patrón",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }, []);

  return (
    <div className="relative min-h-[80vh] w-full pb-24">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-25" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,0,153,0.16),transparent_45%),radial-gradient(circle_at_70%_40%,rgba(0,240,255,0.14),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(50,205,50,0.10),transparent_45%)]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <Image
                src="/isotipo-color.png"
                alt="CHIDO"
                fill
                className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)]"
              />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">
                Taco Slot <span className="text-[#00F0FF]">PRO</span>
              </div>
              <div className="text-xs text-white/55">{headline}</div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTurbo((v) => !v)}
              className={`h-10 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                turbo
                  ? "bg-[#FFD700] text-black border-[#FFD700]/40"
                  : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Turbo"
            >
              <Zap size={16} />
              Turbo
            </button>

            <button
              onClick={() => setVfx((v) => !v)}
              className={`h-10 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                vfx
                  ? "bg-white text-black border-white/30"
                  : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="VFX"
            >
              <Sparkles size={16} />
              VFX
            </button>

            <button
              onClick={() => {
                setSoundEnabled((v) => !v);
                // desbloquea audio en el primer tap
                sfx.unlock();
                sfx.uiClick();
              }}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 flex items-center justify-center"
              aria-label="Sonido"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        {/* Gates */}
        {resp.ok && resp.excluded ? (
          <div className="mt-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/80 flex items-start gap-2">
            <Ban className="mt-0.5 text-red-400" size={18} />
            <div>
              <div className="font-black">Autoexclusión activa</div>
              <div className="text-xs text-white/65">
                {resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "Ahorita no se puede jugar."}
              </div>
            </div>
          </div>
        ) : null}

        {showCap ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 text-[#FFD700]" size={18} />
              <div className="w-full">
                <div className="font-black">Bono activo (rollover)</div>
                <div className="text-xs text-white/65">
                  Máximo por giro: <b className="text-white">{promo.ok && promo.hasRollover ? promo.maxBet : 0} MXN</b>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#32CD32]" style={{ width: `${promo.ok && promo.hasRollover ? promo.pct : 0}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/45">
                  {promo.ok && promo.hasRollover
                    ? `${Math.round(promo.progress)} / ${Math.round(promo.required)} MXN • ${promo.pct}%`
                    : ""}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Main */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Slot */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/35 p-4 sm:p-6">
            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,0,153,0.18),transparent_55%),radial-gradient(circle_at_60%_80%,rgba(0,240,255,0.16),transparent_55%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-black text-white/90 inline-flex items-center gap-2">
                  <Flame size={18} className="text-[#FF5E00]" />
                  Reels
                  <span className="text-[11px] text-white/45 font-bold">
                    {turbo ? "• turbo" : "• normal"} {autoLeft > 0 ? `• auto ${autoLeft}` : ""}
                  </span>
                </div>

                {level ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    <div className="relative h-7 w-7">
                      <Image src={LEVEL_BADGES[level.key] || level.badge} alt={level.label} fill className="object-contain" />
                    </div>
                    <div className="text-xs text-white/70">
                      Nivel: <b className="text-white">{level.label}</b>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-white/50">Nivel: se calcula por apuesta</div>
                )}
              </div>

              <div className="mt-4 relative rounded-3xl border border-white/10 bg-[#0b0b0e] p-4 sm:p-5 overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
                <div className="absolute inset-0 opacity-[0.10] bg-[url('/opengraph-image.jpg')] bg-cover mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

                <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-4">
                  {reels.map((k, i) => (
                    <div
                      key={i}
                      className={`relative aspect-[3/4] rounded-2xl border border-white/10 bg-black/35 overflow-hidden flex items-center justify-center ${
                        phase === "spin" ? "shadow-[0_0_40px_rgba(0,240,255,0.10)]" : ""
                      }`}
                    >
                      <div className={`absolute inset-0 ${phase === "spin" ? "animate-reelShine" : ""}`} />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/55 pointer-events-none" />
                      <SymbolImg symbolKey={k} spinning={phase === "spin"} />
                      {phase !== "spin" ? (
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white/15" />
                      ) : (
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#00F0FF]/60 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>

                {winData && vfx ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="text-center px-6">
                      <div
                        className={`text-6xl sm:text-7xl font-black drop-shadow-2xl ${
                          winData.kind === "mega"
                            ? "text-[#FFD700]"
                            : winData.kind === "big"
                            ? "text-[#00F0FF]"
                            : "text-[#32CD32]"
                        }`}
                      >
                        {winData.kind === "mega" ? "MEGA WIN" : winData.kind === "big" ? "BIG WIN" : "WIN"}
                      </div>
                      <div className="mt-2 text-white text-xl font-black">
                        +{money(winData.payout)} <span className="text-white/60 text-base">MXN</span>
                      </div>
                      <div className="mt-1 text-white/70 text-sm">x{winData.mult}</div>
                      <div className="mt-4 text-[11px] text-white/50">
                        Tip: si traes bono activo, respeta el cap por jugada (pa’ que todo sea limpio).
                      </div>
                    </div>

                    <div className={`absolute inset-0 pointer-events-none ${winData.kind !== "small" ? "animate-confetti" : "animate-sparks"}`} />
                  </div>
                ) : null}
              </div>

              {/* Controls */}
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Disponible</div>
                      <div className="text-lg font-black tabular-nums">
                        {formatted} <span className="text-xs text-white/45">+ bono {formattedBonus}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Apuesta</div>
                      <div className="text-lg font-black tabular-nums">
                        ${bet}
                        {Number.isFinite(maxBet) && maxBet !== Infinity ? (
                          <span className="text-xs text-white/45"> / max {maxBet}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      {[10, 20, 50, 100].map((v) => {
                        const disabled = spinning || (resp.ok && resp.excluded) || (promo.ok && promo.hasRollover && v > promo.maxBet);
                        return (
                          <button
                            key={v}
                            onClick={() => setBet(clampBet(v))}
                            disabled={disabled}
                            className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition"
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBet(clampBet(bet - 10))}
                        disabled={spinning || (resp.ok && resp.excluded)}
                        className="h-10 w-10 rounded-2xl bg-black/40 border border-white/10 text-white font-black hover:bg-white/5 disabled:opacity-40 transition"
                      >
                        -
                      </button>
                      <button
                        onClick={() => setBet(clampBet(bet + 10))}
                        disabled={spinning || (resp.ok && resp.excluded)}
                        className="h-10 w-10 rounded-2xl bg-black/40 border border-white/10 text-white font-black hover:bg-white/5 disabled:opacity-40 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button
                    onClick={() => void doSpin(false)}
                    disabled={spinning || (resp.ok && resp.excluded)}
                    className={`h-14 rounded-3xl font-black text-lg uppercase tracking-widest transition-all ${
                      spinning
                        ? "bg-zinc-700 text-white/70 cursor-not-allowed"
                        : "bg-gradient-to-b from-[#00F0FF] to-[#0099FF] text-black hover:scale-[1.01] shadow-[0_0_30px_rgba(0,240,255,0.25)]"
                    }`}
                  >
                    {spinning ? <Loader2 className="animate-spin" /> : "GIRAR"}
                  </Button>

                  <button
                    onClick={() => toggleAuto(10)}
                    disabled={spinning || (resp.ok && resp.excluded)}
                    className={`h-12 rounded-3xl border text-sm font-black inline-flex items-center justify-center gap-2 transition ${
                      autoLeft > 0
                        ? "bg-[#FF0099] text-white border-[#FF0099]/40 shadow-[0_0_20px_rgba(255,0,153,0.22)]"
                        : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {autoLeft > 0 ? <Pause size={18} /> : <Play size={18} />}
                    {autoLeft > 0 ? "DETENER AUTO" : "AUTO x10"}
                  </button>
                </div>
              </div>

              {/* Provably fair */}
              <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4 text-xs text-white/70">
                <div className="flex items-center gap-2 font-black text-white/85">
                  <Info size={14} /> Provably Fair (hash/seed)
                </div>
                {lastFair?.hash ? (
                  <div className="mt-2 font-mono break-all text-[11px] text-white/65">
                    hash: {lastFair.hash}
                    {lastFair.nonce != null ? <> • nonce: {lastFair.nonce}</> : null}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-white/55">Se muestra después de un giro.</div>
                )}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="rounded-[32px] border border-white/10 bg-black/30 p-5 h-fit">
            <div className="text-sm font-black text-white/85">Ajustes rápidos</div>

            <div className="mt-4 grid gap-2">
              <button
                onClick={() => setHaptics((v) => !v)}
                className={`h-11 rounded-2xl border text-xs font-black inline-flex items-center justify-center gap-2 transition ${
                  haptics ? "bg-white text-black border-white/30" : "bg-black/40 text-white/70 border-white/10 hover:bg-white/5"
                }`}
              >
                <Sparkles size={16} />
                Vibración: {haptics ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => {
                  setBet((b) => clampBet(b));
                  toast({ title: "Listo", description: "Apuesta ajustada al cap si aplica." });
                }}
                className="h-11 rounded-2xl border border-white/10 bg-black/40 hover:bg-white/5 text-xs font-black text-white/80 transition"
              >
                Ajustar apuesta al cap
              </button>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs font-black text-white/80">Paytable</div>
              <div className="mt-2 text-[11px] text-white/60 leading-relaxed">
                x3: verde=3 • jalapeño=5 • serrano=10 • habanero=20 • par=0.82
                <br />
                RTP esperado ~94.74% (server-side).
              </div>
              <div className="mt-3 text-[11px] text-white/45">
                *Si aún ves badges en reels es porque faltan los símbolos del slot (slot-*.png).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-slotJitter,
          .animate-reelShine,
          .animate-confetti,
          .animate-sparks {
            animation: none !important;
          }
        }

        @keyframes slotJitter {
          0% {
            transform: translateY(0) scale(1);
          }
          25% {
            transform: translateY(-2px) scale(1.01);
          }
          50% {
            transform: translateY(1px) scale(0.99);
          }
          75% {
            transform: translateY(-1px) scale(1.005);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
        .animate-slotJitter {
          animation: slotJitter 220ms linear infinite;
        }

        @keyframes reelShine {
          0% {
            transform: translateX(-140%) rotate(12deg);
            opacity: 0;
          }
          10% {
            opacity: 0.15;
          }
          45% {
            opacity: 0.1;
          }
          100% {
            transform: translateX(140%) rotate(12deg);
            opacity: 0;
          }
        }
        .animate-reelShine {
          background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.16) 50%, transparent 65%);
          animation: reelShine 700ms ease-in-out infinite;
        }

        @keyframes confetti {
          0% {
            background-position: 0 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            background-position: 0 900px;
            opacity: 0;
          }
        }
        .animate-confetti {
          background-image: radial-gradient(circle, rgba(255, 0, 153, 0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(0, 240, 255, 0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(255, 215, 0, 0.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(50, 205, 50, 0.9) 0 2px, transparent 3px);
          background-size: 140px 140px;
          animation: confetti 900ms linear infinite;
        }

        @keyframes sparks {
          0% {
            opacity: 0;
            transform: scale(0.98);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.02);
          }
        }
        .animate-sparks {
          background: radial-gradient(circle at 30% 40%, rgba(0, 240, 255, 0.25), transparent 55%),
            radial-gradient(circle at 70% 50%, rgba(255, 0, 153, 0.22), transparent 55%),
            radial-gradient(circle at 50% 70%, rgba(50, 205, 50, 0.18), transparent 55%);
          animation: sparks 520ms ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}