import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const betAmount = Number(body.amount);
    const autoCashout = Number(body.target) || 2.0; // Si el usuario no retira manual, sale aquí

    if (betAmount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

    // 1. GENERAR RESULTADO DETERMINISTA (Provably Fair)
    // En producción real, el server_seed debe ser rotativo y secreto hasta el final del día.
    const serverSeed = crypto.randomBytes(32).toString('hex'); 
    const clientSeed = session.user.id; 
    const hash = crypto.createHash('sha256').update(serverSeed + clientSeed).digest('hex');
    
    // Convertir hash a crash point (Fórmula estándar)
    const h = parseInt(hash.slice(0, 13), 16);
    const e = Math.pow(2, 52);
    const result = Math.floor((100 * e - h) / (e - h)) / 100;
    const crashPoint = Math.max(1.00, result); // El punto donde explota

    // 2. CREAR RONDA EN BD
    const { data: round, error: roundError } = await supabaseAdmin
      .from('crash_rounds')
      .insert({
        nonce: Date.now(),
        server_seed: serverSeed, // Ojo: En prod real enviar el hash, no el seed revelado
        server_seed_hash: hash,
        client_seed: clientSeed,
        bust_multiplier: crashPoint,
        status: 'finished', // Para este MVP es instantáneo
        ended_at: new Date().toISOString()
      })
      .select()
      .single();

    if (roundError) throw new Error("Error creando ronda");

    // 3. EJECUTAR COBRO (RPC ATÓMICO)
    const { data: betResult, error: betError } = await supabaseAdmin.rpc('place_bet', {
      p_user_id: session.user.id,
      p_amount: betAmount,
      p_game_id: 'crash',
      p_round_id: round.id
    });

    if (betError || !betResult.ok) {
      return NextResponse.json({ error: "Saldo insuficiente o error de transacción" }, { status: 400 });
    }

    // 4. CALCULAR GANANCIA
    // Lógica simplificada: Si el usuario puso "autoCashout" menor al crashPoint, gana.
    let payout = 0;
    let win = false;

    if (autoCashout <= crashPoint) {
      payout = betAmount * autoCashout;
      win = true;
      
      // Pagar al usuario
      await supabaseAdmin.rpc('wallet_apply_delta', {
        p_user_id: session.user.id,
        p_delta_balance: payout,
        p_reason: 'win_crash',
        p_ref_id: round.id,
        p_metadata: { multiplier: autoCashout }
      });
    }

    // 5. ACTUALIZAR ESTADO DE APUESTA
    await supabaseAdmin
      .from('crash_bets')
      .update({ 
        status: win ? 'won' : 'lost',
        payout_amount: payout,
        cashout_multiplier: win ? autoCashout : 0
      })
      .eq('id', betResult.bet_id);

    return NextResponse.json({
      success: true,
      crashPoint: crashPoint, // El frontend debe animar hasta este número
      win: win,
      payout: payout,
      balance: betResult.new_balance + payout // Saldo final proyectado
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}