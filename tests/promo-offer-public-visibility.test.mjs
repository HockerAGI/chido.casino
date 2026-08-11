import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "../supabase/migrations/20260811025000_promo_offer_public_visibility_hardening.sql";
const routePath = "../src/app/api/promos/list/route.ts";

test("public promo policy requires active offer and current window", async () => {
  const sql = await readFile(new URL(migrationPath, import.meta.url), "utf8");

  assert.match(sql, /create\s+policy\s+"?promo_offers_select_active_window"?/i);
  assert.match(sql, /for\s+select\s+to\s+anon\s*,\s*authenticated/i);
  assert.match(sql, /active\s+is\s+true/i);
  assert.match(sql, /starts_at\s*<=\s*now\(\)/i);
  assert.match(sql, /ends_at\s+is\s+null\s+or\s+ends_at\s*>\s*now\(\)/i);
});

test("promo list API mirrors active and availability-window guards", async () => {
  const route = await readFile(new URL(routePath, import.meta.url), "utf8");

  assert.match(route, /\.from\("promo_offers"\)[\s\S]*?\.eq\("active",\s*true\)/);
  assert.match(route, /\.lte\("starts_at",\s*now\)/);
  assert.match(route, /\.or\(`ends_at\.is\.null,ends_at\.gt\.\$\{now\}`\)/);
});
