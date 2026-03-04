export const runtime = "nodejs";

import { NextResponse } from "next/server";

// Este endpoint NO se usa en el flujo real (Crash usa /play).
// Antes era una puerta abierta a abuso/DoS + escritura admin.
// Lo dejamos explícitamente cerrado.
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "DEPRECATED_ENDPOINT_USE_/api/games/crash/play" },
    { status: 410 }
  );
}