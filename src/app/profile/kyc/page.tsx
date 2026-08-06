"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";

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

export default function KycPage() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/kyc/status", { cache: "no-store" });
      const json = (await response.json()) as KycStatus;
      setStatus(json);
    } catch {
      setStatus({ ok: false, error: "KYC_STATUS_UNAVAILABLE" });
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const current = String(status?.kyc_status || status?.request?.status || "unverified").toLowerCase();
  const open = ["uploading", "pending", "review_required"].includes(current);
  const approved = current === "approved";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!front || !back || !selfie || !dateOfBirth) {
      setMessage("Fecha de nacimiento y tres documentos son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.set("date_of_birth", dateOfBirth);
      form.set("id_front", front);
      form.set("id_back", back);
      form.set("selfie", selfie);

      const response = await fetch("/api/kyc/submit", {
        method: "POST",
        body: form,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "KYC_SUBMIT_FAILED");
      }
      setMessage("Documentación enviada para revisión.");
      setFront(null);
      setBack(null);
      setSelfie(null);
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "KYC_SUBMIT_FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div>
        <h1 className="text-3xl font-black text-white">Verificación de identidad</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          La información se almacena en un bucket privado y se utiliza para validar identidad, mayoría de edad y controles KYC/AML. No habilita dinero real por sí sola.
        </p>
      </div>

      <Card className="rounded-3xl border-white/10 bg-black/30 p-6">
        <div className="flex items-start gap-3">
          {approved ? (
            <CheckCircle2 className="mt-0.5 text-[#32CD32]" />
          ) : open ? (
            <FileCheck2 className="mt-0.5 text-[#FFD700]" />
          ) : (
            <ShieldCheck className="mt-0.5 text-[#00F0FF]" />
          )}
          <div>
            <div className="font-black text-white">
              Estado: {approved ? "Aprobado" : open ? "En revisión" : current === "rejected" ? "Rechazado" : "Sin verificar"}
            </div>
            {status?.request?.review_note ? (
              <p className="mt-2 text-sm text-white/60">Nota: {status.request.review_note}</p>
            ) : null}
          </div>
        </div>
      </Card>

      {!approved && !open ? (
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-black/30 p-6">
          <label className="block text-sm font-bold text-white/70">
            Fecha de nacimiento
            <input
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white"
            />
          </label>

          {[
            ["Identificación oficial — frente", front, setFront],
            ["Identificación oficial — reverso", back, setBack],
            ["Selfie de verificación", selfie, setSelfie],
          ].map(([label, value, setter], index) => (
            <label key={String(label)} className="block text-sm font-bold text-white/70">
              {String(label)}
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                required
                onChange={(event) =>
                  (setter as React.Dispatch<React.SetStateAction<File | null>>)(
                    event.target.files?.[0] || null
                  )
                }
                className="mt-2 block w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white"
              />
              <span className="mt-1 block text-xs font-normal text-white/35">
                {value instanceof File ? value.name : "JPEG, PNG o PDF; máximo 8 MB."}
              </span>
            </label>
          ))}

          {message ? (
            <div className="flex gap-2 rounded-2xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-3 text-sm text-white/65">
              <AlertTriangle size={17} className="shrink-0 text-[#FFD700]" /> {message}
            </div>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full font-black">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            {loading ? "Enviando…" : "Enviar documentación"}
          </Button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/profile">
          <Button variant="secondary">Volver a mi cuenta</Button>
        </Link>
        <Link href="/privacy">
          <Button variant="outline">Aviso de privacidad</Button>
        </Link>
      </div>
    </div>
  );
}
