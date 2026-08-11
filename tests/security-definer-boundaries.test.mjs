import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function functionBlock(sql, functionName) {
  const pattern = new RegExp(
    `create or replace function public\\.${functionName}\\([\\s\\S]*?\\$\\$;`,
    "i",
  );
  const match = sql.match(pattern);
  assert.ok(match, `${functionName} must remain versioned in a migration`);
  return match[0];
}

test("public game feeds stay opt-in, bounded and privacy-safe", async () => {
  const migration = await source(
    "supabase/migrations/20260730230000_full_hardening_foundation.sql",
  );
  const leaderboard = functionBlock(migration, "get_public_leaderboard");
  const recentWins = functionBlock(migration, "get_public_recent_wins");

  assert.match(migration, /leaderboard_opt_in boolean not null default false/i);

  for (const block of [leaderboard, recentWins]) {
    assert.match(block, /security definer/i);
    assert.match(block, /set search_path = public, pg_temp/i);
    assert.match(block, /leaderboard_opt_in = true/i);
    assert.match(block, /nullif\(trim\(p\.public_display_name\), ''\) is not null/i);
    assert.doesNotMatch(block, /returns table\([\s\S]*?email\b/i);
  }

  assert.match(leaderboard, /least\(coalesce\(p_days, 7\), 30\)/i);
  assert.match(leaderboard, /least\(coalesce\(p_limit, 25\), 100\)/i);
  assert.match(recentWins, /least\(coalesce\(p_limit, 20\), 100\)/i);
  assert.match(
    migration,
    /revoke all on function public\.get_public_leaderboard\(integer, integer\) from public/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.get_public_leaderboard\(integer, integer\) to anon, authenticated, service_role/i,
  );
  assert.match(
    migration,
    /revoke all on function public\.get_public_recent_wins\(integer\) from public/i,
  );
});

test("private game history RPCs stay owner-scoped while base tables stay hidden", async () => {
  const [fairness, history] = await Promise.all([
    source("supabase/migrations/20260806181000_game_fairness_access_hardening_20260806.sql"),
    source("supabase/migrations/20260806182000_private_game_history_rpc_20260806.sql"),
  ]);
  const crash = functionBlock(fairness, "get_my_crash_history");
  const slot = functionBlock(history, "get_my_slot_history");

  for (const block of [crash, slot]) {
    assert.match(block, /security definer/i);
    assert.match(block, /set search_path = public, pg_temp/i);
    assert.match(block, /user_id = auth\.uid\(\)/i);
    assert.match(block, /least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/i);
  }

  assert.match(fairness, /revoke select on public\.crash_bets from authenticated/i);
  assert.match(history, /revoke select on public\.slot_spins from authenticated/i);
  assert.match(
    fairness,
    /revoke all on function public\.get_my_crash_history\(integer\)[\s\S]*?from public, anon/i,
  );
  assert.match(
    fairness,
    /grant execute on function public\.get_my_crash_history\(integer\)[\s\S]*?to authenticated, service_role/i,
  );
  assert.match(
    history,
    /revoke all on function public\.get_my_slot_history\(integer\)[\s\S]*?from public, anon/i,
  );
  assert.match(
    history,
    /grant execute on function public\.get_my_slot_history\(integer\)[\s\S]*?to authenticated, service_role/i,
  );
});

test("revealed fairness seeds are generated per completed game request, not loaded from a reusable secret", async () => {
  const [fairnessLib, slotRoute, crashRoute] = await Promise.all([
    source("src/lib/provablyFair.ts"),
    source("src/app/api/games/taco-slot/spin/route.ts"),
    source("src/app/api/games/crash/play/route.ts"),
  ]);

  assert.match(fairnessLib, /crypto\.randomBytes\(bytes\)\.toString\("hex"\)/);
  assert.match(slotRoute, /const serverSeed = generateServerSeed\(32\)/);
  assert.match(crashRoute, /const serverSeed = generateServerSeed\(\)/);
  assert.doesNotMatch(slotRoute, /process\.env\.[A-Z0-9_]*SERVER_SEED/);
  assert.doesNotMatch(crashRoute, /process\.env\.[A-Z0-9_]*SERVER_SEED/);
});
