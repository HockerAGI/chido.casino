export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} _.-]{3,32}$/u;

async function currentUser(req: Request) {
  const session = await getServerSession(req);
  return session?.user?.id || null;
}

export async function GET(req: Request) {
  const userId = await currentUser(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("public_display_name,leaderboard_opt_in")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Public visibility read failed", error);
    return NextResponse.json({ ok: false, error: "PROFILE_READ_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    publicDisplayName: String(data?.public_display_name || ""),
    leaderboardOptIn: Boolean(data?.leaderboard_opt_in),
  });
}

export async function POST(req: Request) {
  const userId = await currentUser(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    publicDisplayName?: unknown;
    leaderboardOptIn?: unknown;
  };
  const publicDisplayName = String(body.publicDisplayName || "").trim();
  const leaderboardOptIn = body.leaderboardOptIn === true;

  if (leaderboardOptIn && !DISPLAY_NAME_PATTERN.test(publicDisplayName)) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_PUBLIC_DISPLAY_NAME",
        message: "El alias público debe tener entre 3 y 32 caracteres y no puede incluir datos de contacto.",
      },
      { status: 400 }
    );
  }

  const safeName = leaderboardOptIn ? publicDisplayName : null;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      public_display_name: safeName,
      leaderboard_opt_in: leaderboardOptIn,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("public_display_name,leaderboard_opt_in")
    .single();

  if (error) {
    console.error("Public visibility update failed", error);
    return NextResponse.json({ ok: false, error: "PROFILE_UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    publicDisplayName: String(data.public_display_name || ""),
    leaderboardOptIn: Boolean(data.leaderboard_opt_in),
  });
}
