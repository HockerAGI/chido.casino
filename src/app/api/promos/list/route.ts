import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // Ofertas visibles al público (RLS ya filtra por active/starts_at/ends_at)
  const { data: offers, error: offersErr } = await supabase
    .from("promo_offers")
    .select(
      "id, slug, title, description, active, starts_at, ends_at, min_deposit, bonus_percent, max_bonus, free_rounds, wagering_multiplier, created_at"
    )
    .order("created_at", { ascending: false });

  if (offersErr) {
    return NextResponse.json({ error: offersErr.message }, { status: 500 });
  }

  // Claim activo (si hay sesión)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeClaim: any = null;
  if (user) {
    const { data: claim } = await supabase
      .from("promo_claims")
      .select(
        "id, offer_id, status, claimed_at, expires_at, bonus_awarded, free_rounds_awarded, wagering_required, wagering_progress, metadata"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "applied"])
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    activeClaim = claim ?? null;
  }

  return NextResponse.json({ offers: offers ?? [], activeClaim });
}
