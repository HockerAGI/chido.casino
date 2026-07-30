# Chido Casino

Chido Casino (chido.casino) is a Mexico-focused gaming and wallet app built with Next.js App Router, Supabase, Tailwind CSS and TypeScript.

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
| `/wallet` | Mercado Pago deposits, Stripe fallback deposits, CLABE withdrawals |
| `/vip` | VIP Club |
| `/promos` | Promotions |
| `/tournaments` | Tournaments |
| `/profile` | User account |
| `/affiliates` | Affiliate program |
| `/support` | Support |
| `/legal` | Terms and privacy |

## Payment Integration

- Primary deposit gateway: Mercado Pago Checkout Pro.
- Secondary deposit gateway: Stripe Checkout.
- Deposit creation endpoint: `/api/payments/create-deposit`.
- Mercado Pago webhook: `/api/webhooks/mercadopago`.
- Stripe webhook: `/api/webhooks/stripe`.
- Removed providers: AstroPay, Juno/Bitso and new manual deposit generation.
- Manual deposit admin endpoints remain only to settle historical pending records and require a server-verified admin session.

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
NEXT_PUBLIC_SITE_URL
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_WEBHOOK_SECRET
MERCADOPAGO_REQUIRE_WEBHOOK_SIGNATURE=1
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
ALLOW_LEGACY_ADMIN_TOKEN=0
TELEGRAM_BOT_TOKEN (optional)
NEXT_PUBLIC_SUPPORT_WHATSAPP
NEXT_PUBLIC_SUPPORT_EMAIL
```

## Supabase

- `supabase/schema.sql` and `supabase/migration_hardening.sql` contain earlier hardening work.
- `supabase/migrations/20260729_000001_payment_admin_grants_hardening.sql` narrows grants, blocks profile role/KYC self-escalation and limits new `deposit_intents.provider` values to `mercadopago` or `stripe`.

## CI

`.github/workflows/ci.yml` runs install, typecheck and build. Use this check as required branch protection on `main`.

## Branding Rules

- Always use "Chido Wallet" for the wallet.
- Mexican slang can appear in UI content but not in legal/footer content.
- Logo assets are in `public/`.
