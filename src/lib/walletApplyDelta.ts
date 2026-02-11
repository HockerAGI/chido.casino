type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, any>) => Promise<{ data: any; error: any }>;
};

export type WalletApplyDeltaInput = {
  userId: string;
  deltaBalance: number;
  deltaBonus?: number;
  deltaLocked?: number;
  reason: string;
  refId: string; // external id / folio / intent id
  metadata?: Record<string, any> | null;
};

function isParamMismatch(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("p_ref_id") ||
    m.includes("p_method") ||
    m.includes("named argument") ||
    m.includes("function wallet_apply_delta") ||
    m.includes("does not exist") ||
    m.includes("unknown")
  );
}

/**
 * Llama wallet_apply_delta con compat automática:
 * - intenta con p_ref_id
 * - si falla por mismatch, reintenta con p_method
 */
export async function walletApplyDelta(supabase: SupabaseRpcClient, input: WalletApplyDeltaInput) {
  const payloadBase = {
    p_user_id: input.userId,
    p_delta_balance: Number(input.deltaBalance),
    p_delta_bonus: Number(input.deltaBonus ?? 0),
    p_delta_locked: Number(input.deltaLocked ?? 0),
    p_reason: input.reason,
    p_metadata: input.metadata ?? {},
  };

  // 1) intento moderno: p_ref_id
  const a = await supabase.rpc("wallet_apply_delta", { ...payloadBase, p_ref_id: input.refId });
  if (!a.error) return a;

  const msgA = String(a.error?.message || "");
  if (!isParamMismatch(msgA)) return a;

  // 2) fallback legacy: p_method
  const b = await supabase.rpc("wallet_apply_delta", { ...payloadBase, p_method: input.refId });
  if (!b.error) return b;

  // si ambos fallan, regresa el error más útil
  const msgB = String(b.error?.message || "");
  return msgB.length >= msgA.length ? b : a;
}