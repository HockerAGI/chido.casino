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

function SoftSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/90"
      aria-hidden="true"
    />
  );
}

function playSoftSuccessTone() {
  try {
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 520;
    g.gain.value = 0.00001;
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
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  // Riesgo visual (fintech style)
  const [risk, setRisk] = useState(0);

  // Focus / sonido
  const [focusMode, setFocusMode] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Escribe tu correo.";
    if (!isValidEmail(email)) return "Correo inválido.";
    return "";
  }, [email, touched.email]);

  const passError = useMemo(() => {
    if (!touched.password) return "";
    if (!password) return "Escribe tu contraseña.";
    if (password.length < 6) return "Mínimo 6 caracteres.";
    return "";
  }, [password, touched.password]);

  const canSubmit =
    isValidEmail(email) && password.length >= 6 && !loading;

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 22 || h <= 6) setFocusMode(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.low = focusMode ? "true" : "false";
  }, [focusMode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerMsg(null);
    setTouched({ email: true, password: true });

    if (!canSubmit) {
      cardRef.current?.classList.remove("shake");
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
        setRisk((r) => Math.min(100, r + 20));
        setServerMsg("No se pudo iniciar sesión.");
        cardRef.current?.classList.remove("shake");
        void cardRef.current?.offsetWidth;
        cardRef.current?.classList.add("shake");
        return;
      }

      setRisk(0);
      if (soundOn) playSoftSuccessTone();
      router.push("/wallet");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const riskLabel =
    risk < 40 ? "Normal" : risk < 70 ? "Elevado" : "Alto";

  return (
    <div className="w-full max-w-[520px]">
      <div
        ref={cardRef}
        className="card-fade relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,.55)]"
      >
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-cyan-400/40 via-emerald-400/40 to-red-500/40" />

        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/chido-logo.png"
            alt="Chido Casino"
            className="h-16 w-16 drop-shadow-[0_0_18px_rgba(0,240,255,.18)]"
          />
          <h1 className="mt-4 text-2xl font-black">Inicia sesión</h1>
          <p className="mt-1 text-sm text-white/65">
            Accede a tu wallet en segundos.
          </p>
        </div>

        {/* Status */}
        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Protección activa ·{" "}
            <b className="ml-1">{riskLabel}</b>
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setFocusMode((v) => !v)}
              className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10"
            >
              Focus
            </button>
            <button
              onClick={() => setSoundOn((v) => !v)}
              className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10"
            >
              🔊
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={cn(
                "w-full rounded-2xl border bg-white/5 px-4 py-3 outline-none",
                emailError
                  ? "border-red-400/40"
                  : "border-white/10 focus:border-cyan-400/40"
              )}
            />
            <p className="mt-1 text-xs text-red-300">
              {emailError}
            </p>
          </div>

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className={cn(
                "w-full rounded-2xl border bg-white/5 px-4 py-3 outline-none",
                passError
                  ? "border-red-400/40"
                  : "border-white/10 focus:border-cyan-400/40"
              )}
            />
            <p className="mt-1 text-xs text-red-300">
              {passError}
            </p>
          </div>

          {serverMsg && (
            <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm">
              {serverMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "w-full rounded-2xl py-3 font-black transition",
              canSubmit
                ? "bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 text-black"
                : "bg-white/10 text-white/40"
            )}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <SoftSpinner /> Entrando…
              </span>
            ) : (
              "Entrar"
            )}
          </button>

          <div className="flex justify-between text-xs text-white/60">
            <Link href="/signup" className="font-bold text-cyan-200">
              Crear cuenta
            </Link>
            <span>v0.1</span>
          </div>
        </form>
      </div>
    </div>
  );
}