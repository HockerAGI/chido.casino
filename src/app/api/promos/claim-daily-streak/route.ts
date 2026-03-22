import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // TODO: Implementar la lógica de reclamo de racha diaria
  return NextResponse.json({ ok: true, message: "Ruta funcional" });
}
