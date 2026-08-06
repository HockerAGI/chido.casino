import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("signup declares adult age and legal consent without money claims", async () => {
  const signup = await source("src/app/(auth)/signup/page.tsx");
  assert.match(signup, /date_of_birth/);
  assert.match(signup, /terms_accepted_at/);
  assert.match(signup, /privacy_accepted_at/);
  assert.match(signup, /Sin depósitos, apuestas con dinero real ni premios monetarios/i);
  assert.doesNotMatch(signup, /100% bono|apuestas desde|giros gratis|¡A ganar!/i);
});

test("profile bootstrap verifies the authenticated user and preserves KYC", async () => {
  const bootstrap = await source("src/app/api/profile/bootstrap/route.ts");
  assert.match(bootstrap, /auth\.getUser\(\)/);
  assert.match(bootstrap, /kyc_status:\s*"unverified"/);
  assert.match(bootstrap, /!existing\.age_verified_at/);
  assert.doesNotMatch(bootstrap, /auth\.getSession\(\)/);
  assert.doesNotMatch(bootstrap, /\.upsert\(/);
});

test("KYC upload validates bytes and uses atomic request lifecycle", async () => {
  const submit = await source("src/app/api/kyc/submit/route.ts");
  assert.match(submit, /begin_kyc_request/);
  assert.match(submit, /finalize_kyc_request/);
  assert.match(submit, /fail_kyc_request/);
  assert.match(submit, /KYC_DOCUMENTS_REQUIRED/);
  assert.match(submit, /createHash\("sha256"\)/);
  assert.match(submit, /Buffer\.from\(\[0x89, 0x50, 0x4e, 0x47/);
  assert.match(submit, /%PDF-/);
  assert.match(submit, /upsert:\s*false/);
  assert.match(submit, /storage\.from\("kyc"\)\.remove/);
  assert.match(submit, /velocityLimit/);
});

test("KYC review requires a case and delegates atomically to PostgreSQL", async () => {
  const route = await source("src/app/api/admin/users/set-kyc/route.ts");
  assert.match(route, /KYC_REQUEST_ID_REQUIRED/);
  assert.match(route, /review_kyc_request/);
  assert.match(route, /KYC_REASON_REQUIRED/);
  assert.match(route, /VERIFIED_DATE_OF_BIRTH_REQUIRED/);
  assert.doesNotMatch(route, /\.from\("profiles"\)\.update/);
  assert.doesNotMatch(route, /auditAdminAction/);
});

test("Mercado Pago signatures have a bounded freshness window", async () => {
  const signature = await source("src/lib/mercadopagoWebhookSignature.ts");
  const webhook = await source("src/app/api/webhooks/mercadopago/route.ts");
  assert.match(signature, /MERCADOPAGO_WEBHOOK_MAX_SKEW_SECONDS/);
  assert.match(signature, /TIMESTAMP_STALE/);
  assert.match(signature, /timingSafeEqual/);
  assert.match(webhook, /verifyFreshMercadoPagoSignature/);
  assert.match(webhook, /review_required/);
});

test("rate limiting is atomic and fails closed", async () => {
  const fraud = await source("src/lib/fraud.ts");
  const migration = await source(
    "supabase/migrations/20260806180000_compliance_kyc_rate_hardening_20260806.sql"
  );
  assert.match(fraud, /consume_rate_limit/);
  assert.match(fraud, /RATE_LIMIT_UNAVAILABLE/);
  assert.doesNotMatch(fraud, /si falla conteo, no bloqueamos/i);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /security_rate_limits/);
});

test("database enforces adult KYC and cryptographic game fairness", async () => {
  const compliance = await source(
    "supabase/migrations/20260806180000_compliance_kyc_rate_hardening_20260806.sql"
  );
  const fairness = await source(
    "supabase/migrations/20260806181000_game_fairness_access_hardening_20260806.sql"
  );
  assert.match(compliance, /AGE_VERIFICATION_REQUIRED/);
  assert.match(compliance, /review_kyc_request/);
  assert.match(compliance, /transactions_audit/);
  assert.match(compliance, /trg_deposit_intent_compliance/);
  assert.match(fairness, /private\.chido_fair_float/);
  assert.match(fairness, /REELS_FAIRNESS_MISMATCH/);
  assert.match(fairness, /CRASH_FAIRNESS_MISMATCH/);
  assert.match(fairness, /digest\(server_seed, 'sha256'\)/);
  assert.match(fairness, /revoke select on public\.crash_bets from authenticated/);
  assert.match(fairness, /get_my_crash_history/);
});
