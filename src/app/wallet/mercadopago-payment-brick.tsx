"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { safeJson } from "@/lib/safeJson";

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
let sdkPromise: Promise<void> | null = null;

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, any>) => any;
  }
}

type ProcessPaymentResponse = {
  ok: boolean;
  error?: string;
  status?: string;
  statusDetail?: string;
  paymentId?: string;
  redirectUrl?: string;
  credited?: boolean;
};

type MercadoPagoPaymentBrickProps = {
  amount: number;
  folio: string;
  preferenceId: string;
  fallbackUrl?: string | null;
  onDone: (message: string) => void;
  onError: (message: string) => void;
};

function loadMercadoPagoSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("WINDOW_UNAVAILABLE"));
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("SDK_LOAD_FAILED")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("SDK_LOAD_FAILED"));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

function statusMessage(status?: string, credited?: boolean) {
  const s = String(status || "").toLowerCase();
  if (credited || s === "approved") return "Deposito aprobado. Tu saldo se esta actualizando.";
  if (s === "pending" || s === "in_process") return "Pago recibido. Quedara acreditado cuando Mercado Pago lo apruebe.";
  if (s === "rejected") return "Mercado Pago rechazo el pago. Puedes intentar con otro metodo.";
  return "Pago enviado a Mercado Pago.";
}

export default function MercadoPagoPaymentBrick({
  amount,
  folio,
  preferenceId,
  fallbackUrl,
  onDone,
  onError,
}: MercadoPagoPaymentBrickProps) {
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
  const containerId = useMemo(() => `mp-payment-brick-${Math.random().toString(36).slice(2)}`, []);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
  }, [onDone, onError]);

  useEffect(() => {
    let disposed = false;
    let controller: any = null;

    async function renderBrick() {
      setLoading(true);
      setReady(false);

      if (!publicKey) {
        onErrorRef.current("Mercado Pago no tiene Public Key configurada.");
        setLoading(false);
        return;
      }

      try {
        await loadMercadoPagoSdk();
        if (disposed || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: "es-MX" });
        const bricksBuilder = mp.bricks();

        controller = await bricksBuilder.create("payment", containerId, {
          initialization: {
            amount,
            preferenceId,
          },
          customization: {
            visual: {
              style: {
                theme: "dark",
              },
            },
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              prepaidCard: "all",
              bankTransfer: "all",
              ticket: "all",
              mercadoPago: "all",
            },
          },
          callbacks: {
            onReady: () => {
              if (!disposed) {
                setReady(true);
                setLoading(false);
              }
            },
            onSubmit: ({ selectedPaymentMethod, formData }: any) =>
              new Promise<void>(async (resolve, reject) => {
                try {
                  const res = await fetch("/api/payments/mercadopago/process-payment", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      folio,
                      preferenceId,
                      selectedPaymentMethod,
                      formData,
                    }),
                  });

                  const data = await safeJson<ProcessPaymentResponse>(res);
                  if (!res.ok || !data.ok) {
                    throw new Error(data.error || "Mercado Pago no pudo procesar el pago.");
                  }

                  if (data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                    resolve();
                    return;
                  }

                  onDoneRef.current(statusMessage(data.status, data.credited));
                  resolve();
                } catch (e: any) {
                  onErrorRef.current(e?.message || "Mercado Pago no pudo procesar el pago.");
                  reject(e);
                }
              }),
            onError: (error: any) => {
              console.error("Mercado Pago Payment Brick error:", error);
              onErrorRef.current("Mercado Pago no pudo cargar el formulario.");
            },
          },
        });
      } catch (e: any) {
        if (!disposed) {
          setLoading(false);
          onErrorRef.current(
            fallbackUrl
              ? "No se pudo cargar el formulario de Mercado Pago. Puedes usar la redireccion."
              : e?.message || "No se pudo cargar Mercado Pago."
          );
        }
      }
    }

    void renderBrick();

    return () => {
      disposed = true;
      try {
        controller?.unmount?.();
        controller?.destroy?.();
      } catch {
        // Best effort cleanup for Mercado Pago SDK iframe/controller internals.
      }
      const node = document.getElementById(containerId);
      if (node) node.innerHTML = "";
    };
  }, [amount, containerId, fallbackUrl, folio, preferenceId, publicKey]);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando Mercado Pago...
        </div>
      )}
      <div id={containerId} className={ready ? "block" : "min-h-0"} />
      {fallbackUrl && (
        <button
          type="button"
          onClick={() => {
            window.location.href = fallbackUrl;
          }}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black text-white/70 transition hover:bg-white/10"
        >
          Usar checkout externo
        </button>
      )}
    </div>
  );
}
