import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const codeRaw = String(body?.code ?? body?.slug ?? "").trim();
  const slug = codeRaw.toLowerCase();

  if (!slug) {
    return NextResponse.json({ error: "Falta el código (slug)" }, { status: 400 });
  }

  // Validar oferta (RLS solo devuelve ofertas activas en ventana)
  const { data: offer, error: offerErr } = await supabase
    .from("promo_offers")
    .select(
      "id, slug, title, description, min_deposit, bonus_percent, max_bonus, free_rounds, wagering_multiplier, ends_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (offerErr) return NextResponse.json({ error: offerErr.message }, { status: 500 });
  if (!offer) {
    return NextResponse.json({ error: "Código inválido o promo no disponible" }, { status: 404 });
  }

  // Regla simple: 1 promo activa por usuario.
  const { data: existingActive, error: existErr } = await supabaseAdmin
    .from("promo_claims")
    .select("id, offer_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "applied"])
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existErr) return NextResponse.json({ error: existErr.message }, { status: 500 });

  if (existingActive?.status === "active") {
    return NextResponse.json(
      {
        ok: true,
        message:
          "Ya tienes una promo activa. Úsala con tu próximo depósito y después activas otra.",
      },
      { status: 200 }
    );
  }

  if (existingActive?.status === "applied" && existingActive.offer_id === offer.id) {
    return NextResponse.json({ ok: true, message: "Ya usaste esta promo." }, { status: 200 });
  }

  const { data: claim, error: insErr } = await supabaseAdmin
    .from("promo_claims")
    .insert({
      user_id: user.id,
      offer_id: offer.id,
      status: "active",
      expires_at: offer.ends_at ?? null,
      metadata: { slug: offer.slug },
    })
    .select("id, offer_id, status, claimed_at, expires_at")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    message: "Promo activada. Se aplicará en tu próximo depósito que cumpla el mínimo.",
    offer,
    claim,
  });
}
