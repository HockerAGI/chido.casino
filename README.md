# Chido Casino

Chido Casino is a Mexico-focused gaming and wallet application built with Next.js App Router, Supabase, Tailwind CSS and TypeScript.

## Architecture

- Framework: Next.js App Router
- Auth/DB: Supabase
- Styling: Tailwind CSS
- Runtime: Node.js 24
- Local development: `npm run dev` on port 3000

## Release Status

CHIDO is not authorized for real-money operation yet. Deposits and game settlements must remain fail-closed until legal, provider, KYC/AML, responsible-gaming and technical release gates are complete.

## Key Routes

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Authentication |
| `/lobby` | Game lobby |
| `/games/crash` | Chido Crash |
| `/games/taco-slot` | Taco Slot |
| `/wallet` | Mercado Pago candidate flow and CLABE withdrawal requests |
| `/profile` | User profile and responsible-gaming controls |
| `/legal` | Terms and privacy |

## Payment Provider Decision

CHIDO uses a fail-closed provider policy.

- Stripe is prohibited for CHIDO deposits, withdrawals and gaming-related transactions.
- Mercado Pago is the only candidate provider for Mexico.
- Production payments require applicable licensing, written Mercado Pago approval, platform KYC/AML readiness and an individually approved user KYC state.
- Preview payments require Mercado Pago test credentials, an explicitly authorized sandbox, a non-production Supabase project and a dedicated HTTPS webhook base URL.
- Preview code cannot use the production Supabase project.
- A provider outage or missing gate freezes deposits; there is no automatic fallback to another processor.

The formal decision is recorded in `docs/ADR-0001-chido-payment-provider.md`.

### Payment routes

- Deposit intent and preference: `/api/payments/create-deposit`
- Mercado Pago Checkout API: `/api/payments/mercadopago/process-payment`
- Mercado Pago webhook: `/api/webhooks/mercadopago`
- Stripe tombstone: `/api/webhooks/stripe`; acknowledges legacy deliveries without crediting funds

### Payment state machine

```text
created -> processing -> pending | credited | failed | review_required
```

The Checkout API claims an intent atomically with `created -> processing`. Concurrent submissions receive HTTP 409 and cannot create a second provider charge for the same folio.

### Required payment gates

```text
# Safe default
CHIDO_PAYMENT_MODE=disabled

# Preview/sandbox only
CHIDO_PAYMENT_MODE=sandbox
CHIDO_PAYMENT_SANDBOX_AUTHORIZED=1
CHIDO_PAYMENT_WEBHOOK_BASE_URL=https://<sandbox-host>
CHIDO_PRODUCTION_SUPABASE_PROJECT_REF=yvuibbcuntqpyqiuqggd
MERCADOPAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_SUPABASE_URL=https://<non-production-ref>.supabase.co

# Production requires every gate
CHIDO_PAYMENT_MODE=production
CHIDO_PAYMENT_WEBHOOK_BASE_URL=https://<production-host>
CHIDO_PRODUCTION_SUPABASE_PROJECT_REF=yvuibbcuntqpyqiuqggd
CHIDO_GAMBLING_LICENSE_APPROVED=1
CHIDO_MERCADOPAGO_WRITTEN_APPROVAL=1
CHIDO_KYC_AML_READY=1
MERCADOPAGO_ACCESS_TOKEN=<production credential>
NEXT_PUBLIC_SUPABASE_URL=https://yvuibbcuntqpyqiuqggd.supabase.co
```

Stripe credentials must not be configured in the CHIDO Vercel project. Stripe may remain in separate HOCKER products only when their business model complies with Stripe policy.

## Game Settlement Controls

Taco Slot and Crash use service-only PostgreSQL RPCs. Every new settlement verifies inside the database transaction:

- System kill switch and `allow_write`.
- Existing profile.
- `kyc_status = approved`.
- No active self-exclusion.
- Positive bet and payout invariants.
- Consistent multiplier, cashout and payout mathematics.
- Valid fairness material.
- Unique round reference.

Replays return the persisted result, including reels or crash point, seeds, payout and multipliers. The API never returns a newly recalculated outcome for an already settled round.

`src/instrumentation-client.ts` adds a scoped idempotency key to the two game POST routes before React hydration. The server rejects requests without a valid key.

## KYC Lifecycle

Allowed states:

```text
unverified -> pending -> review_required | approved | rejected
```

Only `approved` authorizes production deposits or new game settlements. Administrative updates reject unknown states and are audited.

## Responsible Gaming

Responsible-gaming and promotion lookups are fail-closed. Missing profiles, schema errors, invalid dates or unavailable promo settings return an unavailable state and block deposits or wagers.

## Supabase Migrations in This Change

- `20260806170000_chido_payment_provider_hardening_20260806.sql`
  - Mercado Pago-only deposit provider.
  - Deposit lifecycle, currency and external-ID constraints.
  - Removes duplicate transaction audit trigger.
  - Unschedules the retired Stripe worker.
- `20260806173000_chido_game_settlement_fail_closed_20260806.sql`
  - Database-level game gates.
  - Complete persisted replay responses.
  - Service-role-only execution.
- `20260806173500_kyc_status_constraint_20260806.sql`
  - Constrains KYC lifecycle values.
- `20260806174000_game_row_constraints_20260806.sql`
  - Enforces game row and fairness invariants.
  - Preserves two legacy Taco rows for separate reconciliation.

All migrations must be validated in an isolated Supabase branch before production.

## CI and Release Gate

`.github/workflows/ci.yml` is intended to run:

1. Reproducible install.
2. Regression tests.
3. Lint.
4. Typecheck.
5. Production build.
6. Production dependency audit.

A Vercel preview build is not sufficient by itself. Merge and production deployment require CI, isolated migration tests, authenticated smoke tests, rollback evidence and explicit legal/commercial approval.

## Required Core Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_WEBHOOK_SECRET
MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE=1
CHIDO_PAYMENT_MODE=disabled
CHIDO_PAYMENT_SANDBOX_AUTHORIZED=0
CHIDO_PAYMENT_WEBHOOK_BASE_URL
CHIDO_PRODUCTION_SUPABASE_PROJECT_REF=yvuibbcuntqpyqiuqggd
CHIDO_GAMBLING_LICENSE_APPROVED=0
CHIDO_MERCADOPAGO_WRITTEN_APPROVAL=0
CHIDO_KYC_AML_READY=0
ALLOW_LEGACY_ADMIN_TOKEN=0
```

## Branding Rules

- Use “Chido Wallet” for the wallet.
- Mexican slang may appear in product UI, but not in legal or compliance copy.
- Logo assets are stored under `public/`.
