export type WalletApplyDeltaInput = {
  userId: string;
  deltaBalance: number;
  deltaBonus?: number;
  deltaLocked?: number;
  reason?: string;
  refId?: string;
  method?: string;
  metadata?: Record<string, unknown>;
};

export type WalletApplyDeltaResult = {
  ok: boolean;
  idempotent?: boolean;
  balance?: number;
  bonus_balance?: number;
  locked_balance?: number;
  error?: string;
};

type RpcThenable<T> = PromiseLike<T>;

// Supabase v2 retorna un builder “thenable”, no un Promise real.
export type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, any>) => RpcThenable<{ data: any; error: any }>;
};

function isParamMismatch(err: any) {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("parameter") ||
    msg.includes("argument") ||
    msg.includes("does not exist") ||
    msg.includes("invalid input syntax") ||
    msg.includes("function") ||
    msg.includes("No function")
  );
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
    reason = "adjustment",
    refId,
    method = "api",
    metadata = {},
  } = input;

  const ref_id = refId ?? `ref_${userId}_${Date.now()}`;

  // Intentos en orden:
  // A) firma nueva: p_ref_id + p_metadata
  // B) firma nueva: p_ref_id sin metadata
  // C) firma legacy: p_method (+/- metadata)
  const attempts: Array<{ name: string; args: Record<string, any> }> = [
    {
      name: "new+meta",
      args: {
        p_user_id: userId,
        p_delta_balance: deltaBalance,
        p_delta_bonus: deltaBonus,
        p_delta_locked: deltaLocked,
        p_reason: reason,
        p_ref_id: ref_id,
        p_metadata: metadata,
      },
    },
    {
      name: "new",
      args: {
        p_user_id: userId,
        p_delta_balance: deltaBalance,
        p_delta_bonus: deltaBonus,
        p_delta_locked: deltaLocked,
        p_reason: reason,
        p_ref_id: ref_id,
      },
    },
    {
      name: "legacy+meta",
      args: {
        p_user_id: userId,
        p_delta_balance: deltaBalance,
        p_delta_bonus: deltaBonus,
        p_delta_locked: deltaLocked,
        p_reason: reason,
        p_method: method,
        p_metadata: metadata,
      },
    },
    {
      name: "legacy",
      args: {
        p_user_id: userId,
        p_delta_balance: deltaBalance,
        p_delta_bonus: deltaBonus,
        p_delta_locked: deltaLocked,
        p_reason: reason,
        p_method: method,
      },
    },
  ];

  let lastErr: any = null;

  for (const a of attempts) {
    try {
      const res = await supabase.rpc("wallet_apply_delta", a.args);
      const { data, error } = res as any;

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return { ok: true, idempotent: false };

      return {
        ok: Boolean(row.ok ?? true),
        idempotent: Boolean(row.idempotent ?? false),
        balance: row.balance,
        bonus_balance: row.bonus_balance,
        locked_balance: row.locked_balance,
      };
    } catch (e: any) {
      lastErr = e;
      if (!isParamMismatch(e)) {
        return { ok: false, error: e?.message ?? "wallet_apply_delta failed" };
      }
      // si fue mismatch de params, probamos el siguiente intento
      continue;
    }
  }

  return { ok: false, error: lastErr?.message ?? "wallet_apply_delta param mismatch" };
}
