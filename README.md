# Chido Casino

Chido Casino (`https://chidocasino.vercel.app`) is a Mexico-focused gaming and wallet app built with Next.js App Router, Supabase, Tailwind CSS and TypeScript.

## Architecture

- Framework: Next.js App Router
- Auth/DB: Supabase
- Styling: Tailwind CSS
- Runtime: Node.js 24
- Local dev: `npm run dev` on port 3000

## Key Routes

| Route | Description |
| --- | --- |
| `/` | Landing page and main CTA |
| `/login`, `/signup` | Auth pages |
| `/lobby` | Main game lobby |
| `/games/crash` | Chido Crash |
| `/games/taco-slot` | Taco Slot |
| `/wallet` | Mercado Pago deposits subject to compliance gates and CLABE withdrawal requests |
| `/vip` | VIP Club |
| `/promos` | Promotions |
| `/tournaments` | Tournaments |
| `/profile` | User account |
| `/affiliates` | Affiliate program |
| `/support` | Support |
| `/legal` | Terms and privacy |

## Payment Provider Policy

CHIDO uses a fail-closed payment policy.

- Stripe is not allowed for any CHIDO deposit, withdrawal or gaming-related transaction.
- Mercado Pago is the only candidate provider for Mexico.
- Production payments remain disabled until the applicable license, written Mercado Pago approval and KYC/AML controls are approved.
- Preview testing is sandbox-only and must be explicitly authorized.
- If the provider is unavailable or a gate is missing, deposits remain frozen rather than falling back to another processor.

The formal decision and transition plan are recorded in `docs/ADR-0001-chido-payment-provider.md`.

### Payment routes

- Deposit creation: `/api/payments/create-deposit`
- Mercado Pago Checkout API: `/api/payments/mercadopago/process-payment`
- Mercado Pago webhook: `/api/webhooks/mercadopago`
- Stripe tombstone webhook: `/api/webhooks/stripe`; acknowledges legacy deliveries without crediting funds

### Required payment gates

```text
# Safe default
CHIDO_PAYMENT_MODE=disabled

# Preview/sandbox only
CHIDO_PAYMENT_MODE=sandbox
CHIDO_PAYMENT_SANDBOX_AUTHORIZED=1

# Production requires every gate below
CHIDO_PAYMENT_MODE=production
CHIDO_GAMBLING_LICENSE_APPROVED=1
CHIDO_MERCADOPAGO_WRITTEN_APPROVAL=1
CHIDO_KYC_AML_READY=1
```

## Admin Security

Admin API routes require a Supabase session that passes at least one of:

- `profiles.role` is `admin`, `owner` or `super_admin`.
- `project_members.project_id = chido-casino` and role is `admin` or `owner`.
- An active `hocker_portal_grants` record covering the requested admin permission.

The legacy `x-admin-token` path is disabled by default. It only works when `ALLOW_LEGACY_ADMIN_TOKEN=1` and `ADMIN_API_TOKEN` is configured.

## Required Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://chidocasino.vercel.app
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_WEBHOOK_SECRET
MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE=1
CHIDO_PAYMENT_MODE=disabled
CHIDO_PAYMENT_SANDBOX_AUTHORIZED=0
CHIDO_GAMBLING_LICENSE_APPROVED=0
CHIDO_MERCADOPAGO_WRITTEN_APPROVAL=0
CHIDO_KYC_AML_READY=0
ALLOW_LEGACY_ADMIN_TOKEN=0
TELEGRAM_BOT_TOKEN (optional)
NEXT_PUBLIC_SUPPORT_WHATSAPP
NEXT_PUBLIC_SUPPORT_EMAIL
```

Stripe credentials must not be configured in the CHIDO Vercel project. Stripe can remain available only in separate HOCKER products whose business model complies with Stripe policy.

## Supabase

- `supabase/schema.sql` and `supabase/migration_hardening.sql` contain earlier hardening work.
- `supabase/migrations/20260806170000_chido_payment_provider_hardening_20260806.sql` removes the invalid provider default, restricts future intents to Mercado Pago, adds a positive-amount invariant, removes the duplicate audit trigger and unschedules the retired Stripe worker.
- The migration must be tested in an isolated Supabase branch before production.

## CI

`.github/workflows/ci.yml` runs reproducible install, regression tests, lint, typecheck, build and a production dependency audit. All checks, preview smoke tests and migration validation must be green before merge.

## Branding Rules

- Always use "Chido Wallet" for the wallet.
- Mexican slang can appear in UI content but not in legal/footer content.
- Logo assets are in `public/`.
