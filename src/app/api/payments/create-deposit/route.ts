import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { junoCreateClabe } from "@/lib/juno";
import { getSelfExclusionState } from "@/lib/responsibleGaming";
import { fraudLog, velocityLimit } from "@/lib/fraud";

type Method = "spei" | "oxxo" | "card";

function folio() {
  return `CHIDO-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    // ✅ Autoexclusión: bloquea generar depósitos
    const ex = await getSelfExclusionState(supabaseAdmin as any, session.user.id);
    if (ex.ok && ex.excluded) {
      return NextResponse.json(
        { ok: false, error: "SELF_EXCLUDED", message: "Autoexclusión activa. No puedes depositar por ahora.", until: ex.until },
        { status: 403 }
      );
    }

    // ✅ Anti-spam depósitos: 5 en 30 min
    const lim = await velocityLimit(supabaseAdmin as any, "manual_deposit_requests", {
      userId: session.user.id,
      minutes: 30,
      max: 5,
    });
    if (!lim.ok) {
      return NextResponse.json({ ok: false, error: "RATE_LIMIT", message: lim.error }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const method = (body?.method as Method) || "spei";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
    }

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
      clabe = await junoCreateClabe();
      beneficiary = "Bitso Business (Juno)";
      institution = "SPEI";
    }

    if (!clabe) {
      return NextResponse.json({ ok: false, error: "SPEI no configurado (CLABE faltante)." }, { status: 500 });
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
      ],
      whatsapp: {
        ready: Boolean(whatsappPhone),
        phone: whatsappPhone || null,
        link: whatsappPhone
          ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Depósito CHIDO folio ${f}. Adj. comprobante.`)}`
          : null,
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

    await fraudLog(supabaseAdmin as any, req, {
      userId: session.user.id,
      eventType: "deposit_request_created",
      metadata: { folio: f, amount, provider: useJuno ? "juno" : "manual" },
    });

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