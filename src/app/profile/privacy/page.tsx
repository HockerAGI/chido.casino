"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type VisibilityState = {
  ok?: boolean;
  publicDisplayName?: string;
  leaderboardOptIn?: boolean;
  error?: string;
  message?: string;
};

export default function ProfilePrivacyPage() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/profile/public-visibility", { cache: "no-store" });
        const data = (await response.json()) as VisibilityState;
        if (!response.ok || !data.ok) throw new Error(data.message || data.error || "No se pudo cargar la configuración.");
        setName(data.publicDisplayName || "");
        setEnabled(Boolean(data.leaderboardOptIn));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile/public-visibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicDisplayName: name, leaderboardOptIn: enabled }),
      });
      const data = (await response.json()) as VisibilityState;
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "No se pudo guardar.");
      setName(data.publicDisplayName || "");
      setEnabled(Boolean(data.leaderboardOptIn));
      setMessage("Preferencias de privacidad guardadas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Card className="rounded-3xl border-white/10 bg-black/35 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 p-3 text-[#00F0FF]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Privacidad pública</h1>
            <p className="text-sm text-white/55">Tú decides si apareces en rankings y actividad pública.</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-white/60"><Loader2 className="animate-spin" size={16} /> Cargando…</div>
        ) : (
          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-widest text-white/50">Alias público</span>
              <Input
                className="mt-2"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={32}
                placeholder="Ej: ChidoPlayer77"
                disabled={!enabled}
              />
              <span className="mt-2 block text-xs text-white/40">No uses tu nombre legal, correo, teléfono ni datos de pago.</span>
            </label>

            <button
              type="button"
              onClick={() => setEnabled((value) => !value)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left"
            >
              <div>
                <div className="font-black text-white">Aparecer en leaderboard y feed de victorias</div>
                <div className="mt-1 text-xs text-white/45">Desactivado por defecto. Solo se mostrará el alias público.</div>
              </div>
              <div className={enabled ? "text-[#32CD32]" : "text-white/35"}>
                {enabled ? <Eye size={22} /> : <EyeOff size={22} />}
              </div>
            </button>

            {message ? <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{message}</div> : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={save} disabled={saving} className="font-black">
                {saving ? <><Loader2 className="animate-spin" size={16} /> Guardando…</> : "Guardar privacidad"}
              </Button>
              <Link href="/profile"><Button variant="secondary" className="font-black">Volver al perfil</Button></Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
