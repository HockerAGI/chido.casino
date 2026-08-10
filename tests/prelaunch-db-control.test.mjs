import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("prelaunch migration forces Chido game writes off", async () => {
  const source = await read(
    "supabase/migrations/20260806185000_chido_prelaunch_games_fail_closed_20260810.sql",
  );
  assert.match(source, /'chido-casino-games'/);
  assert.match(source, /'chido-casino'/);
  assert.match(source, /kill_switch\s*=\s*true/i);
  assert.match(source, /allow_write\s*=\s*false/i);
  assert.match(source, /on conflict \(project_id, id\)/i);
});

test("database game guard is scoped to the Chido project and remains fail closed", async () => {
  const source = await read(
    "supabase/migrations/20260806185500_chido_game_control_scope_hardening_20260810.sql",
  );
  assert.match(source, /project_id\s*=\s*'chido-casino'/i);
  assert.match(source, /id\s*=\s*'chido-casino-games'/i);
  assert.match(source, /coalesce\(v_kill_switch, true\)/i);
  assert.match(source, /not coalesce\(v_allow_write, false\)/i);
});
