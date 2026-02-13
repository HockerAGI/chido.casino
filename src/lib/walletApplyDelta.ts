export type WalletApplyDeltaInput = {
  userId: string;
  deltaBalance: number;
  deltaBonus?: number;
  deltaLocked?: number;
  reason?: string;
  refId?: string;
  method?: string;
  // Agregamos estos campos opcionales para evitar el error de build:
  currency?: string; 
  metadata?: any;
};

export type WalletApplyDeltaResult = {
  ok: boolean;
  idempotent?: boolean;
  balance?: number;
  bonus_balance?: number;
  locked_balance?: number;
  error?: string;
};

/**
 * Minimal RPC client shape:
 * Supabase `.rpc()` returns a thenable builder, so we type it as `any` on purpose.
 */
export type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, any>) => any;
};

function normalizeError(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;

  if (typeof err === "object") {
    const e = err as any;
    return String(
      e.message ??
        e.error_description ??
        e.details ??
        e.hint ??
        (typeof e === "object" ? JSON.stringify(e) : "")
    );
  }

  return String(err);
}

export async function walletApplyDelta(
  supabase: SupabaseRpcClient,
  input: WalletApplyDeltaInput
): Promise<WalletApplyDeltaResult> {
  const {
    userId,
    deltaBalance,
    deltaBonus = 0,
    deltaLocked = 0,
    reason = "wallet_delta",
    refId,
    method,
  } = input;

  const args: Record<string, any> = {
    p_user_id: userId,
    p_delta_balance: deltaBalance,
    p_delta_bonus: deltaBonus,
    p_delta_locked: deltaLocked,
    p_reason: reason,
    p_ref_id: refId ?? null,
    p_method: method ?? null,
  };

  const res: any = await supabase.rpc("wallet_apply_delta", args);
  const { data, error } = res ?? {};

  if (error) return { ok: false, error: normalizeError(error) };
  if (!data) return { ok: false, error: "RPC_EMPTY_RESPONSE" };

  return { ok: true, ...data };
}