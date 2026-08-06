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
  assert.match(signup, /depósitos/i);
  assert.match(signup, /apuestas con (?:saldo|dinero real)/i);
  assert.match(signup, /premios monetarios/i);
  assert.match(signup, /deshabilitados/i);
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

test("KYC user and admin UIs follow the private case workflow", async () => {
  const userPage = await source("src/app/profile/kyc/page.tsx");
  const adminPage = await source("src/app/admin/kyc/page.tsx");
  const pendingApi = await source("src/app/api/admin/kyc/pending/route.ts");
  assert.match(userPage, /id_front/);
  assert.match(userPage, /id_back/);
  assert.match(userPage, /selfie/);
  assert.match(userPage, /date_of_birth/);
  assert.match(adminPage, /kyc_request_id/);
  assert.match(adminPage, /verified_date_of_birth/);
  assert.match(adminPage, /reason/);
  assert.match(pendingApi, /createSignedUrl/);
  assert.doesNotMatch(pendingApi, /getPublicUrl/);
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

test("rate limiting and login protection are atomic and fail closed", async () => {
  const fraud = await source("src/lib/fraud.ts");
  const attempt = await source("src/app/api/auth/risk/attempt/route.ts");
  const reset = await source("src/app/api/auth/risk/reset/route.ts");
  const login = await source("src/app/(auth)/login/page.tsx");
  const migration = await source("supabase/migrations/20260806180000_compliance_kyc_rate_hardening_20260806.sql");
  const resetMigration = await source("supabase/migrations/20260806184000_authenticated_login_rate_reset_20260806.sql");
  assert.match(fraud, /consume_rate_limit/);
  assert.match(fraud, /RATE_LIMIT_UNAVAILABLE/);
  assert.match(attempt, /consume_rate_limit/);
  assert.match(attempt, /status:\s*503/);
  assert.doesNotMatch(attempt, /chido_risk|RISK_SIGNING_SECRET/);
  assert.match(reset, /auth\.getUser\(\)/);
  assert.match(reset, /reset_rate_limit/);
  assert.match(login, /if \(!riskResponse\)/);
  assert.doesNotMatch(login, /Pago al toque|\+50k jugando|Entrar al casino/i);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(resetMigration, /reset_rate_limit/);
});

test("database enforces adult KYC and cryptographic game fairness", async () => {
  const compliance = await source("supabase/migrations/20260806180000_compliance_kyc_rate_hardening_20260806.sql");
  const fairness = await source("supabase/migrations/20260806181000_game_fairness_access_hardening_20260806.sql");
  const history = await source("supabase/migrations/20260806182000_private_game_history_rpc_20260806.sql");
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
  assert.match(history, /get_my_slot_history/);
  assert.match(history, /revoke select on public\.slot_spins from authenticated/);
});

test("profile history uses owner-scoped RPCs instead of admin table reads", async () => {
  const history = await source("src/app/api/profile/history/route.ts");
  assert.match(history, /auth\.getUser\(\)/);
  assert.match(history, /get_my_crash_history/);
  assert.match(history, /get_my_slot_history/);
  assert.doesNotMatch(history, /supabaseAdmin/);
  assert.doesNotMatch(history, /\.from\("crash_bets"\)|\.from\("slot_spins"\)/);
});

test("admin financial settlements record actor audit atomically", async () => {
  const migration = await source("supabase/migrations/20260806183000_atomic_admin_financial_audit_20260806.sql");
  const deposit = await source("src/app/api/payments/manual/confirm/route.ts");
  const withdrawal = await source("src/app/api/payments/withdraw/admin/route.ts");
  assert.match(migration, /admin_confirm_manual_deposit_audited/);
  assert.match(migration, /admin_settle_withdrawal_audited/);
  assert.match(migration, /transactions_audit/);
  assert.match(migration, /ADMIN_ACTOR_REQUIRED/);
  assert.match(migration, /revoke all on function public\.admin_confirm_manual_deposit[\s\S]*service_role/i);
  assert.match(deposit, /admin_confirm_manual_deposit_audited/);
  assert.match(withdrawal, /admin_settle_withdrawal_audited/);
  assert.doesNotMatch(deposit, /auditAdminAction/);
  assert.doesNotMatch(withdrawal, /auditAdminAction/);
  assert.match(deposit, /audit_recorded/);
  assert.match(withdrawal, /audit_recorded/);
});

test("authenticated navigation and account remain prelaunch-only", async () => {
  const layout = await source("src/components/layout/main-layout.tsx");
  const profile = await source("src/app/profile/page.tsx");
  assert.match(layout, /Sin depósitos, apuestas con dinero real ni premios monetarios/i);
  assert.match(layout, /Verificación KYC/);
  assert.doesNotMatch(layout, /\/wallet|Bonos|Torneos|Afiliados|VIP/);
  assert.match(profile, /Completar KYC/);
  assert.match(profile, /Operación real|operaciones con dinero real/i);
  assert.doesNotMatch(profile, /Depositar|Retirar|balance\/cashback|Historial de juego/i);
});
