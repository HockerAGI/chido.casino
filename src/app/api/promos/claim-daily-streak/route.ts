
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { walletApplyDelta } from "@/lib/walletApplyDelta";

// Define the rewards for each day of the streak
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("daily_streak_last_claimed_at, daily_streak_count")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 means no rows were found, which is fine for a first-time claimer.
      // Any other error is a real problem.
      throw new Error(profileError.message);
    }

    const lastClaimedAt = profile?.daily_streak_last_claimed_at
      ? new Date(profile.daily_streak_last_claimed_at)
      : null;
    const currentStreak = profile?.daily_streak_count ?? 0;
    const today = new Date();

    if (lastClaimedAt && isSameDay(lastClaimedAt, today)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Ya has reclamado tu premio de racha hoy. Vuelve mañana.",
        },
        { status: 400 }
      );
    }

    let newStreakCount = 1; // Default to 1 (streak reset)
    if (lastClaimedAt && isYesterday(lastClaimedAt, today)) {
      newStreakCount = currentStreak + 1;
    }

    const rewardIndex = Math.min(
      newStreakCount - 1,
      DAILY_STREAK_REWARDS.length - 1
    );
    const todaysReward = DAILY_STREAK_REWARDS[rewardIndex];

    const { error: walletError } = await walletApplyDelta(supabaseAdmin, {
      userId: user.id,
      deltaBalance: todaysReward,
      reason: "daily-streak-claim",
      metadata: { day: newStreakCount },
    });

    if (walletError) {
      throw new Error(`Failed to apply wallet delta: ${walletError}`);
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: user.id,
        daily_streak_last_claimed_at: today.toISOString(),
        daily_streak_count: newStreakCount,
      }, { onConflict: 'user_id' })
      .eq("user_id", user.id);

    if (updateError) {
      console.error(
        `CRITICAL: Failed to update streak for user ${user.id} after payment.`,
        updateError
      );
    }

    return NextResponse.json({
      ok: true,
      message: "¡Qué curado! Tu recompensa de racha diaria ha sido acreditada. ¡No hay falla!",
      awarded: todaysReward,
      streak: newStreakCount,
    });
  } catch (error) {
    console.error("Daily streak claim error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
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
