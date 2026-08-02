import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260802200541_revoke_legacy_bets_client_insert_20260802.sql",
  import.meta.url,
);

test("legacy bets cannot be inserted directly by client roles", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /drop policy if exists "User Insert Bets" on public\.bets/i);
  assert.match(sql, /revoke insert on table public\.bets from anon, authenticated/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.bets/i);
  assert.doesNotMatch(sql, /revoke\s+select/i);
});
