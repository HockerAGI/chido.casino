export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * CHIDO does not accept Stripe payments.
 *
 * Stripe classifies casino, gambling and prize-based gaming as prohibited.
 * This endpoint remains temporarily as a tombstone so previously configured
 * webhook deliveries receive a successful acknowledgement and are not retried,
 * while no event can create or credit a deposit.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    credited: false,
    ignored: "PROVIDER_NOT_ALLOWED_FOR_CHIDO",
  });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "PROVIDER_NOT_ALLOWED_FOR_CHIDO",
    },
    { status: 410 }
  );
}
