"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type KycRequest = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string | null;
  declared_date_of_birth: string | null;
  document_hashes: Record<string, string>;
  documents: {
    id_front: string | null;
    id_back: string | null;
    selfie: string | null;
  };
  profiles: {
    username: string | null;
    email: string | null;
    date_of_birth: string | null;
  } | null;
};

export default function AdminKycPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [verifiedDob, setVerifiedDob] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kyc/pending", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "KYC_PENDING_ERROR");
      }
      const items = (json.requests || []) as KycRequest[];
      setRequests(items);
      setVerifiedDob((current) => {
        const next = { ...current };
        for (const item of items) {
          if (!next[item.id] && item.declared_date_of_birth) {
            next[item.id] = item.declared_date_of_birth;
          }
        }
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "KYC_PENDING_ERROR");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const review = async (
    request: KycRequest,
    decision: "approved" | "rejected" | "review_required"
  ) => {
    const note = String(reason[request.id] || "").trim();
    const dob = String(verifiedDob[request.id] || "").trim();
    if (note.length < 3) {
      setError("Cada decisión requiere un motivo de al menos 3 caracteres.");
      return;
    }
    if (decision === "approved" && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError("La aprobación requiere una fecha de nacimiento verificada.");
      return;
    }

    setWorking(request.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/set-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kyc_request_id: request.id,
          decision,
          reason: note,
          verified_date_of_birth: decision === "approved" ? dob : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "KYC_REVIEW_FAILED");
      }
      await fetchRequests();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "KYC_REVIEW_FAILED");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Revisión KYC</h1>
            <p className="mt-1 text-sm text-white/55">
              Documentos privados con enlaces temporales de cinco minutos.
            </p>
          </div>
          <Button onClick={fetchRequests} disabled={loading} variant="secondary">
            {loading ? "Cargando…" : "Actualizar"}
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          {loading ? (
            <p className="p-6 text-center text-white/60">Cargando solicitudes…</p>
          ) : requests.length === 0 ? (
            <p className="p-6 text-center text-white/60">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {requests.map((request) => (
                <article key={request.id} className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_1.2fr]">
                  <div className="space-y-1">
                    <p className="font-bold">
                      {request.profiles?.username || "Sin alias"}
                    </p>
                    <p className="text-sm text-white/60">
                      {request.profiles?.email || "Sin correo"}
                    </p>
                    <p className="break-all font-mono text-xs text-white/40">
                      Solicitud: {request.id}
                    </p>
                    <p className="break-all font-mono text-xs text-white/40">
                      Usuario: {request.user_id}
                    </p>
                    <p className="text-xs text-white/40">
                      Enviada: {request.submitted_at ? new Date(request.submitted_at).toLocaleString() : "—"}
                    </p>
                    <p className="text-xs text-white/50">
                      Fecha declarada: {request.declared_date_of_birth || "—"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(request.documents).map(([key, url]) =>
                        url ? (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline">
                              {key === "id_front"
                                ? "Identificación frente"
                                : key === "id_back"
                                  ? "Identificación reverso"
                                  : "Selfie"}
                            </Button>
                          </a>
                        ) : null
                      )}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/45">
                      Hashes recibidos: {Object.keys(request.document_hashes || {}).length}/3
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-white/60">
                      Fecha de nacimiento verificada
                      <input
                        type="date"
                        value={verifiedDob[request.id] || ""}
                        onChange={(event) =>
                          setVerifiedDob((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <label className="block text-xs font-bold text-white/60">
                      Motivo de la decisión
                      <textarea
                        value={reason[request.id] || ""}
                        onChange={(event) =>
                          setReason((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                        placeholder="Describe la evidencia revisada y la razón."
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        disabled={working === request.id}
                        onClick={() => review(request, "rejected")}
                      >
                        Rechazar
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={working === request.id}
                        onClick={() => review(request, "review_required")}
                      >
                        Pedir revisión
                      </Button>
                      <Button
                        disabled={working === request.id}
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => review(request, "approved")}
                      >
                        Aprobar
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
