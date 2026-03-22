
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

// --- TIPOS --- //
type PromoProgressResult =
  | { ok: true; status: "none" | "skipped" | "progressed" | "completed"; claimId?: string; required?: number; progress?: number }
  | { ok: false; status: "error"; error: string };

type AffiliateWageringResult = 
  | { ok: true; status: "none" | "processed" }
  | { ok: false; error: string };

const num = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// --- LÓGICA DE COMISIONES DE AFILIADOS --- //
async function processAffiliateWagering(
  supabaseAdmin: SupabaseClient,
  params: { 
    userId: string; 
    wagerAmount: number; 
    wagerRef: string; 
    game?: string 
  }
): Promise<AffiliateWageringResult> {
  const { userId, wagerAmount, wagerRef, game } = params;

  // 1. Buscar si el jugador fue referido por un afiliado activo
  const { data: referral, error: refErr } = await supabaseAdmin
    .from("affiliate_referrals")
    .select(`
      affiliate_user_id,
      affiliates ( status )
    `)
    .eq("referred_user_id", userId)
    .single();

  if (refErr || !referral || (referral.affiliates as any)?.status !== 'active') {
    // Si hay error, no es referido, o el afiliado no está activo, no hacemos nada.
    return { ok: true, status: "none" };
  }

  const affiliateUserId = referral.affiliate_user_id;

  // 2. Calcular la comisión
  // La tasa de comisión se define como una variable de entorno para flexibilidad.
  const commissionRate = parseFloat(process.env.AFFILIATE_COMMISSION_RATE || '0.005'); // 0.5% por defecto
  const commissionAmount = wagerAmount * commissionRate;

  if (commissionAmount <= 0) {
    return { ok: true, status: "none" };
  }

  try {
    // 3. Registrar la ganancia y actualizar el saldo de comisión del afiliado en una transacción.
    // Usamos una RPC (Remote Procedure Call) de Supabase para asegurar la atomicidad.
    // Esta función `_distribute_affiliate_commission` la definiremos en SQL.
    const { error: rpcError } = await supabaseAdmin.rpc("_distribute_affiliate_commission", {
      p_affiliate_user_id: affiliateUserId,
      p_referred_user_id: userId,
      p_wager_amount: wagerAmount,
      p_commission_amount: commissionAmount,
      p_wager_ref: wagerRef,
      p_game: game,
    });

    if (rpcError) {
        // Si el error es por duplicado (código 23505), lo ignoramos (idempotencia).
        if (!rpcError.code || rpcError.code !== '23505') {
            throw rpcError;
        }
    }

    return { ok: true, status: "processed" };

  } catch (e: any) {
    // Devolvemos el error pero no rompemos el flujo principal de la apuesta.
    return { ok: false, error: e.message };
  }
}


// --- LÓGICA DE PROGRESO DE BONOS (EXISTENTE, MODIFICADA) --- //
export async function promoWageringProgress(
  supabaseAdmin: SupabaseClient,
  params: {
    userId: string;
    wagerAmount: number;
    wagerRef: string;
    game?: "crash" | "taco_slot" | string;
  }
): Promise<PromoProgressResult> {
  const userId = String(params.userId || "").trim();
  const wagerAmount = num(params.wagerAmount);
  const wagerRef = String(params.wagerRef || "").trim();

  if (!userId || !wagerRef || wagerAmount <= 0) {
    return { ok: true, status: "skipped" };
  }
  
  // --- INYECCIÓN DE LÓGICA DE AFILIADOS ---
  // Se procesa de forma asíncrona y no bloqueante. 
  // Si falla, solo lo logueamos, no afectamos el bono del jugador.
  processAffiliateWagering(supabaseAdmin, params).then(result => {
      if (!result.ok) {
          console.error(`[AffiliateWagering] Error for user ${userId}, ref ${wagerRef}:`, result.error);
      }
  });
  // --- FIN DE LA INYECCIÓN ---

  // 1) Claim aplicado (en rollover) - Lógica existente
  const { data: claim, error: cErr } = await supabaseAdmin
    .from("promo_claims")
    .select("id,status,wagering_required,wagering_progress,metadata")
    .eq("user_id", userId)
    .eq("status", "applied")
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cErr) return { ok: false, status: "error", error: cErr.message };
  if (!claim) return { ok: true, status: "none" };

  const required = num((claim as any).wagering_required);
  const progress = num((claim as any).wagering_progress);
  if (required <= 0) return { ok: true, status: "none", claimId: claim.id, required, progress };

  const meta = ((claim as any).metadata || {}) as any;

  if (meta?.last_wager_ref && String(meta.last_wager_ref) === wagerRef) {
    return { ok: true, status: "skipped", claimId: claim.id, required, progress };
  }

  const next = Math.min(required, progress + wagerAmount);

  const up = await supabaseAdmin
    .from("promo_claims")
    .update({
      wagering_progress: next,
      metadata: {
        ...meta,
        last_wager_ref: wagerRef,
        last_game: params.game || null,
        last_wager_amount: wagerAmount,
        last_wager_at: new Date().toISOString(),
      },
    })
    .eq("id", claim.id);

  if (up.error) return { ok: false, status: "error", error: up.error.message };

  // 2) Si completó: marcar completed + convertir bonus_balance → balance (para que sea “real”)
  if (next >= required) {
    const b = await supabaseAdmin
      .from("balances")
      .select("bonus_balance")
      .eq("user_id", userId)
      .maybeSingle();

    const bonusNow = num((b.data as any)?.bonus_balance);
    const meta2 = { ...(meta || {}), completed_at: new Date().toISOString(), completed_by: "auto" };

    const up2 = await supabaseAdmin.from("promo_claims").update({ status: "completed", metadata: meta2 }).eq("id", claim.id);
    if (up2.error) return { ok: false, status: "error", error: up2.error.message };

    if (bonusNow > 0) {
      const ref = `promo_clear:${claim.id}:${wagerRef}`;
      const conv = await walletApplyDelta(supabaseAdmin as any, {
        userId,
        deltaBalance: +bonusNow,
        deltaBonus: -bonusNow,
        deltaLocked: 0,
        reason: "promo_clear_bonus",
        refId: ref,
      });
      if (conv.error) {
        return { ok: false, status: "error", error: String(conv.error) };
      }
    }

    return { ok: true, status: "completed", claimId: claim.id, required, progress: next };
  }

  return { ok: true, status: "progressed", claimId: claim.id, required, progress: next };
}
