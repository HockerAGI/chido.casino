import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseRpcClient = Pick<SupabaseClient, "rpc">;

export type WalletApplyDeltaInput = {
  userId: string;
  deltaBalance: number;
  deltaBonus?: number;
  deltaLocked?: number;
  reason: string;
  refId?: string | null;
  method?: string | null;
  metadata?: Record<string, any> | null; // se acepta, pero (por ahora) NO se manda al RPC
};

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const looksLikeNamedArgMismatch = (msg: string, arg: string) => {
  const m = (msg || "").toLowerCase();
  const a = arg.toLowerCase();
  return (
    m.includes(a) &&
    (m.includes("named argument") ||
      m.includes("does not exist") ||
      m.includes("function") ||
      m.includes("unknown"))
  );
};

export async function walletApplyDelta(
  supabase: SupabaseRpcClient,
  input: WalletApplyDeltaInput
) {
  const payload: Record<string, any> = {
    p_user_id: input.userId,
    p_delta_balance: num(input.deltaBalance, 0),
    p_delta_bonus: num(input.deltaBonus ?? 0, 0),
    p_delta_locked: num(input.deltaLocked ?? 0, 0),
    p_reason: input.reason,
  };

  const refId = input.refId ? String(input.refId) : null;
  const method = input.method ? String(input.method) : null;

  if (refId) payload.p_ref_id = refId;
  if (method) payload.p_method = method;

  // ✅ NOTA: aunque input.metadata exista, NO lo mandamos al RPC
  // porque depende de la firma exacta de tu función en Postgres y no quiero romper runtime.

  // Intento normal (firma nueva)
  let res = await supabase.rpc("wallet_apply_delta", payload);
  if (!res.error) return res;

  // Fallback legacy: bases viejas que no tenían p_ref_id y usaban p_method para idempotency/ref
  const msg = String((res as any).error?.message ?? "");
  if (refId && looksLikeNamedArgMismatch(msg, "p_ref_id")) {
    const legacyPayload: Record<string, any> = { ...payload };
    delete legacyPayload.p_ref_id;
    legacyPayload.p_method = refId; // legacy: refId iba en p_method
    res = await supabase.rpc("wallet_apply_delta", legacyPayload);
  }

  return res;
}
