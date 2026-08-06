import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const responsibleUrl = new URL(
  "../src/lib/responsibleGaming.ts",
  import.meta.url,
);
const promoUrl = new URL("../src/lib/promoLimits.ts", import.meta.url);
const tacoRouteUrl = new URL(
  "../src/app/api/games/taco-slot/spin/route.ts",
  import.meta.url,
);
const crashRouteUrl = new URL(
  "../src/app/api/games/crash/play/route.ts",
  import.meta.url,
);
const clientInstrumentationUrl = new URL(
  "../src/instrumentation-client.ts",
  import.meta.url,
);
const migrationUrl = new URL(
  "../supabase/migrations/20260806173000_chido_game_settlement_fail_closed_20260806.sql",
  import.meta.url,
);

test("responsible gaming and promo lookups fail closed", async () => {
  const responsible = await readFile(responsibleUrl, "utf8");
  const promo = await readFile(promoUrl, "utf8");

  assert.match(responsible, /USER_REQUIRED/i);
  assert.match(responsible, /PROFILE_NOT_FOUND/i);
  assert.match(responsible, /SELF_EXCLUSION_LOOKUP_FAILED/i);
  assert.doesNotMatch(
    responsible,
    /isSchemaMismatch[\s\S]*excluded:\s*false/i,
  );

  assert.match(promo, /PROMO_LIMIT_LOOKUP_FAILED/i);
  assert.match(promo, /CASINO_SETTINGS_LOOKUP_FAILED/i);
  assert.doesNotMatch(promo, /isMissingTable/i);
});

test("game routes require idempotency keys and return persisted outcomes", async () => {
  const taco = await readFile(tacoRouteUrl, "utf8");
  const crash = await readFile(crashRouteUrl, "utf8");

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
  const instrumentation = await readFile(clientInstrumentationUrl, "utf8");

  assert.match(instrumentation, /\/api\/games\/taco-slot\/spin/i);
  assert.match(instrumentation, /\/api\/games\/crash\/play/i);
  assert.match(instrumentation, /idempotency-key/i);
  assert.match(instrumentation, /crypto\.randomUUID\(\)/i);
  assert.match(instrumentation, /method[\s\S]*POST/i);
});

test("database settlement validates controls and returns complete replay data", async () => {
  const sql = await readFile(migrationUrl, "utf8");

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
