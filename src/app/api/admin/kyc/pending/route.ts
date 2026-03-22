
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Helper para verificar el token de admin desde las cabeceras
function mustAdmin(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  // Asegurarse que el token esperado no esté vacío y que coincida
  return Boolean(expected && token === expected);
}

export async function GET(req: Request) {
  // Primero, asegurar que quien llama es un administrador
  if (!mustAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Consultar a la base de datos por solicitudes de KYC pendientes
    const { data, error } = await supabaseAdmin
      .from("kyc_requests")
      .select(`
        id,
        user_id,
        status,
        submitted_at,
        id_front_path,
        id_back_path,
        selfie_path,
        profiles (
          username,
          email
        )
      `)
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    // Si Supabase devuelve un error, lo lanzamos para que el catch lo maneje
    if (error) {
      throw new Error(error.message);
    }

    // Si todo va bien, devolvemos la lista de solicitudes
    return NextResponse.json({ ok: true, requests: data });

  } catch (e: any) {
    // Manejo de errores generales
    return NextResponse.json({ ok: false, error: e?.message || "KYC_PENDING_ERROR" }, { status: 500 });
  }
}
