import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DailyStreakResult = {
  ok?: boolean;
  already_claimed?: boolean;
  awarded?: number | string;
  streak?: number | string;
};

export async function POST() {
  try {
    const user = await requireSessionUser();
    const claimedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin.rpc("claim_daily_streak", {
      p_user_id: user.id,
      p_claimed_at: claimedAt,
    });

    if (error) {
      throw new Error(`No se pudo registrar la recompensa: ${error.message}`);
    }

    const result = (data ?? {}) as DailyStreakResult;
    const awarded = Number(result.awarded ?? 0);
    const streak = Number(result.streak ?? 1);

    if (result.already_claimed) {
      return NextResponse.json(
        {
          ok: false,
          message: "¡Ya te llevaste tu premio de racha hoy! Regresa mañana.",
          awarded,
          streak,
        },
        { status: 400 }
      );
    }

    if (!result.ok || !Number.isFinite(awarded) || awarded <= 0) {
      throw new Error("La base de datos no confirmó la recompensa.");
    }

    return NextResponse.json({
      ok: true,
      message: `¡Qué chido! Tu recompensa de racha diaria de ${awarded} MXN ha sido acreditada. ¡Racha de ${streak} día(s)!`,
      awarded,
      streak,
    });
  } catch (error) {
    console.error("Daily streak claim error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Ocurrió un error inesperado.";

    if (errorMessage === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, message: "Acceso no autorizado." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, message: `¡Aguas! ${errorMessage}` },
      { status: 500 }
    );
  }
}
