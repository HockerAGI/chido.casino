export type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, any>) => any;
};

type Args = {
  userId: string;
  deltaBalance: number;
  deltaBonus: number;
  deltaLocked?: number;
  currency?: "MXN";
  refId: string;
  reason: string;
};

export async function walletApplyDelta(supabase: SupabaseRpcClient, args: Args) {
  const payload = {
    p_user_id: args.userId,
    p_delta_balance: args.deltaBalance,
    p_delta_bonus: args.deltaBonus,
    p_delta_locked: args.deltaLocked ?? 0,
    p_currency: args.currency ?? "MXN",
    p_ref_id: args.refId,
    p_reason: args.reason,
  };

  let lastErr: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await supabase.rpc("wallet_apply_delta", payload);
    const error = res?.error ?? null;

    if (!error) return { ok: true as const };

    lastErr = error;

    const msg = String(error?.message ?? error ?? "");
    const isSerialization =
      msg.toLowerCase().includes("serialization") ||
      msg.toLowerCase().includes("could not serialize access") ||
      msg.toLowerCase().includes("40001");

    if (!isSerialization || attempt === 2) break;
    await new Promise((r) => setTimeout(r, 80));
  }

  const msg =
    typeof lastErr === "string"
      ? lastErr
      : String((lastErr as any)?.message ?? (lastErr as any) ?? "wallet_apply_delta failed");

  return { ok: false as const, error: msg };
}
