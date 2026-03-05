"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useWalletBalance } from "@/lib/useWalletBalance";
import {
  ChevronLeft,
  Menu,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  ShieldAlert,
  Ban,
  Info,
  History,
} from "lucide-react";

type PromoLimit =
  | { ok: true; hasRollover: false }
  | { ok: true; hasRollover: true; maxBet: number; required: number; progress: number; pct: number }
  | { ok: false; error: string };

type ResponsibleStatus =
  | { ok: true; excluded: boolean; until: string | null; reason: string | null }
  | { ok: false; error: string };

type CrashApi = {
  ok?: boolean;
  crashMultiplier?: number;
  targetMultiplier?: number;
  didCashout?: boolean;
  payout?: number;
  houseEdgeBps?: number;
  serverSeedHash?: string;
  serverSeed?: string;
  refId?: string;
  error?: string;
  message?: string;
  maxBet?: number;
};

function money(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function clamp(n: number, a: number, b: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}
function vibrate(ms: number) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      // @ts-ignore
      navigator.vibrate(ms);
    }
  } catch {}
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

class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  private tick?: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode };

  async unlock() {
    if (this.unlocked) return;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);

      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.00001;
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + 0.02);

      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }
  }

  setMuted(muted: boolean) {
    if (!this.master) return;
    this.master.gain.value = muted ? 0 : 0.9;
  }

  private async tryPlayFile(src: string, vol: number, loop = false) {
    try {
      const a = new Audio(src);
      a.volume = Math.max(0, Math.min(1, vol));
      a.loop = loop;
      await a.play();
      return a;
    } catch {
      return null;
    }
  }

  private beep(freq: number, durMs: number, vol: number, type: OscillatorType = "sine") {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + durMs / 1000 + 0.02);
  }

  private noiseLoopStart(turbo: boolean) {
    if (!this.ctx || !this.master) return;
    if (this.tick) return;

    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.22);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.28;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = turbo ? 980 : 820;
    filter.Q.value = 0.7;

    const g = this.ctx.createGain();
    g.gain.value = turbo ? 0.045 : 0.04;

    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();

    this.tick = { src, gain: g, filter };
  }

  private noiseLoopStop() {
    try {
      this.tick?.src.stop();
    } catch {}
    this.tick = undefined;
  }

  async click() {
    if ((await this.tryPlayFile("/sounds/ui-click.mp3", 0.35)) !== null) return;
    this.beep(520, 40, 0.08, "square");
  }

  startTick(turbo: boolean) {
    this.tryPlayFile("/sounds/crash-tick.mp3", turbo ? 0.12 : 0.10, true).then((a) => {
      if (a) return;
      this.noiseLoopStart(turbo);
    });
  }

  stopTick() {
    this.noiseLoopStop();
  }

  async bust() {
    if ((await this.tryPlayFile("/sounds/crash-bust.mp3", 0.28)) !== null) return;
    this.beep(220, 90, 0.08, "sawtooth");
    this.beep(160, 140, 0.07, "sawtooth");
  }

  async win() {
    if ((await this.tryPlayFile("/sounds/crash-win.mp3", 0.30)) !== null) return;
    this.beep(523, 110, 0.10, "triangle");
    this.beep(659, 140, 0.10, "triangle");
    this.beep(784, 170, 0.11, "triangle");
  }
}

export default function CrashProMexCasino() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { balance, bonusBalance, refresh, formatted, formattedBonus } = useWalletBalance();
  const available = (balance || 0) + (bonusBalance || 0);

  const [soundOn, setSoundOn] = useLocalSetting("chido_sound", true);
  const [turbo, setTurbo] = useLocalSetting("chido_crash_turbo", false);
  const [vfx, setVfx] = useLocalSetting("chido_vfx", true);
  const [haptics, setHaptics] = useLocalSetting("chido_haptics", true);

  const sfxRef = useRef<SoundKit | null>(null);
  if (!sfxRef.current) sfxRef.current = new SoundKit();

  useEffect(() => {
    sfxRef.current?.setMuted(!soundOn);
  }, [soundOn]);

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
  const [target, setTarget] = useState(2.0);

  useEffect(() => {
    setBet((b) => clampBet(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo.ok, (promo as any).hasRollover, (promo as any).maxBet]);

  const [gameState, setGameState] = useState<"IDLE" | "RUNNING" | "CRASHED" | "WON">("IDLE");
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<{ crash: number; win: boolean }[]>([]);
  const [lastRound, setLastRound] = useState<{ hash?: string; seed?: string; edge?: number; ref?: string; ts: string } | null>(null);

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

  const durations = useMemo(() => {
    return turbo ? { stepMs: 14, curve: 0.0105 } : { stepMs: 22, curve: 0.0082 };
  }, [turbo]);

  const startGame = async () => {
    if (resp.ok && resp.excluded) {
      return toast({
        title: "Autoexclusión activa",
        description: resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "Ahorita no se arma.",
        variant: "destructive",
      });
    }

    const safeBet = clampBet(bet);
    if (safeBet !== bet) setBet(safeBet);

    if (safeBet > available) {
      return toast({ title: "Saldo insuficiente", description: "Tu disponible incluye bono si aplica.", variant: "destructive" });
    }

    setLoading(true);
    setGameState("IDLE");
    setMultiplier(1.0);
    setLastRound(null);

    if (haptics) vibrate(turbo ? 18 : 28);

    await sfxRef.current?.unlock();
    await sfxRef.current?.click();

    try {
      const res = await fetch("/api/games/crash/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount: safeBet, targetMultiplier: target }),
      });

      const data = (await res.json().catch(() => ({}))) as CrashApi;

      if (!res.ok) {
        if (data?.error === "PROMO_MAX_BET") {
          setBet(clampBet(Number(data.maxBet || safeBet)));
          throw new Error(data?.message || "Apuesta excede el máximo permitido por bono.");
        }
        if (data?.error === "SELF_EXCLUDED") {
          await loadGates();
          throw new Error(data?.message || "Autoexclusión activa.");
        }
        throw new Error(data?.error || "Error al procesar apuesta");
      }

      refresh();
      setLoading(false);
      setGameState("RUNNING");

      const crashPoint = Number(data.crashMultiplier || 1);
      const userWon = Boolean(data.didCashout);
      const targetPoint = Number(data.targetMultiplier || target);

      setLastRound({
        hash: data.serverSeedHash,
        seed: data.serverSeed,
        edge: data.houseEdgeBps,
        ref: data.refId,
        ts: new Date().toISOString(),
      });

      sfxRef.current?.startTick(turbo);

      let currentM = 1.0;
      const stopPoint = userWon ? targetPoint : crashPoint;

      const interval = setInterval(async () => {
        currentM += currentM * durations.curve + 0.0028;

        if (currentM >= stopPoint) {
          clearInterval(interval);
          setMultiplier(stopPoint);
          sfxRef.current?.stopTick();

          if (userWon) {
            setGameState("WON");
            if (haptics) vibrate(60);
            await sfxRef.current?.win();
            toast({
              title: "¡Se armó! Cobraste ✅",
              description: `${targetPoint.toFixed(2)}x (+${money(Number(data.payout || 0))} MXN)`,
            });
          } else {
            setGameState("CRASHED");
            setMultiplier(crashPoint);
            if (haptics) vibrate(45);
            await sfxRef.current?.bust();
          }

          setHistory((prev) => [{ crash: crashPoint, win: userWon }, ...prev].slice(0, 10));
          refresh();
          void loadGates();
        } else {
          setMultiplier(currentM);
        }
      }, durations.stepMs);
    } catch (error: any) {
      sfxRef.current?.stopTick();
      setLoading(false);
      toast({ title: "No se armó", description: error.message || "Error", variant: "destructive" });
    }
  };

  // Canvas draw (pro vibe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < rect.width; i += 52) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, rect.height);
      }
      for (let i = 0; i < rect.height; i += 52) {
        ctx.moveTo(0, i);
        ctx.lineTo(rect.width, i);
      }
      ctx.stroke();

      if (gameState !== "IDLE") {
        const t = Math.min(1, (multiplier - 1) / 12);
        const x = t * rect.width * 0.86;
        const y = rect.height - t * rect.height * 0.82;

        ctx.beginPath();
        ctx.moveTo(0, rect.height);
        ctx.quadraticCurveTo(x * 0.52, rect.height, x, y);

        let color = "#00F0FF";
        if (gameState === "CRASHED") color = "#FF3D00";
        if (gameState === "WON") color = "#32CD32";

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.lineTo(x, rect.height);
        ctx.lineTo(0, rect.height);

        const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
        grad.addColorStop(0, `${color}55`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [gameState, multiplier]);

  const showCap = promo.ok && promo.hasRollover;

  return (
    <div className="relative min-h-[calc(100vh-88px)] pb-24">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Image src="/hero-bg.jpg" alt="Fondo" fill className="object-cover opacity-20" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(0,240,255,0.12),transparent_45%),radial-gradient(circle_at_70%_40%,rgba(255,0,153,0.14),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(50,205,50,0.10),transparent_50%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/lobby"
              className="h-11 w-11 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 transition"
              aria-label="Volver"
            >
              <ChevronLeft size={18} />
            </Link>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
              <div className="relative h-6 w-6">
                <Image src="/isotipo-color.png" alt="CHIDO" fill className="object-contain" />
              </div>
              <div className="leading-tight">
                <div className="text-white font-black text-sm">Chido Crash</div>
                <div className="text-white/55 text-[11px]">Auto-cobro real (target)</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-xs">
              <div className="text-white/55 font-black uppercase tracking-widest text-[10px]">Saldo</div>
              <div className="text-white font-black tabular-nums">
                {formatted} <span className="text-white/45 text-[11px]">+ bono {formattedBonus}</span>
              </div>
            </div>

            <Link
              href="/wallet"
              className="h-11 px-4 rounded-2xl bg-[#32CD32] text-black font-black inline-flex items-center gap-2 shadow-[0_0_22px_rgba(50,205,50,0.18)] hover:brightness-110 transition"
            >
              Depósito
            </Link>

            <button
              onClick={() => setSoundOn((v: boolean) => !v)}
              className="h-11 w-11 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 transition"
              aria-label="Sonido"
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={() => setTurbo((v: boolean) => !v)}
              className={`h-11 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                turbo ? "bg-[#FFD700] text-black border-[#FFD700]/45" : "bg-black/35 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="Turbo"
            >
              <Zap size={16} /> Turbo
            </button>

            <button
              onClick={() => setVfx((v: boolean) => !v)}
              className={`h-11 px-3 rounded-2xl border text-xs font-black inline-flex items-center gap-2 transition ${
                vfx ? "bg-white text-black border-white/35" : "bg-black/35 text-white/70 border-white/10 hover:bg-white/5"
              }`}
              aria-label="VFX"
            >
              <Sparkles size={16} /> VFX
            </button>

            <button
              className="h-11 w-11 grid place-items-center rounded-2xl border border-white/10 bg-black/35 hover:bg-white/5 transition"
              aria-label="Menú"
              onClick={() => toast({ title: "Menú", description: "Luego metemos: historial completo, reglas, tutorial, anti-tilt." })}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Gates */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {resp.ok && resp.excluded ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/85 flex items-start gap-2">
              <Ban className="mt-0.5 text-red-400" size={18} />
              <div>
                <div className="font-black">Autoexclusión activa</div>
                <div className="text-xs text-white/65">
                  {resp.until ? `Hasta: ${new Date(resp.until).toLocaleString()}` : "Ahorita no se puede jugar."}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-white/80 flex items-start gap-2">
              <Info className="mt-0.5 text-[#00F0FF]" size={18} />
              <div>
                <div className="font-black">Tip rápido</div>
                <div className="text-xs text-white/65">Pon tu target con cabeza. El turbo se siente rico, pero no perdona 😅</div>
              </div>
            </div>
          )}

          {showCap ? (
            <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-white/85">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 text-[#FFD700]" size={18} />
                <div className="w-full">
                  <div className="font-black">Bono activo (rollover)</div>
                  <div className="text-xs text-white/65">Máximo por jugada: <b className="text-white">{promo.maxBet} MXN</b></div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#32CD32]" style={{ width: `${promo.ok && promo.hasRollover ? promo.pct : 0}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-white/45">
                    {promo.ok && promo.hasRollover ? `${Math.round(promo.progress)} / ${Math.round(promo.required)} MXN • ${promo.pct}%` : ""}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/30 p-4 text-sm text-white/75 flex items-start gap-2">
              <History className="mt-0.5 text-[#FF0099]" size={18} />
              <div>
                <div className="font-black">Sin bono activo</div>
                <div className="text-xs text-white/65">Sin cap por jugada. Igual no te vayas “all-in” sin razón.</div>
              </div>
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="mt-5 flex flex-col lg:flex-row gap-5">
          {/* Left panel */}
          <div className="w-full lg:w-[360px] rounded-[32px] border border-white/10 bg-black/30 p-5 shadow-xl h-fit">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-black">Disponible</div>
              <div className="mt-1 text-lg font-black tabular-nums">
                {formatted} <span className="text-xs text-white/45">+ bono {formattedBonus}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-black text-white/55 uppercase tracking-widest">
                  Apuesta {Number.isFinite(maxBet) && maxBet !== Infinity ? `(max ${maxBet})` : ""}
                </label>
                <div className="mt-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 font-black">$</span>
                  <Input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(clampBet(Number(e.target.value)))}
                    className="bg-black/40 border-white/10 h-12 pl-8 font-mono text-white"
                    disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
                  />
                </div>

                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map((v) => {
                    const disabled =
                      (promo.ok && promo.hasRollover && v > promo.maxBet) || (resp.ok && resp.excluded) || gameState === "RUNNING";
                    return (
                      <button
                        key={v}
                        onClick={() => setBet(clampBet(v))}
                        disabled={disabled}
                        className="bg-white/5 text-xs py-2 rounded-2xl border border-white/10 hover:bg-white/10 transition disabled:opacity-40"
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/55 uppercase tracking-widest">Auto-cobro (x)</label>
                <Input
                  type="number"
                  value={target}
                  step="0.10"
                  onChange={(e) => setTarget(clamp(Number(e.target.value), 1.01, 1000))}
                  className="bg-black/40 border-white/10 h-12 font-mono text-white"
                  disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
                />
                <div className="mt-2 flex gap-2 flex-wrap">
                  {[1.5, 2, 3, 5].map((x) => (
                    <button
                      key={x}
                      onClick={() => setTarget(x)}
                      disabled={gameState === "RUNNING" || (resp.ok && resp.excluded)}
                      className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white/80 hover:bg-white/10 disabled:opacity-40 transition"
                    >
                      {x}x
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={startGame}
                disabled={gameState === "RUNNING" || loading || (resp.ok && resp.excluded)}
                className={`h-14 rounded-3xl text-lg font-black uppercase tracking-widest transition-all ${
                  gameState === "RUNNING"
                    ? "bg-zinc-700 opacity-60 cursor-not-allowed"
                    : "bg-[#00F0FF] text-black hover:bg-[#00d6e6] shadow-[0_0_30px_rgba(0,240,255,0.25)] hover:scale-[1.01]"
                }`}
              >
                {loading ? "..." : gameState === "RUNNING" ? "EN JUEGO..." : "APOSTAR"}
              </Button>

              <div className="text-[11px] text-white/45 flex items-center gap-2">
                <Info size={14} /> Si hay bono activo, aplicamos cap por jugada (anti-abuso).
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4 text-xs text-white/70">
              <div className="flex items-center gap-2 font-black text-white/85">
                <Info size={14} /> Provably Fair
              </div>
              {lastRound?.hash ? (
                <div className="mt-2 font-mono break-all text-[11px] text-white/65">
                  hash: {lastRound.hash}
                  {typeof lastRound.edge === "number" ? <> • edge: {lastRound.edge} bps</> : null}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-white/55">Se muestra después de una ronda.</div>
              )}
            </div>
          </div>

          {/* Stage */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs text-white/55 font-black border border-white/10">
                <History size={12} /> RECIENTES
              </div>
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-black whitespace-nowrap border ${
                    h.win ? "bg-[#32CD32]/10 text-[#32CD32] border-[#32CD32]/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {h.crash.toFixed(2)}x
                </div>
              ))}
            </div>

            <div className="relative flex-1 min-h-[420px] bg-[#0f0f11] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-20">
                <Image src="/opengraph-image.jpg" alt="Overlay" fill className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/70" />
              {vfx ? (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,240,255,0.10),transparent_45%),radial-gradient(circle_at_40%_70%,rgba(255,0,153,0.10),transparent_50%)]" />
              ) : null}

              <canvas ref={canvasRef} className="relative z-10 w-full h-full" />

              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                <div
                  className={`text-7xl sm:text-8xl lg:text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl transition-colors duration-150 ${
                    gameState === "CRASHED" ? "text-[#FF3D00]" : gameState === "WON" ? "text-[#32CD32]" : "text-white"
                  }`}
                >
                  {multiplier.toFixed(2)}x
                </div>

                {gameState === "CRASHED" ? (
                  <div className="mt-4 px-6 py-2 bg-[#FF3D00] text-black font-black text-lg uppercase tracking-widest rounded-full animate-in zoom-in">
                    CRASH
                  </div>
                ) : null}

                {gameState === "WON" ? (
                  <div className="mt-4 px-6 py-2 bg-[#32CD32] text-black font-black text-lg uppercase tracking-widest rounded-full animate-in zoom-in">
                    COBRADO ✅
                  </div>
                ) : null}

                {gameState === "RUNNING" ? (
                  <div className="mt-4 text-xs text-white/60 font-black uppercase tracking-widest">
                    Auto-cobro en {target.toFixed(2)}x
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-white/45">
              <div className="inline-flex items-center gap-2">
                <Image src="/isotipo-bw.png" alt="CHIDO" width={18} height={18} className="opacity-70" />
                <span>Chido Casino • Juego responsable</span>
              </div>
              <div>© {new Date().getFullYear()} Hocker AGI Technologies</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}