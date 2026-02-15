import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { junoCreateClabe } from "@/lib/juno";

type Method = "spei" | "oxxo" | "card";

function folio() {
  return `CHIDO-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const method = (body?.method as Method) || "spei";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
    }

    // Por ahora solo SPEI manual/Bitso-Juno (oxxo/card quedan para después)
    if (method !== "spei") {
      return NextResponse.json(
        { ok: false, error: "Método no disponible todavía (solo SPEI por ahora)." },
        { status: 400 }
      );
    }

    const useJuno = ["juno", "bitso", "bitso_juno"].includes((process.env.PAYMENTS_PROVIDER || "").toLowerCase());

    const f = folio();
    const currency = "MXN" as const;

    let clabe = process.env.MANUAL_SPEI_CLABE || "";
    let beneficiary = process.env.MANUAL_SPEI_BENEFICIARY || "CHIDO CASINO";
    let institution = process.env.MANUAL_SPEI_INSTITUTION || "";
    const dimoPhone = process.env.MANUAL_SPEI_DIMO_PHONE || "";
    const telegramUsername = process.env.SUPPORT_TELEGRAM || "";
    const whatsappPhone = process.env.SUPPORT_WHATSAPP || "";

    if (useJuno) {
      // Bitso Business (Juno): CLABE única generada por API
      clabe = await junoCreateClabe();
      // Beneficiario/institución no vienen en "retrieve details"; dejamos un label claro:
      beneficiary = "Bitso Business (Juno)";
      institution = "SPEI";
    }

    if (!clabe) {
      return NextResponse.json(
        { ok: false, error: "SPEI no configurado (CLABE faltante)." },
        { status: 500 }
      );
    }

    const concept = f;

    const instructions = {
      title: useJuno ? "Depósito SPEI (Bitso Business)" : "Depósito SPEI",
      mode: "manual" as const,
      folio: f,
      amount,
      currency,
      spei: {
        clabe,
        beneficiary,
        institution: institution || null,
        concept,
        dimo_phone: dimoPhone || null,
      },
      steps: [
        "Haz una transferencia SPEI con la CLABE indicada.",
        `Usa el concepto exactamente como aparece: ${concept}`,
        "Conserva tu comprobante. Si el saldo no se refleja, soporte lo valida con tu folio.",
        useJuno ? "Nota: en Bitso/Juno el mínimo recomendado es 100 MXN." : " ",
      ].filter(Boolean),
      whatsapp: {
        ready: Boolean(whatsappPhone),
        phone: whatsappPhone || null,
        link: whatsappPhone ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Depósito CHIDO folio ${f}. Adj. comprobante.`)}` : null,
      },
      telegram: {
        ready: Boolean(telegramUsername),
        username: telegramUsername || null,
      },
    };

    const { data: row, error } = await supabaseAdmin
      .from("manual_deposit_requests")
      .insert({
        user_id: session.user.id,
        amount,
        currency,
        method: "spei",
        folio: f,
        status: "pending",
        instructions,
      })
      .select("id, folio, amount, currency, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      mode: "manual",
      message: "Depósito generado. Sigue las instrucciones.",
      instructions,
      request: row,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}