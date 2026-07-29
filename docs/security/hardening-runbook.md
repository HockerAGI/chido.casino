# Chido Casino Hardening Runbook

## Payments

- Primary deposit provider: Mercado Pago Checkout Pro.
- Secondary deposit provider: Stripe Checkout.
- Removed provider code paths: AstroPay, Juno/Bitso and new manual deposit generation.
- Manual deposit admin endpoints remain only for historical pending records and require a server-verified admin session.

Required production secrets:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE=1`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Optional: `STRIPE_API_VERSION` when Stripe API version is pinned intentionally.

## GitHub Branch Protection

Enable on `main` after the CI workflow is merged:

- Require pull request before merging.
- Require the `CI / verify` status check.
- Require conversation resolution.
- Require linear history.
- Restrict force pushes and deletions.
- Require signed commits if the organization policy supports it.

## Supabase

Apply `supabase/migrations/20260729_000001_payment_admin_grants_hardening.sql` after checking for legacy non-Mercado-Pago/non-Stripe `deposit_intents.provider` rows. The constraint is added `NOT VALID` first so old rows do not block the migration, while new rows are limited to `mercadopago` or `stripe`.

## Stripe Edge Functions

The deployed Supabase functions `stripe-setup`, `stripe-webhook` and `stripe-worker` should be treated as a legacy Stripe Sync Engine integration until their exact source bundle is committed. Keep them disabled for Chido deposit crediting; the Chido deposit path now uses `/api/webhooks/stripe` in the Next app.
