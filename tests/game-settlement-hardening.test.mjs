import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("responsible gaming and promo lookups fail closed", async () => {
  const responsible = await source("src/lib/responsibleGaming.ts");
  const responsibleRoute = await source("src/app/api/responsible/status/route.ts");
  const promo = await source("src/lib/promoLimits.ts");
  const promoRoute = await source("src/app/api/promos/limits/route.ts");
  assert.match(responsible, /USER_REQUIRED/i);
  assert.match(responsible, /PROFILE_NOT_FOUND/i);
  assert.match(responsible, /SELF_EXCLUSION_LOOKUP_FAILED/i);
  assert.doesNotMatch(responsible, /isSchemaMismatch[\s\S]*excluded:\s*false/i);
  assert.match(responsibleRoute, /RESPONSIBLE_GAMING_CHECK_FAILED/i);
  assert.match(responsibleRoute, /status:\s*503/i);
  assert.match(promo, /PROMO_LIMIT_LOOKUP_FAILED/i);
  assert.match(promo, /CASINO_SETTINGS_LOOKUP_FAILED/i);
  assert.doesNotMatch(promo, /isMissingTable/i);
  assert.match(promoRoute, /PROMO_LIMIT_CHECK_FAILED/i);
  assert.match(promoRoute, /status:\s*503/i);
});

test("game routes require idempotency keys and return persisted outcomes", async () => {
  const taco = await source("src/app/api/games/taco-slot/spin/route.ts");
  const crash = await source("src/app/api/games/crash/play/route.ts");
  for (const route of [taco, crash]) {
    assert.match(route, /getServerSession\(req\)/i);
    assert.match(route, /IDEMPOTENCY_KEY_REQUIRED/i);
    assert.match(route, /RESPONSIBLE_GAMING_CHECK_FAILED/i);
    assert.match(route, /PROMO_LIMIT_CHECK_FAILED/i);
    assert.match(route, /IDEMPOTENCY_LOOKUP_FAILED/i);
    assert.match(route, /idempotent:\s*true/i);
    assert.doesNotMatch(route, /randomUUID\(\)/i);
  }
  assert.match(taco, /spinResponse\(\(settlement \|\| \{\}\)/i);
  assert.match(crash, /crashResponse\(\(settlement \|\| \{\}\)/i);
});

test("client instrumentation injects scoped request keys", async () => {
  const instrumentation = await source("src/instrumentation-client.ts");
  assert.match(instrumentation, /\/api\/games\/taco-slot\/spin/i);
  assert.match(instrumentation, /\/api\/games\/crash\/play/i);
  assert.match(instrumentation, /idempotency-key/i);
  assert.match(instrumentation, /crypto\.randomUUID\(\)/i);
  assert.match(instrumentation, /requestMethod[\s\S]*POST/i);
  assert.match(instrumentation, /__chidoGameIdempotencyFetchGuard/i);
});

test("database settlement validates controls and returns complete replay data", async () => {
  const sql = await source("supabase/migrations/20260806173000_chido_game_settlement_fail_closed_20260806.sql");
  assert.match(sql, /assert_chido_game_write_allowed/i);
  assert.match(sql, /GAME_CONTROL_MISSING/i);
  assert.match(sql, /GAMES_PAUSED/i);
  assert.match(sql, /KYC_REQUIRED/i);
  assert.match(sql, /SELF_EXCLUDED/i);
  assert.match(sql, /PAYOUT_MULTIPLIER_MISMATCH/i);
  assert.match(sql, /INVALID_CASHOUT_RESULT/i);
  assert.match(sql, /INVALID_BUST_RESULT/i);
  assert.match(sql, /'reels',\s*v_existing\.reels/i);
  assert.match(sql, /'server_seed',\s*v_existing\.server_seed/i);
  assert.match(sql, /'client_seed',\s*v_existing\.client_seed/i);
  assert.match(sql, /'crash_multiplier',\s*v_existing\.crash_multiplier/i);
  assert.match(sql, /'target_multiplier',\s*v_existing\.target_multiplier/i);
  assert.match(sql, /revoke all on function public\.casino_settle_taco_slot/i);
  assert.match(sql, /revoke all on function public\.casino_settle_crash/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
});

test("KYC lifecycle is constrained and reviews are case based", async () => {
  const route = await source("src/app/api/admin/users/set-kyc/route.ts");
  const statusSql = await source("supabase/migrations/20260806173500_kyc_status_constraint_20260806.sql");
  const complianceSql = await source("supabase/migrations/20260806180000_compliance_kyc_rate_hardening_20260806.sql");

  for (const status of ["unverified", "pending", "review_required", "approved", "rejected"]) {
    assert.match(statusSql, new RegExp(status, "i"));
  }
  for (const decision of ["review_required", "approved", "rejected"]) {
    assert.match(route, new RegExp(decision, "i"));
  }
  assert.doesNotMatch(route, /"unverified"|"pending"/i);
  assert.match(route, /INVALID_KYC_DECISION/i);
  assert.match(route, /KYC_REQUEST_ID_REQUIRED/i);
  assert.match(route, /review_kyc_request/i);
  assert.match(statusSql, /profiles_kyc_status_allowed/i);
  assert.match(complianceSql, /kyc_requests_status_allowed/i);
  assert.match(complianceSql, /KYC_DOCUMENTS_INCOMPLETE/i);
});

test("new game rows are constrained while legacy evidence is preserved", async () => {
  const sql = await source("supabase/migrations/20260806174000_game_row_constraints_20260806.sql");
  assert.match(sql, /slot_spins_amounts_valid/i);
  assert.match(sql, /slot_spins_reels_valid/i);
  assert.match(sql, /slot_spins_fairness_material_valid/i);
  assert.match(sql, /slot_spins_payout_math_valid/i);
  assert.match(sql, /slot_spins_nonce_valid/i);
  assert.match(sql, /slot_spins_round_ref_valid/i);
  assert.match(sql, /crash_bets_result_valid/i);
  assert.match(sql, /not valid/i);
  assert.doesNotMatch(sql, /delete\s+from/i);
  assert.doesNotMatch(sql, /update\s+public\.slot_spins/i);
});
