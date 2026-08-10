import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeGameWrite } from "@/lib/gamePolicy";

export type GamesControlState = {
  paused: boolean;
  reason?: string;
  controlStatus: "available" | "unavailable" | "missing";
};

/**
 * Reads the shared Hocker ONE / Chido Casino kill switch.
 * Financial gaming must fail closed: inability to prove that games are enabled
 * blocks new wagers until the control plane is available again.
 */
export async function getGamesPaused(): Promise<GamesControlState> {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_controls")
      .select("kill_switch, allow_write, meta")
      .eq("project_id", "chido-casino")
      .eq("id", "chido-casino-games")
      .maybeSingle();

    if (error) {
      console.error("Game control read failed", error);
      return {
        paused: true,
        reason: "Control de seguridad temporalmente no disponible.",
        controlStatus: "unavailable",
      };
    }

    if (!data) {
      console.error("Game control row is missing");
      return {
        paused: true,
        reason: "Control de seguridad no inicializado.",
        controlStatus: "missing",
      };
    }

    const meta =
      data.meta && typeof data.meta === "object"
        ? (data.meta as Record<string, unknown>)
        : {};
    const reason = String(meta.reason || "").trim();
    const paused = data.kill_switch === true || data.allow_write !== true;

    return {
      paused,
      reason: paused
        ? reason || "Juegos pausados por administración."
        : undefined,
      controlStatus: "available",
    };
  } catch (error) {
    console.error("Unexpected game control failure", error);
    return {
      paused: true,
      reason: "Control de seguridad temporalmente no disponible.",
      controlStatus: "unavailable",
    };
  }
}

export async function assertGamesNotPaused(): Promise<Response | null> {
  const environment = authorizeGameWrite();
  if (!environment.allowed) {
    return new Response(
      JSON.stringify({
        error: environment.code,
        message:
          "Los juegos con saldo están deshabilitados en este entorno.",
        controlStatus: "environment",
      }),
      {
        status: environment.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const state = await getGamesPaused();
  if (!state.paused) return null;

  return new Response(
    JSON.stringify({
      error: "GAMES_PAUSED",
      message: state.reason || "Los juegos están temporalmente pausados.",
      controlStatus: state.controlStatus,
    }),
    {
      status: 423,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
