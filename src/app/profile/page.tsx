"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/useProfile";
import { useWalletBalance } from "@/lib/useWalletBalance";
import { uploadAvatar } from "@/lib/uploadAvatar";
import { createClient } from "@/lib/supabaseClient";
import { UserCircle, Upload, ShieldCheck, ShieldAlert, LogOut, KeyRound, Wallet, Users } from "lucide-react";

type AffiliateMe = {
  ok: boolean;
  link?: string;
  affiliate?: { code: string };
};

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const { profile, loading, refresh } = useProfile();
  const wallet = useWalletBalance();

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  const [aff, setAff] = useState<AffiliateMe | null>(null);

  useEffect(() => {
    setUsername(profile?.username || "");
  }, [profile?.username]);

  useEffect(() => {
    const loadAff = async () => {
      try {
        const res = await fetch("/api/affiliates/me", { cache: "no-store" });
        const json = (await res.json()) as AffiliateMe;
        if (json.ok) setAff(json);
      } catch {
        // ignore
      }
    };
    void loadAff();
  }, []);

  const kyc = String(profile?.kyc_status || "").toLowerCase();
  const kycLabel =
    kyc === "approved" || kyc === "verified" ? "KYC aprobado" : kyc ? `KYC: ${kyc}` : "KYC pendiente";

  const saveUsername = async () => {
    if (!profile) return;
    const u = username.trim();
    if (u.length < 3) {
      setMsg("El username debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("profiles").update({ username: u }).eq("user_id", profile.user_id);
      if (error) throw error;
      setMsg("Perfil actualizado ✅");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const doUploadAvatar = async () => {
    if (!avatarFile) return;
    setUploading(true);
    setMsg(null);
    try {
      await uploadAvatar(avatarFile);
      setMsg("Avatar actualizado ✅");
      setAvatarFile(null);
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo subir.");
    } finally {
      setUploading(false);
    }
  };

  const resetPassword = async () => {
    setMsg(null);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (!email) {
        setMsg("No se detectó tu correo. Re-inicia sesión.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/login`,
      });
      if (error) throw error;
      setMsg("Te mandé un correo para cambiar tu contraseña ✅");
    } catch (e: any) {
      setMsg(e?.message || "No se pudo enviar el correo.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut().catch(() => {});
    location.href = "/login";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white/60">Cargando perfil…</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/60">
        Necesitas iniciar sesión.
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-5xl mx-auto px-6 pt-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-3xl font-black">Mi perfil</div>
          <div className="text-white/60 text-sm">Cuenta, seguridad y estado de verificación.</div>
        </div>

        <div className="flex gap-2">
          <Link href="/wallet">
            <Button variant="secondary" className="font-black">
              <Wallet size={16} /> Bóveda
            </Button>
          </Link>
          <Button variant="destructive" onClick={logout} className="font-black">
            <LogOut size={16} /> Salir
          </Button>
        </div>
      </div>

      {msg ? (
        <Card className="bg-black/30 border-white/10 p-4 rounded-2xl text-sm text-white/75">
          {msg}
        </Card>
      ) : null}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Identidad */}
        <Card className="bg-black/30 border-white/10 p-6 rounded-3xl md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <UserCircle />
            </div>
            <div>
              <div className="text-sm font-black">Identidad</div>
              <div className="text-xs text-white/55">{kycLabel}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center text-center">
            <div className="relative w-28 h-28">
              <img
                src={profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.user_id}`}
                className="w-full h-full rounded-full border border-white/10 bg-black/40 object-cover"
                alt="Avatar"
              />
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-[#00F0FF] text-black p-2 border border-white/10">
                <Upload size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="mt-4 text-xs text-white/55">User ID</div>
            <div className="font-mono text-xs text-white/75 break-all">{profile.user_id}</div>

            {avatarFile ? (
              <Button onClick={doUploadAvatar} disabled={uploading} className="mt-4 w-full font-black">
                {uploading ? "Subiendo…" : "Guardar avatar"}
              </Button>
            ) : null}

            <div className="mt-5 w-full">
              <div className="text-xs text-white/55 mb-2">Username</div>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              <Button onClick={saveUsername} disabled={saving} className="mt-3 w-full font-black">
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>

            <div className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
              {kyc === "approved" || kyc === "verified" ? (
                <div className="flex items-start gap-2 text-xs text-white/75">
                  <ShieldCheck size={16} className="text-[#32CD32] mt-0.5" />
                  KYC aprobado. Puedes solicitar retiros.
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs text-white/75">
                  <ShieldAlert size={16} className="text-[#FFD700] mt-0.5" />
                  Para retirar necesitas KYC aprobado. Pídelo en <Link className="underline" href="/support">Soporte</Link>.
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Wallet resumen */}
        <Card className="bg-black/30 border-white/10 p-6 rounded-3xl md:col-span-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-black">Bóveda</div>
              <div className="text-xs text-white/55">Saldo real, bono y bloqueado.</div>
            </div>
            <Link href="/wallet">
              <Button variant="secondary" className="font-black">Abrir bóveda</Button>
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/55">Saldo real</div>
              <div className="mt-1 text-lg font-black tabular-nums">{wallet.formatted}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/55">Bono</div>
              <div className="mt-1 text-lg font-black tabular-nums text-[#FF0099]">{wallet.formattedBonus}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/55">Bloqueado</div>
              <div className="mt-1 text-lg font-black tabular-nums text-white/70">{wallet.formattedLocked}</div>
            </div>
          </div>

          {/* Afiliados */}
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <div className="font-black">Afiliados</div>
              </div>
              <Link href="/affiliates">
                <Button variant="secondary" className="font-black">Ver panel</Button>
              </Link>
            </div>

            <div className="mt-3 text-sm text-white/65">
              {aff?.ok && aff.link ? (
                <>
                  Tu link: <span className="font-mono text-white/80 break-all">{aff.link}</span>
                </>
              ) : (
                "Tu link se genera en el panel de afiliados."
              )}
            </div>
          </div>

          {/* Seguridad */}
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-center gap-2">
              <KeyRound size={18} />
              <div className="font-black">Seguridad</div>
            </div>
            <div className="mt-2 text-sm text-white/65">
              Si quieres cambiar tu contraseña, te mandamos un correo de recuperación.
            </div>
            <Button onClick={resetPassword} className="mt-4 font-black">
              Enviar correo para cambiar contraseña
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}