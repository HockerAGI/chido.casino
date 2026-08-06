import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("game routes rely on atomic settlement RPCs only", async () => {
  const crash = await source("src/app/api/games/crash/play/route.ts");
  const slot = await source("src/app/api/games/taco-slot/spin/route.ts");

  assert.match(crash, /casino_settle_crash/);
  assert.match(slot, /casino_settle_taco_slot/);
  assert.doesNotMatch(crash, /promoWageringProgress/);
  assert.doesNotMatch(slot, /promoWageringProgress/);
});

test("payment routes use only approved atomic settlement paths", async () => {
  const stripe = await source("src/app/api/webhooks/stripe/route.ts");
  const mercadoPago = await source("src/app/api/webhooks/mercadopago/route.ts");
  const createDeposit = await source(
    "src/app/api/payments/create-deposit/route.ts",
  );
  const manual = await source("src/app/api/payments/manual/confirm/route.ts");
  const withdrawal = await source("src/app/api/payments/withdraw/admin/route.ts");

  assert.match(stripe, /PROVIDER_NOT_ALLOWED_FOR_CHIDO/);
  assert.doesNotMatch(stripe, /credit_deposit_atomic/);
  assert.doesNotMatch(stripe, /wallet_apply_delta/);
  assert.doesNotMatch(stripe, /amount_total|paidCurrency/);

  assert.match(mercadoPago, /credit_deposit_atomic/);
  assert.match(mercadoPago, /verifyWebhookSignature/);
  assert.match(mercadoPago, /INVALID_SIGNATURE/);
  assert.match(createDeposit, /authorizeDepositProvider\("mercadopago"\)/);
  assert.doesNotMatch(createDeposit, /createStripeCheckoutSession/);

  assert.match(manual, /admin_confirm_manual_deposit/);
  assert.match(withdrawal, /admin_settle_withdrawal/);
});

test("casino control plane fails closed", async () => {
  const control = await source("src/lib/gamesPaused.ts");
  assert.match(control, /paused: true/);
  assert.match(control, /controlStatus: "unavailable"/);
  assert.match(control, /chido-casino-games/);
});

test("public game feeds require privacy-safe RPCs", async () => {
  const leaderboard = await source("src/app/api/tournaments/leaderboard/route.ts");
  const wins = await source("src/app/api/feed/wins/route.ts");
  assert.match(leaderboard, /get_public_leaderboard/);
  assert.doesNotMatch(leaderboard, /full_name|username/);
  assert.match(wins, /get_public_recent_wins/);
  assert.doesNotMatch(wins, /full_name|username/);
});

test("security headers and patched runtime dependencies are pinned", async () => {
  const config = await source("next.config.js");
  const pkg = JSON.parse(await source("package.json"));

  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /X-Content-Type-Options/);
  assert.equal(pkg.dependencies.next, "16.2.12");
  assert.equal(pkg.dependencies.sharp, "0.35.3");
  assert.equal(pkg.dependencies.react, "19.2.7");
  assert.match(pkg.scripts.prebuild, /test/);
  assert.match(pkg.scripts.prebuild, /lint/);
  assert.match(pkg.scripts.prebuild, /typecheck/);
});

test("daily streak exposes the approved seven-day schedule", async () => {
  const component = await source("src/components/ui/daily-streak-bar.tsx");
  for (const reward of [
    "$5",
    "$10",
    "$15",
    "$25",
    "$50",
    "2x",
    "10 rondas gratis",
  ]) {
    assert.match(component, new RegExp(reward.replace("$", "\\$")));
  }
  assert.match(component, /rollover x10/i);
});
