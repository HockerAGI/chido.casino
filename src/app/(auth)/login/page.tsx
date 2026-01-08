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
                  risk < 40 ? "bg-emerald-400/90" : risk < 70 ? "bg-amber-300/90" : "