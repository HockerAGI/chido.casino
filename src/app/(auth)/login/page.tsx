// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function cn(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function SoftSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/90",
        className
      )}
      aria-hidden="true"
    />
  );
}

function playSoftSuccessTone() {
  // Ultra-sutil, opcional. Sin archivos externos.
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 520;
    g.gain.value = 0.00001; // casi imperceptible
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
    o.stop(ctx.currentTime + 0.14);
    setTimeout(() => ctx.close(), 250);
  } catch {}
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  // “Riesgo visual” (fintech style): sube con intentos fallidos (solo client, por ahora)
  const [risk, setRisk] = useState(0); // 0..100

  // Modo Focus (low-distraction) + auto nocturno
  const [focusMode, setFocusMode] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Escribe tu correo.";
    if (!isValidEmail(email)) return "Correo inválido. Revisa el formato.";
    return "";
  }, [email, touched.email]);

  const passError = useMemo(() => {
    if (!touched.password) return "";
    if (!password) return "Escribe tu contraseña.";
    if (password.length < 6) return "Mínimo 6 caracteres.";
    return "";
  }, [password, touched.password]);

  const canSubmit = useMemo(() => {
    return isValidEmail(email) && password.length >= 6 && !loading;
  }, [email, password, loading]);

  useEffect(() => {
    // Auto “low-distraction” nocturno
    const hour = new Date().getHours();
    const night = hour >= 22 || hour <= 6;
    if (night) setFocusMode(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.low = focusMode ? "true" : "false";
  }, [focusMode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerMsg(null);

    setTouched({ email: true, password: true });
    if (!isValidEmail(email) || password.length < 6) {
      // micro feedback: shake
      cardRef.current?.classList.remove("shake");
      // reflow
      void cardRef.current?.offsetWidth;
      cardRef.current?.classList.add("shake");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setRisk((r) => Math.min(100, r + 18));
        setServerMsg("No se pudo iniciar sesión. Revisa tus datos.");
        cardRef.current?.classList.remove("shake");
        void cardRef.current?.offsetWidth;
        cardRef.current?.classList.add("shake");
        return;
      }

      setRisk(0);
      setServerMsg(null);

      if (soundOn) playSoftSuccessTone();

      router.push("/wallet");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const riskLabel = useMemo(() => {
    if (risk <= 0) return { t: "Protección activa", s: "Bajo" };
    if (risk < 40) return { t: "Protección activa", s: "Normal" };
    if (risk < 70) return { t: "Protección activa", s: "Elevado" };
    return { t: "Protección activa", s: "Alto" };
  }, [risk]);

  return (
    <div className="w-full max-w-[980px]">
      <div className="grid items-center gap-6 lg:grid-cols-[1.05fr_.95fr]">
        {/* LEFT: Card */}
        <div
          ref={cardRef}
          className="card-fade relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-8"
        >
          {/* top strip */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-cyan-400/40 via-emerald-400/40 to-red-500/40" />

          {/* logo centered */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/chido-logo.png"
              alt="Chido Casino"
              className="h-16 w-16 select-none drop-shadow-[0_0_18px_rgba(0,240,255,0.18)]"
              draggable={false}
            />
            <h1 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">
              Inicia sesión
            </h1>
            <p className="mt-1 text-sm text-white/65">
              Accede a tu wallet y depósitos en segundos.
            </p>
          </div>

          {/* controls row */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  risk < 40 ? "bg-emerald-400/90" : risk < 70 ? "bg-amber-300/90" : "bg-red-400/90"
                )}
              />
              <span className="font-semibold">{riskLabel.t}</span>
              <span className="text-white/50">·</span>
              <span>{riskLabel.s}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-[0.98]",
                  focusMode
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06]"
                )}
                aria-pressed={focusMode}
              >
                {focusMode ? "Modo Focus: ON" : "Modo Focus"}
              </button>

              <button
                type="button"
                onClick={() => setSoundOn((v) => !v)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-[0.98]",
                  soundOn
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06]"
                )}
                aria-pressed={soundOn}
                title="Sonido ultra sutil (opcional)"
              >
                Sonido {soundOn ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* form */}
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/75">Correo</label>
              <div
                className={cn(
                  "group relative rounded-2xl border bg-white/[0.03] px-4 py-3 transition",
                  emailError
                    ? "border-red-400/40 shadow-[0_0_0_3px_rgba(255,60,60,0.08)]"
                    : "border-white/10 focus-within:border-cyan-300/40 focus-within:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]"
                )}
              >
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
                <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 transition group-focus-within:opacity-100" />
              </div>
              <p className={cn("min-h-[18px] text-xs", emailError ? "text-red-300/90" : "text-white/45")}>
                {emailError || "Usa el correo con el que te registraste."}
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/75">Contraseña</label>
              <div
                className={cn(
                  "group relative rounded-2xl border bg-white/[0.03] px-4 py-3 transition",
                  passError
                    ? "border-red-400/40 shadow-[0_0_0_3px_rgba(255,60,60,0.08)]"
                    : "border-white/10 focus-within:border-cyan-300/40 focus-within:shadow-[0_0_0_3px_rgba(0,240,255,0.08)]"
                )}
              >
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
                <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 transition group-focus-within:opacity-100" />
              </div>
              <p className={cn("min-h-[18px] text-xs", passError ? "text-red-300/90" : "text-white/45")}>
                {passError || "Tu acceso es privado. Nosotros no guardamos tu contraseña."}
              </p>
            </div>

            {/* Server msg */}
            {serverMsg && (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {serverMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "relative w-full rounded-2xl px-4 py-3 font-black text-black shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition active:scale-[0.99]",
                canSubmit
                  ? "bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 hover:brightness-105"
                  : "cursor-not-allowed bg-white/10 text-white/40"
              )}
            >
              <span className={cn("inline-flex items-center justify-center gap-2")}>
                {loading ? <SoftSpinner /> : null}
                {loading ? "Entrando..." : "Entrar"}
              </span>

              {/* subtle glossy highlight */}
              <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 [background:radial-gradient(1200px_120px_at_50%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
            </button>

            <div className="flex items-center justify-between gap-4 pt-2 text-xs text-white/60">
              <span>
                ¿No tienes cuenta?{" "}
                <Link className="font-bold text-cyan-200 hover:text-cyan-100" href="/signup">
                  Regístrate
                </Link>
              </span>

              <span className="text-white/40">v0.1 · Auth + Wallet</span>
            </div>
          </form>
        </div>

        {/* RIGHT: Premium preview panel (no saturado) */}
        <div className="relative hidden lg:block">
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-white/85">Vista previa</div>
              <div className="text-xs text-white/45">Wallet</div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/55">Balance</div>
                <div className="text-xs text-white/45">MXN</div>
              </div>

              <div className="mt-2 text-3xl font-black tracking-tight">
                <span className="text-white/90">$</span>
                <span className="text-white">0.00</span>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[55%] animate-shimmer rounded-full bg-gradient-to-r from-cyan-300/70 via-emerald-300/70 to-cyan-300/70" />
              </div>

              <p className="mt-4 text-xs text-white/55">
                Depósitos acreditados vía webhook (Stripe → Supabase). Minimal, rápido, seguro.
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-bold text-white/70">Micro-feedback</div>
                <div className="mt-1 text-xs text-white/50">
                  Errores inline, sin alerts. Señales sutiles, UX premium.
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-bold text-white/70">Focus mode</div>
                <div className="mt-1 text-xs text-white/50">
                  Reduce brillos y animaciones automáticamente de noche.
                </div>
              </div>
            </div>
          </div>

          {/* halo behind panel */}
          <div className="pointer-events-none absolute -inset-10 -z-10 blur-3xl">
            <div className="h-full w-full animate-ambient-slow rounded-[40px] bg-[radial-gradient(circle_at_30%_20%,rgba(0,240,255,0.16),transparent_45%),radial-gradient(circle_at_70%_55%,rgba(0,255,140,0.12),transparent_50%),radial-gradient(circle_at_50%_85%,rgba(255,60,0,0.10),transparent_50%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}