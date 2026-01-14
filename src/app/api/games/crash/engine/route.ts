import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Usamos el cliente Admin para escribir

export const dynamic = 'force-dynamic'; // Evita caché en Vercel

export async function POST(req: Request) {
  try {
    // 1. Lógica Provably Fair (Criptografía Real)
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const clientSeed = "client-seed-chido-global"; 
    const combination = serverSeed + clientSeed;
    const hash = crypto.createHash('sha256').update(combination).digest('hex');

    // Convertir hash a número
    const h = parseInt(hash.slice(0, 13), 16);
    const e = Math.pow(2, 52);
    const point = Math.floor((100 * e - h) / (e - h)) / 100;
    const crashPoint = point > 1 ? point : 1;

    // 2. GUARDAR EN LA BASE DE DATOS REAL (Esto faltaba)
    const { error } = await supabaseAdmin
      .from('game_history')
      .insert({
        game_type: 'crash',
        crash_point: crashPoint,
        server_seed: serverSeed,
        hash: hash,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error guardando juego:", error);
      return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
    }

    // 3. Responder al Cliente
    return NextResponse.json({ 
      crashPoint: crashPoint,
      hash: hash,
      status: "finished"
    });

  } catch (error) {
    return NextResponse.json({ error: "Error interno del motor" }, { status: 500 });
  }
}