import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Checks whether Chido Casino games are globally paused via the
 * `system_controls` kill switch. This is the SAME control that
 * Hocker ONE's admin panel (POST /api/chido/admin {action:"games_pause"})
 * toggles — so pausing from Hocker ONE immediately stops all game
 * play on the standalone chido.casino app too.
 *
 * Design: fail-open on infra errors so a Supabase hiccup never
 * accidentally locks players out of legitimate play. The admin
 * pause is a deliberate action that sets kill_switch=true; a query
 * error means "unknown" — we treat that as NOT paused so the casino
 * keeps working. The admin intent (kill_switch=true) is only honored
 * when we successfully read it as true.
 *
 * @returns { paused: boolean; reason?: string }
 */
export async function getGamesPaused(): Promise<{ paused: boolean; reason?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_controls")
      .select("kill_switch, meta")
      .eq("id", "chido-casino-games")
      .maybeSingle();

    if (error) {
      // Fail-open: if we can't read the control, don't block games.
      return { paused: false };
    }

    if (!data) {
      // No row exists yet — games were never paused. Default open.
      return { paused: false };
    }

    if (data.kill_switch === true) {
      const reason =
        (data.meta && typeof data.meta === "object" && "reason" in data.meta
          ? String((data.meta as Record<string, unknown>).reason ?? "")
          : "") || "Juegos pausados por administración";
      return { paused: true, reason };
    }

    return { paused: false };
  } catch {
    // Any unexpected error: fail-open to avoid locking the casino.
    return { paused: false };
  }
}

/**
 * Convenience guard for game route handlers. Returns a NextResponse
 * with 423 Locked if games are paused, or null if play should proceed.
 *
 * Usage:
 *   const blocked = await assertGamesNotPaused();
 *   if (blocked) return blocked;
 *
 * @returns NextResponse | null
 */
export async function assertGamesNotPaused(): Promise<Response | null> {
  const { paused, reason } = await getGamesPaused();
  if (!paused) return null;
  return new Response(
    JSON.stringify({
      error: "GAMES_PAUSED",
      message: reason ?? "Los juegos están temporalmente pausados por administración.",
    }),
    { status: 423, headers: { "Content-Type": "application/json" } }
  );
}
