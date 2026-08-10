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
  const createDeposit = await source("src/app/api/payments/create-deposit/route.ts");
  const manual = await source("src/app/api/payments/manual/confirm/route.ts");
  const withdrawal = await source("src/app/api/payments/withdraw/admin/route.ts");

  assert.match(stripe, /PROVIDER_NOT_ALLOWED_FOR_CHIDO/);
  assert.doesNotMatch(stripe, /credit_deposit_atomic|wallet_apply_delta|amount_total|paidCurrency/);
  assert.match(mercadoPago, /credit_deposit_atomic/);
  assert.match(mercadoPago, /verifyFreshMercadoPagoSignature/);
  assert.match(mercadoPago, /INVALID_SIGNATURE/);
  assert.match(createDeposit, /authorizeDepositProvider\("mercadopago"\)/);
  assert.doesNotMatch(createDeposit, /createStripeCheckoutSession/);
  assert.match(manual, /admin_confirm_manual_deposit/);
  assert.match(withdrawal, /admin_settle_withdrawal/);
});

test("casino control plane and environment policy fail closed", async () => {
  const control = await source("src/lib/gamesPaused.ts");
  const policy = await source("src/lib/gamePolicy.ts");
  assert.match(control, /authorizeGameWrite/);
  assert.match(control, /paused: true/);
  assert.match(control, /controlStatus: "unavailable"/);
  assert.match(control, /chido-casino-games/);
  assert.match(control, /controlStatus: "environment"/);
  assert.match(policy, /CHIDO_GAME_MODE/);
  assert.match(policy, /CHIDO_GAME_SANDBOX_AUTHORIZED/);
  assert.match(policy, /SANDBOX_PRODUCTION_DATA_FORBIDDEN/);
  assert.match(policy, /CHIDO_GAMBLING_LICENSE_APPROVED/);
  assert.match(policy, /CHIDO_KYC_AML_READY/);
  assert.match(policy, /GAMES_DISABLED/);
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
  assert.match(config, /X-Robots-Tag/);
  assert.doesNotMatch(config, /stripe\.com|js\.stripe|hooks\.stripe/i);
  assert.equal(pkg.dependencies.next, "16.2.12");
  assert.equal(pkg.dependencies.sharp, "0.35.3");
  assert.equal(pkg.dependencies.react, "19.2.7");
  assert.equal(pkg.devDependencies.postcss, "8.5.23");
  assert.equal(pkg.overrides.postcss, "8.5.23");
  assert.match(pkg.scripts.prebuild, /test/);
  assert.match(pkg.scripts.prebuild, /lint/);
  assert.match(pkg.scripts.prebuild, /typecheck/);
  assert.match(pkg.scripts.prebuild, /audit:prod/);
});

test("public landing, lobby and metadata remain prelaunch and noindex", async () => {
  const page = await source("src/app/page.tsx");
  const lobby = await source("src/app/lobby/page.tsx");
  const layout = await source("src/app/layout.tsx");
  const robots = await source("src/app/robots.ts");
  assert.match(page, /Sin dinero real/i);
  assert.match(page, /depósitos[\s\S]*deshabilitados/i);
  assert.doesNotMatch(page, /JUEGA\.[\s\S]*COBRA\.[\s\S]*REPITE\.|sacar lana cuando quieras|Wallet en vivo/i);
  assert.match(lobby, /no autoriza apuestas, depósitos ni premios/i);
  assert.match(lobby, /matemática todavía no está certificada/i);
  assert.doesNotMatch(lobby, /cobra sin chaquetear|Echar lana|\/api\/feed\/wins|\/api\/promos\/redeem/i);
  assert.match(layout, /index:\s*false/i);
  assert.match(layout, /follow:\s*false/i);
  assert.match(layout, /Sin depósitos, premios monetarios ni operación con dinero real/i);
  assert.match(robots, /disallow:\s*"\/"/i);
});

test("catalog exposes only two preview engines and no uncertified RTP claims", async () => {
  const games = await source("src/lib/games.ts");
  const previewStatuses = games.match(/status:\s*"new"/g) || [];
  assert.equal(previewStatuses.length, 2);
  assert.match(games, /id:\s*"taco-slot"[\s\S]*badge:\s*"PREVIEW"/i);
  assert.match(games, /id:\s*"crash"[\s\S]*badge:\s*"PREVIEW"/i);
  assert.doesNotMatch(games, /status:\s*"live"|status:\s*"hot"|\n\s*rtp:\s*|\n\s*maxWin:\s*/i);
  assert.match(games, /mathCertified:\s*false/g);
});

test("daily streak exposes the approved seven-day schedule", async () => {
  const component = await source("src/components/ui/daily-streak-bar.tsx");
  for (const reward of ["$5", "$10", "$15", "$25", "$50", "2x", "10 rondas gratis"]) {
    assert.match(component, new RegExp(reward.replace("$", "\\$")));
  }
  assert.match(component, /rollover x10/i);
});
