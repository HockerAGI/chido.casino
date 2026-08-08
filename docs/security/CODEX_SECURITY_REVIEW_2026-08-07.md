# Chido Casino — Codex Security Review — 2026-08-07

## Status

**Connector-assisted standard security review. No payment configuration change, Supabase production DDL, merge or production deployment is authorized.**

This review follows the installed Codex Security standard methodology. The native Codex Security worker/scan-ID runtime is not exposed in this ChatGPT environment, so source inspection used the authenticated GitHub/Supabase connectors. Coverage is **partial / connector-assisted**.

Repository: `HockerAGI/chido.casino`
Version: hardening candidate branch `hardening/production-readiness-20260807`

## Threat model

### Assets
- Player identity, balances and wagering state.
- Deposit/withdrawal and KYC state.
- Stripe/Mercado Pago webhook authenticity.
- Atomic settlement/idempotency guarantees.
- Supabase service-role/payment credentials.

### Trust boundaries
- Public client → authenticated game/payment APIs.
- Payment provider webhook → server verification → atomic database RPC.
- Application/service role → privileged financial functions.
- GitHub candidate branch → Vercel Preview/Production.

### Security invariants
- Payment credit cannot be derived from unverified client input.
- Webhook signatures/timestamps must be verified before processing.
- Amount, currency, user and folio must match the server-created intent.
- Deposit/game settlement must be atomic and idempotent.
- Sensitive financial SECURITY DEFINER functions must not be callable by anon/auth unless explicitly designed for that role.
- Complete dependency graph must have no known advisories at the configured LOW gate.

## Validated controls

1. Stripe webhook validates HMAC signature using timing-safe comparison and rejects stale timestamps.
2. Only creditable Stripe event types and `payment_status=paid` proceed.
3. Server-side intent lookup validates provider, expected user, folio, amount and MXN currency before credit.
4. Credit is delegated to `credit_deposit_atomic`; already-credited intents return idempotently.
5. Current production privilege checks confirmed key wallet/wager SECURITY DEFINER functions are **not executable** by `anon` or `authenticated` roles.
6. Hardening CI passes tests, lint, typecheck, build, production audit and complete dependency audit from LOW on the validated candidate baseline.
7. GitHub Actions are pinned to immutable SHAs with non-persistent checkout credentials, plus CODEOWNERS/Dependabot/private disclosure policy.

## Residual findings

### P1 (validation environment only) — drift table with RLS disabled and broad client grants
The separate Supabase validation project contains `public.validation_settlement_marker`, which is not found in the current Chido repository. It has RLS disabled, zero rows, and direct privileges for both `anon` and `authenticated`, including SELECT/INSERT/UPDATE/DELETE/TRUNCATE. This is validation-environment drift, not evidence of the same exposure in production.

**Required remediation:** do not invent an RLS policy for an unowned drift object. Keep the validation project paused when unused, determine whether the marker is still required, then either remove it or recreate it through a versioned migration with least-privilege grants/RLS.

### P1 — provider credential rotation remains a release gate
Stripe/Mercado Pago/Supabase secrets referenced by runtime must be rotated through their provider control planes if they appeared in the external credentials document. No secret value is recorded here.

## Coverage

Reviewed high-risk surfaces include Stripe webhook verification/intent matching/atomic credit, production database execution privileges for key financial functions, dependency/supply-chain gates and validation-environment drift. This connector-assisted review does not assert exhaustive route/function coverage or native independent Codex Security worker execution.
