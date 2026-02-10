import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  amount: number;
  currency?: string;
  method?: string; // spei|oxxo|card...
  mode?: "astropay" | "manual";
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D+/g, "");
}

function buildManualInstructions(params: {
  folio: string;
  amount: number;
  currency: string;
  email?: string | null;
}) {
  const clabe = process.env.MANUAL_SPEI_CLABE || "";
  const beneficiary = process.env.MANUAL_SPEI_BENEFICIARY || "";
  const institution = process.env.MANUAL_SPEI_INSTITUTION || "";
  const dimo = process.env.MANUAL_SPEI_DIMO_PHONE || "";

  const waPhone = onlyDigits(process.env.SUPPORT_WHATSAPP_PHONE || "6642368701");
  const waE164 = `52${waPhone}`;

  const msg = [
    "CHIDO CASINO | Depósito Manual (SPEI)",
    `Folio: ${params.folio}`,
    `Monto: $${params.amount} ${params.currency}`,
    params.email ? `Correo: ${params.email}` : "",
    "",
    "Adjunto captura del SPEI pa’ que me lo activen 🙏",
  ]
    .filter(Boolean)
    .join("\n");

  const waLink = `https://wa.me/${waE164}?text=${encodeURIComponent(msg)}`;

  return {
    mode: "manual_spei",
    title: "Depósito Manual (SPEI) — en corto y sin broncas",
    folio: params.folio,
    amount: params.amount,
    currency: params.currency,
    spei: {
      clabe,
      beneficiary,
      institution,
      dimo_phone: dimo || null,
      concept: params.folio,
    },
    steps: [
      "Haz un SPEI con el monto exacto.",
      `En “Concepto / Referencia” pon: ${params.folio}`,
      "Toma captura del comprobante.",
      "Mándala por WhatsApp (botón) y te lo acreditamos.",
    ],
    whatsapp: {
      phone: waPhone,
      link: waLink,
    },
    telegram: {
      ready: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_SUPPORT_CHAT_ID),
    },
  };
}

// Stub (AstroPay real lo conectamos cuando te den docs/credenciales)
async function createAstroPayDepositStub(_: {
  amount: number;
  currency: string;
  method: string;
  userId: string;
}) {
  return {
    ok: false as const,
    error: "AstroPay aún no está activado. Usa Manual por ahora.",
  };
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ ok: false, error: "No hay sesión." }, { status: 401 });
    }

    const user = authData.user;

    const body = (await request.json()) as Partial<Body>;
    const amount = Number(body.amount);
    const currency = (body.currency || "MXN").toUpperCase();
    const method = (body.method || "spei").toLowerCase();
    const mode = body.mode;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Monto inválido." }, { status: 400 });
    }

    const hasAstroPay = Boolean(process.env.ASTROPAY_API_KEY && process.env.ASTROPAY_BASE_URL);

    // 1) Si piden manual o no hay AstroPay => manual directo
    if (mode === "manual" || !hasAstroPay) {
      const { data: reqRow, error: insErr } = await supabaseAdmin
        .from("manual_deposit_requests")
        .insert({
          user_id: user.id,
          amount,
          currency,
          method: "spei",
          status: "pending",
          instructions: {
            channel: "whatsapp",
            want: "capture",
          },
        })
        .select("folio, amount, currency, status, created_at")
        .single();

      if (insErr || !reqRow) {
        return NextResponse.json(
          { ok: false, error: insErr?.message || "No se pudo generar folio." },
          { status: 500 }
        );
      }

      const instructions = buildManualInstructions({
        folio: reqRow.folio,
        amount: reqRow.amount,
        currency: reqRow.currency,
        email: user.email,
      });

      return NextResponse.json({
        ok: true,
        mode: "manual",
        message: "Listo: folio generado. Manda tu captura y te lo activamos.",
        instructions,
        request: reqRow,
      });
    }

    // 2) AstroPay “ready-to-plug”: si falla, cae a manual
    const astro = await createAstroPayDepositStub({
      amount,
      currency,
      method,
      userId: user.id,
    });

    if (astro.ok) {
      return NextResponse.json(astro);
    }

    // fallback manual (por si astro “no está listo”)
    const { data: reqRow, error: insErr } = await supabaseAdmin
      .from("manual_deposit_requests")
      .insert({
        user_id: user.id,
        amount,
        currency,
        method: "spei",
        status: "pending",
        instructions: {
          fallback_from: "astropay",
          channel: "whatsapp",
          want: "capture",
        },
      })
      .select("folio, amount, currency, status, created_at")
      .single();

    if (insErr || !reqRow) {
      return NextResponse.json(
        { ok: false, error: insErr?.message || astro.error || "No se armó." },
        { status: 500 }
      );
    }

    const instructions = buildManualInstructions({
      folio: reqRow.folio,
      amount: reqRow.amount,
      currency: reqRow.currency,
      email: user.email,
    });

    return NextResponse.json({
      ok: true,
      mode: "manual",
      message: astro.error || "AstroPay no está activo; te lo dejé en Manual.",
      instructions,
      request: reqRow,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno." }, { status: 500 });
  }
}