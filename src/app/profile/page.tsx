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
import { getPlayerLevel } from "@/lib/playerLevel";
import {
  UserCircle,
  Upload,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Wallet,
  Users,
  Gamepad2,
  History,
  TrendingUp,
  Copy,
  RefreshCw,
  KeyRound,
  Crown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type AffiliateMe = {
  ok: boolean;
  link?: string;
  affiliate?: { code: string; status: string; created_at?: string };
  stats?: { clicks: number; registrations: number; firstDeposits: number; totalCommission: number };
  recentCommissions?: {
    amount: number;
    status: string;
    reason: string;
    created_at: string | null;
    referred_user_id: string | null;
  }[];
  error?: string;
};

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

type HistoryRow = {
  id: string;
  game: "crash" | "taco_slot";
  bet: number;
  payout: number;
  profit: number;
  created_at: string;
  meta?: any;
};

function money(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const { profile, loading, refresh } = useProfile();
  const wallet = useWalletBalance();
  const level = useMemo(() => getPlayerLevel((profile as any)?.xp || 0), [profile]);

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [aff, setAff] = useState<AffiliateMe | null>(null);
  const [kycInfo, setKycInfo] = useState<KycStatus | null>(null);

  const [histLoading, setHistLoading] = useState(true);
  const [hist, setHist] = useState<HistoryRow[]>([]);

  useEffect(() => {
    setUsername((profile as any)?.username || "");
  }, [profile]);

  useEffect(() => {
    const loadAff = async () => {
      try {
        const res = await fetch("/api/affiliates/me", { cache: "no-store" });
        const json = (await res.json()) as AffiliateMe;
        if (json.ok) setAff(json);
        else setAff(json);
      } catch {
        setAff({ ok: false, error: "No se pudo cargar el programa de afiliados." });
      }
    };

    const loadKyc = async () => {
      try {
        const res = await fetch("/api/kyc/status", { cache: "no-store" });
        const json = (await res.json()) as KycStatus;
        setKycInfo(json);
      } catch {
        setKycInfo({ ok: false, error: "No se pudo cargar el estado KYC." });
      }
    };

    void loadAff();
    void loadKyc();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      setHistLoading(true);
      try {
        const res = await fetch("/api/profile/history", { cache: "no-store" });
        const json = await res.json();
        if (res.ok && json?.ok) setHist((json.combined || []) as HistoryRow[]);
        else setHist([]);
      } catch {
        setHist([]);
      } finally {
        setHistLoading(false);
      }
    };

    void loadHistory();
    const t = setInterval(loadHistory, 15000);
    return () => clearInterval(t);
  }, []);

  const kyc = String((profile as any)?.kyc_status || kycInfo?.kyc_status || "").toLowerCase();
  const kycLabel =
    kyc === "approved" || kyc === "verified"
      ? "Verificado"
      : kyc === "pending"
        ? "Pendiente de revisión"
        : kyc
          ? kyc
          : "Sin verificación";

  const saveUsername = async () => {
    if (!profile) return;

    const u = username.trim();
    if (u.length < 3) {
      setMsg("Tu alias debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: u, updated_at: new Date().toISOString() })
        .eq("user_id", (profile as any).user_id);

      if (error) throw error;

      setMsg("Alias actualizado.");
      await refresh();
      await wallet.refresh();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo guardar el alias.");
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
      setMsg("Avatar actualizado.");
      setAvatarFile(null);
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo subir el avatar.");
    } finally {
      setUploading(false);
    }
  };

  const resetPassword = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (!email) {
        setMsg("No encontramos tu correo, chale.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/forgot-password`,
      });

      if (error) throw error;
      setMsg("Te mandamos un correo pa' que resetees tu contraseña, sin rodeos.");
    } catch (e: any) {
      setMsg(e?.message || "No se pudo mandar el correo, intenta luego.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut().catch(() => {});
    location.href = "/login";
  };

  const profitSum = hist.slice(0, 20).reduce((s, x) => s + Number(x.profit || 0), 0);
  const affiliateLink = aff?.link || "";
  const affiliateCode = aff?.affiliate?.code || "";
  const totalCommission = Number(aff?.stats?.totalCommission || 0);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copiado, ya lo tienes.");
      setTimeout(() => setMsg(null), 1200);
    } catch {
      setMsg("No se pudo copiar, cópialo a mano.");
      setTimeout(() => setMsg(null), 1200);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white/60">Cargando tu perfil, un momentito carnal…</div>;
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center text-white/60">Primero necesitas entrar a tu cuenta, no te quedes afuera.</div>;
  }

  return (
    <div className="min-h-screen pb-24 max-w-6xl mx-auto px-4 md:px-6 pt-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-3xl md:text-4xl font-black text-white">Mi Perfil</div>
          <div className="text-white/60 text-sm mt-1">
            Aquí manejas tu cuenta, tu seguridad y tus movimientos, todo al tiro.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/wallet">
            <Button variant="secondary" className="font-black">
              <Wallet size={16} /> Wallet
            </Button>
          </Link>
          <Link href="/lobby">
            <Button variant="secondary" className="font-black">
              <Gamepad2 size={16} /> Lobby
            </Button>
          </Link>
          <Button variant="destructive" onClick={logout} className="font-black">
            <LogOut size={16} /> Salir
          </Button>
        </div>
      </div>

      {msg ? (
        <Card className="bg-black/30 border-white/10 p-4 rounded-2xl text-sm text-white/75">{msg}</Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-black/30 border-white/10 p-6 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <UserCircle />
            </div>
            <div>
              <div className="text-sm font-black text-white">Tu identidad</div>
              <div className="text-xs text-white/55">{kycLabel}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            <div className="relative w-28 h-28">
              <img
                src={(profile as any).avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${(profile as any).user_id}`}
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

            <div className="mt-4 text-xs text-white/55">Tu ID de jugador</div>
            <div className="font-mono text-xs text-white/75 break-all mt-1">{(profile as any).user_id}</div>

            <div className="mt-4 w-full">
              <div className="text-xs text-white/55 mb-2">Alias visible</div>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ej: El_Crack_77" />
              <Button onClick={saveUsername} disabled={saving} className="mt-3 w-full font-black">
                {saving ? "Guardando…" : "Guardar alias"}
              </Button>
            </div>

            {avatarFile ? (
              <Button onClick={doUploadAvatar} disabled={uploading} className="mt-3 w-full font-black" variant="secondary">
                {uploading ? "Subiendo…" : "Guardar avatar"}
              </Button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Nivel</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
                <Crown size={16} className="text-[#FFD700]" /> {level.level.label}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Estado KYC</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
                {kyc === "approved" || kyc === "verified" ? (
                  <CheckCircle2 size={16} className="text-[#32CD32]" />
                ) : (
                  <AlertTriangle size={16} className="text-[#FFD700]" />
                )}
                {kycLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Resetear contraseña</div>
              <Button onClick={resetPassword} className="mt-2 w-full font-black" variant="secondary">
                <KeyRound size={16} /> Mandar correo
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-black/30 border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-lg font-black text-white">
              <Wallet size={18} /> Resumen de tu wallet
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Saldo real</div>
                <div className="mt-1 text-2xl font-black text-white">{money(wallet.balance)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Bono</div>
                <div className="mt-1 text-2xl font-black text-[#FFD700]">{money(wallet.bonusBalance)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Procesando</div>
                <div className="mt-1 text-2xl font-black text-white/80">{money(wallet.lockedBalance)}</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <Link href="/wallet?tab=deposit">
                <Button className="font-black">
                  <Wallet size={16} /> Depositar
                </Button>
              </Link>
              <Link href="/wallet?tab=withdraw">
                <Button variant="secondary" className="font-black">
                  <TrendingUp size={16} /> Retirar
                </Button>
              </Link>
              <Button variant="outline" className="font-black" onClick={() => void wallet.refresh()}>
                <RefreshCw size={16} /> Actualizar
              </Button>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="bg-black/30 border-white/10 p-4 rounded-3xl">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">XP</div>
              <div className="mt-1 text-2xl font-black text-white">{Number((profile as any).xp || 0).toLocaleString("es-MX")}</div>
            </Card>
            <Card className="bg-black/30 border-white/10 p-4 rounded-3xl">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Ganancia reciente</div>
              <div className="mt-1 text-2xl font-black text-[#32CD32]">{money(profitSum)}</div>
            </Card>
            <Card className="bg-black/30 border-white/10 p-4 rounded-3xl">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Comisiones</div>
              <div className="mt-1 text-2xl font-black text-[#00F0FF]">{money(totalCommission)}</div>
            </Card>
          </div>

          <Card className="bg-black/30 border-white/10 p-6 rounded-3xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-lg font-black text-white">Afiliados</div>
                <div className="text-xs text-white/45">Tu enlace, tus registros y tus ganancias, todo bien clarito.</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {affiliateLink ? (
                  <Button variant="secondary" className="font-black" onClick={() => copy(affiliateLink)}>
                    <Copy size={16} /> Copiar enlace
                  </Button>
                ) : null}
                {totalCommission > 0 ? (
                  <Link href="/wallet?tab=withdraw&type=commission">
                    <Button className="font-black">
                      <TrendingUp size={16} /> Sacar comisiones
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Código</div>
                <div className="mt-1 text-lg font-black text-white font-mono">{affiliateCode || "—"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Estado</div>
                <div className="mt-1 text-lg font-black text-white capitalize">{aff?.affiliate?.status || "sin estado"}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-black">Tu enlace</div>
              <div className="mt-1 break-all text-sm text-white/85 font-mono">
                {affiliateLink || "Tu enlace de afiliado va a aparecer aquí cuando quede activo."}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/35 font-black">Clicks</div>
                <div className="mt-1 text-xl font-black text-white">{Number(aff?.stats?.clicks || 0)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/35 font-black">Registros</div>
                <div className="mt-1 text-xl font-black text-white">{Number(aff?.stats?.registrations || 0)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/35 font-black">Primeros depósitos</div>
                <div className="mt-1 text-xl font-black text-white">{Number(aff?.stats?.firstDeposits || 0)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/35 font-black">Comisión total</div>
                <div className="mt-1 text-xl font-black text-[#32CD32]">{money(totalCommission)}</div>
              </div>
            </div>
          </Card>

          <Card className="bg-black/30 border-white/10 p-6 rounded-3xl">
            <div className="text-lg font-black mb-3 text-white">Últimas comisiones</div>
            {aff?.recentCommissions && aff.recentCommissions.length > 0 ? (
              <div className="space-y-2">
                {aff.recentCommissions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl bg-black/30 border border-white/10 p-3">
                    <div>
                      <div className="text-sm font-bold text-white">{c.reason}</div>
                      <div className="text-xs text-white/50">
                        {c.created_at ? new Date(c.created_at).toLocaleString() : "—"} •{" "}
                        <span className="capitalize">{c.status}</span>
                      </div>
                    </div>
                    <div className="font-mono text-sm tabular-nums text-[#32CD32]">
                      +{Number(c.amount || 0).toFixed(2)} MXN
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/60">Aquí van a aparecer tus comisiones cuando tus referidos se avienten a jugar de verdad.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}