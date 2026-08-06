"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/useProfile";
import { createClient } from "@/lib/supabaseClient";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

type KycStatus = {
  ok: boolean;
  kyc_status?: string | null;
  request?: {
    id: string;
    status: string;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    review_note?: string | null;
  } | null;
  error?: string;
};

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const { profile, loading, refresh } = useProfile();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [kycInfo, setKycInfo] = useState<KycStatus | null>(null);

  useEffect(() => {
    setUsername(String((profile as any)?.username || ""));
  }, [profile]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/kyc/status", { cache: "no-store" });
        setKycInfo((await response.json()) as KycStatus);
      } catch {
        setKycInfo({ ok: false, error: "KYC_STATUS_UNAVAILABLE" });
      }
    };
    void load();
  }, []);

  const kyc = String(
    (profile as any)?.kyc_status ||
      kycInfo?.kyc_status ||
      kycInfo?.request?.status ||
      "unverified"
  ).toLowerCase();
  const approved = kyc === "approved";
  const pending = ["uploading", "pending", "review_required"].includes(kyc);

  const saveUsername = async () => {
    if (!profile) return;
    const value = username.trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(value)) {
      setMessage("El alias debe tener entre 3 y 24 caracteres alfanuméricos o guion bajo.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: value, updated_at: new Date().toISOString() })
        .eq("user_id", (profile as any).user_id);
      if (error) throw error;
      await refresh();
      setMessage("Alias actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    setMessage(null);
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      setMessage("No se encontró el correo autenticado.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/forgot-password`,
    });
    setMessage(error ? error.message : "Se envió el correo para cambiar la contraseña.");
  };

  const logout = async () => {
    await supabase.auth.signOut().catch(() => null);
    location.href = "/login";
  };

  if (loading) {
    return <div className="py-20 text-center text-white/55">Cargando cuenta…</div>;
  }
  if (!profile) {
    return <div className="py-20 text-center text-white/55">Inicia sesión para administrar tu cuenta.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Mi cuenta</h1>
          <p className="mt-2 text-sm text-white/55">
            Entorno prelaunch. Depósitos, apuestas con dinero real y premios monetarios permanecen deshabilitados.
          </p>
        </div>
        <Button variant="destructive" onClick={logout}>
          <LogOut size={16} /> Cerrar sesión
        </Button>
      </div>

      {message ? (
        <Card className="rounded-2xl border-white/10 bg-black/30 p-4 text-sm text-white/70">
          {message}
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-black/30 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <UserCircle />
            </div>
            <div>
              <div className="font-black text-white">Identidad de cuenta</div>
              <div className="text-xs text-white/45">{String((profile as any).email || "")}</div>
            </div>
          </div>

          <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-white/45">
            Alias visible
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2"
              placeholder="alias_usuario"
            />
          </label>
          <Button className="mt-3 w-full" disabled={saving} onClick={saveUsername}>
            <Save size={16} /> {saving ? "Guardando…" : "Guardar alias"}
          </Button>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/35">
              ID interno
            </div>
            <div className="mt-1 break-all font-mono text-xs text-white/65">
              {String((profile as any).user_id || "")}
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-black/30 p-6">
          <div className="flex items-start gap-3">
            {approved ? (
              <CheckCircle2 className="mt-0.5 text-[#32CD32]" />
            ) : pending ? (
              <AlertTriangle className="mt-0.5 text-[#FFD700]" />
            ) : (
              <ShieldCheck className="mt-0.5 text-[#00F0FF]" />
            )}
            <div>
              <div className="font-black text-white">Verificación KYC</div>
              <div className="mt-1 text-sm text-white/55">
                {approved
                  ? "Identidad y mayoría de edad verificadas."
                  : pending
                    ? "La solicitud está en revisión."
                    : kyc === "rejected"
                      ? "La solicitud fue rechazada; revisa la nota y vuelve a enviar."
                      : "Debes completar la verificación documental."}
              </div>
            </div>
          </div>

          {kycInfo?.request?.review_note ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              {kycInfo.request.review_note}
            </div>
          ) : null}

          <Link href="/profile/kyc" className="mt-5 block">
            <Button className="w-full" variant={approved ? "secondary" : "default"}>
              <ShieldCheck size={16} /> {approved ? "Ver estado KYC" : "Completar KYC"}
            </Button>
          </Link>

          <Button onClick={resetPassword} className="mt-3 w-full" variant="outline">
            <KeyRound size={16} /> Cambiar contraseña
          </Button>
        </Card>
      </div>

      <Card className="rounded-3xl border-[#00F0FF]/20 bg-[#00F0FF]/5 p-5 text-sm leading-relaxed text-white/60">
        Completar KYC no activa operaciones con dinero real. La habilitación productiva requiere licencia, aprobación del proveedor, controles AML, juego responsable y autorización ejecutiva de release.
      </Card>
    </div>
  );
}
