import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

// Define the rewards for each day of the streak (in MXN bonus)
const DAILY_STREAK_REWARDS = [100, 200, 300, 400, 500, 600, 1000];

// Helper to check if two dates are on the same day in UTC
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

// Helper to check if a date was yesterday in UTC
function isYesterday(date: Date, today: Date = new Date()): boolean {
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  return isSameDay(date, yesterday);
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();

    // Get the last streak claim from the daily_streak_claims table.
    // If the table doesn't exist yet (pre-migration), fall back gracefully.
    const { data: lastClaim, error: claimErr } = await supabaseAdmin
      .from("daily_streak_claims")
      .select("streak_count, claimed_at")
      .eq("user_id", user.id)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isMissingTable =
      claimErr &&
      String(claimErr.message || "")
        .toLowerCase()
        .includes("does not exist");

    let lastClaimedAt: Date | null = null;
    let currentStreak = 0;

    if (!claimErr && lastClaim) {
      lastClaimedAt = lastClaim.claimed_at ? new Date(lastClaim.claimed_at) : null;
      currentStreak = Number(lastClaim.streak_count ?? 0);
    }

    const today = new Date();

    // Already claimed today?
    if (lastClaimedAt && isSameDay(lastClaimedAt, today)) {
      return NextResponse.json(
        {
          ok: false,
          message: "¡Ya te llevaste tu premio de racha hoy! Regresa mañana, no hay prisa.",
        },
        { status: 400 }
      );
    }

    // Calculate new streak
    let newStreakCount = 1; // Default: streak reset
    if (lastClaimedAt && isYesterday(lastClaimedAt, today)) {
      newStreakCount = currentStreak + 1;
    }

    const rewardIndex = Math.min(
      newStreakCount - 1,
      DAILY_STREAK_REWARDS.length - 1
    );
    const todaysReward = DAILY_STREAK_REWARDS[rewardIndex];

    // Credit the reward as bonus balance
    const refId = `daily_streak:${user.id}:${today.toISOString().slice(0, 10)}`;
    const { error: walletError } = await walletApplyDelta(supabaseAdmin, {
      userId: user.id,
      deltaBalance: 0,
      deltaBonus: todaysReward,
      deltaLocked: 0,
      reason: "daily_streak_claim",
      refId,
      metadata: { day: newStreakCount, reward: todaysReward },
    });

    if (walletError) {
      const msg = String(walletError || "");
      // Idempotency: if already claimed (duplicate ref), treat as success
      if (msg.toLowerCase().includes("duplicate") || msg.includes("23505")) {
        return NextResponse.json(
          {
            ok: false,
            message: "¡Ya te llevaste tu premio de racha hoy! Regresa mañana.",
          },
          { status: 400 }
        );
      }
      throw new Error(`No se pudo acreditar la recompensa: ${walletError}`);
    }

    // Record the claim in daily_streak_claims table
    if (!isMissingTable) {
      const { error: insertErr } = await supabaseAdmin
        .from("daily_streak_claims")
        .insert({
          user_id: user.id,
          streak_count: newStreakCount,
          reward_amount: todaysReward,
          claimed_at: today.toISOString(),
        });

      if (insertErr) {
        console.error(
          `CRITICAL: Failed to record streak claim for user ${user.id} after payment.`,
          insertErr
        );
        // Don't fail the request — the bonus was already credited
      }
    }

    return NextResponse.json({
      ok: true,
      message: `¡Qué chido! Tu recompensa de racha diaria de ${todaysReward} MXN ha sido acreditada. ¡Racha de ${newStreakCount} día(s)!`,
      awarded: todaysReward,
      streak: newStreakCount,
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
