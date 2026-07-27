export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "@/lib/session";
import { junoCreateClabe } from "@/lib/juno";
import { getSelfExclusionState } from "@/lib/responsibleGaming";
import { fraudLog, velocityLimit } from "@/lib/fraud";
import { createCheckoutPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";

type Method = "spei" | "oxxo" | "card" | "mercadopago";

function folio() {
  return `CHIDO-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`;
}

function folioMP() {
  return `CHDMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

    // Self-exclusion: block deposits
    const ex = await getSelfExclusionState(supabaseAdmin as any, session.user.id);
    if (ex.ok && ex.excluded) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELF_EXCLUDED",
          message: "Autoexclusión activa. No puedes depositar por ahora.",
          until: ex.until,
        },
        { status: 403 }
      );
    }

    // Anti-spam deposits: 5 in 30 min
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

    // ========================================
    // MERCADO PAGO (Card / SPEI / OXXO via MP)
    // ========================================
    if (method === "card" || method === "mercadopago") {
      if (!isMercadoPagoConfigured()) {
        return NextResponse.json(
          { ok: false, error: "Mercado Pago no está configurado todavía." },
          { status: 503 }
          );
      }

      if (amount < 20) {
        return NextResponse.json(
          { ok: false, error: "El depósito mínimo es de $20 MXN." },
          { status: 400 }
        );
      }
      if (amount > 50000) {
        return NextResponse.json(
          { ok: false, error: "El depósito máximo es de $50,000 MXN por transacción." },
          { status: 400 }
        );
      }

      const f = folioMP();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chido.casino";
      const notificationUrl = `${siteUrl}/api/webhooks/mercadopago`;

      const pref = await createCheckoutPreference({
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        amount,
        concept: f,
        notificationUrl,
      });

      if (!pref.ok) {
        return NextResponse.json({ ok: false, error: pref.error }, { status: 500 });
      }

      // Record the deposit intent
      const { error: insErr } = await supabaseAdmin.from("deposit_intents").insert({
        user_id: session.user.id,
        provider: "mercadopago",
        method: "card",
        amount,
        currency: "MXN",
        status: "pending",
        intent_id: f,
        external_id: pref.preferenceId ?? null,
        checkout_url: pref.initPoint || pref.sandboxInitPoint || null,
        metadata: {
          folio: f,
          preference_id: pref.preferenceId,
          provider: "mercadopago",
        },
      } as any);

      if (insErr) {
        console.error("Failed to record Mercado Pago deposit intent:", insErr);
      }

      await fraudLog(supabaseAdmin as any, req, {
        userId: session.user.id,
        eventType: "mp_deposit_created",
        metadata: { folio: f, amount, preference_id: pref.preferenceId },
      });

      return NextResponse.json({
        ok: true,
        mode: "mercadopago",
        message: "¡Listo! Te mandamos al checkout de Mercado Pago.",
        preferenceId: pref.preferenceId,
        initPoint: pref.initPoint,
        sandboxInitPoint: pref.sandboxInitPoint,
        folio: f,
      });
    }

    // ========================================
    // OXXO (cash deposit via SPEI/manual)
    // ========================================
    if (method === "oxxo") {
      // OXXO is a cash payment method — we create a manual deposit request
      // with instructions to go to an OXXO store with a reference code.
      // For production, this would be integrated with a provider that generates
      // OXXO barcodes. For now, we create a manual request with OXXO instructions.
      const f = folio();
      const oxxoReference = `OXXO${Date.now().toString().slice(-10)}`;

      const instructions = {
        title: "Depósito en OXXO",
        mode: "manual" as const,
        folio: f,
        amount,
        currency: "MXN",
        oxxo: {
          reference: oxxoReference,
          concept: f,
        },
        steps: [
          "Acércate a la tienda OXXO más cercana.",
          `Dile al cajero que quieres hacer un pago de servicio con la referencia: ${oxxoReference}`,
          `Indica el monto exacto: $${amount} MXN`,
          "Conserva tu comprobante. El saldo se acredita en cuanto se procese el pago.",
        ],
      };

      const { data: row, error } = await supabaseAdmin
        .from("manual_deposit_requests")
        .insert({
          user_id: session.user.id,
          amount,
          currency: "MXN",
          method: "oxxo",
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
        eventType: "oxxo_deposit_created",
        metadata: { folio: f, amount, reference: oxxoReference },
      });

      return NextResponse.json({
        ok: true,
        mode: "oxxo",
        message: "Depósito OXXO generado. Sigue las instrucciones.",
        instructions,
        request: row,
      });
    }

    // ========================================
    // SPEI (bank transfer — manual or Juno)
    // ========================================
    const useJuno = ["juno", "bitso", "bitso_juno"].includes(
      (process.env.PAYMENTS_PROVIDER || "").toLowerCase()
    );

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
      return NextResponse.json(
        { ok: false, error: "SPEI no está configurado (falta la CLABE)." },
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
      ],
      whatsapp: {
        ready: Boolean(whatsappPhone),
        phone: whatsappPhone || null,
        link: whatsappPhone
          ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Depósito CHIDO folio ${f}. Adj. comprobante.`
            )}`
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
