import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const policyUrl = new URL("../src/lib/paymentPolicy.ts", import.meta.url);
const createDepositUrl = new URL(
  "../src/app/api/payments/create-deposit/route.ts",
  import.meta.url,
);
const processPaymentUrl = new URL(
  "../src/app/api/payments/mercadopago/process-payment/route.ts",
  import.meta.url,
);
const stripeWebhookUrl = new URL(
  "../src/app/api/webhooks/stripe/route.ts",
  import.meta.url,
);
const migrationUrl = new URL(
  "../supabase/migrations/20260806170000_chido_payment_provider_hardening_20260806.sql",
  import.meta.url,
);

test("Stripe is never an allowed CHIDO payment provider", async () => {
  const policy = await readFile(policyUrl, "utf8");
  const createDeposit = await readFile(createDepositUrl, "utf8");
  const stripeWebhook = await readFile(stripeWebhookUrl, "utf8");

  assert.match(policy, /stripeAllowed:\s*false/i);
  assert.match(policy, /provider === "stripe"/i);
  assert.match(policy, /PROVIDER_NOT_ALLOWED/i);

  assert.match(createDeposit, /rawMethod === "stripe"/i);
  assert.doesNotMatch(createDeposit, /createStripeCheckoutSession/i);
  assert.doesNotMatch(createDeposit, /from "@\/lib\/stripe"/i);

  assert.match(stripeWebhook, /PROVIDER_NOT_ALLOWED_FOR_CHIDO/i);
  assert.doesNotMatch(stripeWebhook, /credit_deposit_atomic/i);
  assert.doesNotMatch(stripeWebhook, /wallet_apply_delta/i);
});

test("Mercado Pago gates bind credentials, data and webhook environment", async () => {
  const policy = await readFile(policyUrl, "utf8");
  const createDeposit = await readFile(createDepositUrl, "utf8");
  const processPayment = await readFile(processPaymentUrl, "utf8");

  assert.match(policy, /CHIDO_GAMBLING_LICENSE_APPROVED/i);
  assert.match(policy, /CHIDO_MERCADOPAGO_WRITTEN_APPROVAL/i);
  assert.match(policy, /CHIDO_KYC_AML_READY/i);
  assert.match(policy, /CHIDO_PAYMENT_SANDBOX_AUTHORIZED/i);
  assert.match(policy, /CHIDO_PRODUCTION_SUPABASE_PROJECT_REF/i);
  assert.match(policy, /CHIDO_PAYMENT_WEBHOOK_BASE_URL/i);
  assert.match(policy, /SANDBOX_PRODUCTION_DATA_FORBIDDEN/i);
  assert.match(policy, /SANDBOX_CREDENTIAL_REQUIRED/i);
  assert.match(policy, /PRODUCTION_CREDENTIAL_REQUIRED/i);
  assert.match(policy, /PRODUCTION_DATA_ENV_REQUIRED/i);

  assert.match(createDeposit, /authorizeDepositProvider\("mercadopago"\)/i);
  assert.match(processPayment, /authorizeDepositProvider\("mercadopago"\)/i);
  assert.match(createDeposit, /getPaymentWebhookBaseUrl/i);
  assert.match(processPayment, /getPaymentWebhookBaseUrl/i);
  assert.match(createDeposit, /randomBytes/i);
});

test("Payment Brick processing atomically claims one intent", async () => {
  const createDeposit = await readFile(createDepositUrl, "utf8");
  const processPayment = await readFile(processPaymentUrl, "utf8");

  assert.match(createDeposit, /status:\s*"created"/i);
  assert.doesNotMatch(createDeposit, /status:\s*"pending"/i);

  assert.match(processPayment, /status:\s*"processing"/i);
  assert.match(processPayment, /\.eq\("status",\s*"created"\)/i);
  assert.match(processPayment, /PAYMENT_ALREADY_PROCESSING/i);
  assert.match(processPayment, /\.eq\("status",\s*"processing"\)/i);
  assert.match(processPayment, /review_required/i);
});

test("database hardening removes obsolete Stripe automation without deleting evidence", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /provider\s*=\s*'mercadopago'/i);
  assert.match(sql, /alter column provider drop default/i);
  assert.match(sql, /check \(amount > 0\)/i);
  assert.match(sql, /drop trigger if exists trg_audit_transactions/i);
  assert.match(sql, /jobname\s*=\s*'stripe-sync-worker'/i);
  assert.match(sql, /cron\.unschedule\('stripe-sync-worker'\)/i);

  assert.doesNotMatch(sql, /delete\s+from/i);
  assert.doesNotMatch(sql, /truncate/i);
  assert.doesNotMatch(sql, /drop\s+table/i);
});
