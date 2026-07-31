import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StreakResult = {
  ok?: boolean;
  error?: string;
  idempotent?: boolean;
  already_claimed?: boolean;
  awarded?: number | string;
  free_rounds?: number | string;
  reward_kind?: "bonus" | "free_rounds" | string;
  streak?: number | string;
  wagering_required?: number | string;
  wagering_progress?: number | string;
  claimed_today?: boolean;
  current_streak?: number | string;
  next_day?: number | string;
  can_claim?: boolean;
};

function unauthorized(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

function blockedMessage(code: string) {
  if (code === "PROMO_ACTIVE") {
    return "Termina o cancela tu promoción activa antes de reclamar la racha diaria.";
  }
  if (code === "STREAK_WAGERING_ACTIVE") {
    return "Completa el rollover de tu recompensa anterior antes de reclamar la siguiente.";
  }
  return "La recompensa no está disponible en este momento.";
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const { data, error } = await supabaseAdmin.rpc("get_daily_streak_status", {
      p_user_id: user.id,
      p_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Daily streak status failed", error);
      return NextResponse.json({ ok: false, error: "STREAK_STATUS_FAILED" }, { status: 500 });
    }

    return NextResponse.json(data || { ok: true, current_streak: 0, next_day: 1, can_claim: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (unauthorized(error)) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    console.error("Daily streak status error", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await requireSessionUser();
    const { data, error } = await supabaseAdmin.rpc("claim_daily_streak", {
      p_user_id: user.id,
      p_claimed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Daily streak claim RPC failed", error);
      return NextResponse.json({ ok: false, error: "STREAK_CLAIM_FAILED" }, { status: 500 });
    }

    const result = (data || {}) as StreakResult;
    if (!result.ok) {
      const code = String(result.error || "STREAK_NOT_AVAILABLE");
      return NextResponse.json(
        {
          ...result,
          ok: false,
          error: code,
          message: blockedMessage(code),
        },
        { status: 409 }
      );
    }

    const awarded = Number(result.awarded || 0);
    const freeRounds = Number(result.free_rounds || 0);
    const streak = Number(result.streak || 1);
    const rewardKind = String(result.reward_kind || "bonus");

    const message = result.already_claimed
      ? "La recompensa de hoy ya fue reclamada."
      : rewardKind === "free_rounds"
        ? `Día ${streak}: recibiste ${freeRounds} rondas gratis de Crash.`
        : `Día ${streak}: recibiste ${awarded} MXN de bono con rollover x10.`;

    return NextResponse.json({
      ...result,
      ok: true,
      awarded,
      free_rounds: freeRounds,
      streak,
      message,
    });
  } catch (error) {
    if (unauthorized(error)) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    console.error("Daily streak claim error", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
