# CHIDO isolated compliance validation — 2026-08-06

Validation project: `pswlloziztxjsjazfiiy` (`us-west-1`)

No production rows, credentials or personal information were copied. The sandbox was reconstructed from schema metadata and synthetic UUID fixtures.

## Applied migrations

1. `20260806170000_chido_payment_provider_hardening_20260806.sql`
2. `20260806173000_chido_game_settlement_fail_closed_20260806.sql`
3. `20260806173500_kyc_status_constraint_20260806.sql`
4. `20260806174000_game_row_constraints_20260806.sql`
5. `20260806180000_compliance_kyc_rate_hardening_20260806.sql`
6. `20260806181000_game_fairness_access_hardening_20260806.sql`

## Verified controls

- Stripe rejected by `deposit_intents` constraint.
- Mercado Pago amount, MXN currency, lifecycle and external-ID uniqueness enforced.
- Game settlement RPCs executable by `service_role`, not `anon` or `authenticated`.
- Direct client inserts to game tables denied.
- Kill switch, KYC, verified adulthood and self-exclusion fail closed.
- Taco and Crash settle atomically and replay the persisted result without changing balances.
- Cross-user round references are rejected.
- Invalid payout math rolls back wallet and ledger writes.
- KYC request lifecycle is atomic and creates an audit record in the same transaction.
- KYC bucket is private, limited to 8 MiB and JPEG/PNG/PDF.
- Rate limiter allows the configured first three hits and rejects the fourth.
- Deposit intent creation requires approved KYC, verified adult age and no active self-exclusion.
- PostgreSQL recomputes Taco reels/multiplier and Crash point from the committed seed material.
- Seed hash mismatches and forged game outcomes are rejected.
- `authenticated` direct SELECT on `crash_bets` is revoked; owner history is exposed through a scoped RPC.

## Final synthetic evidence

```json
{
  "rate_hits": 3,
  "audit_rows": 1,
  "crash_bets": 1,
  "kyc_status": "approved",
  "slot_spins": 1,
  "age_verified": true,
  "bucket_limit": 8388608,
  "transactions": 3,
  "wager_effects": 2,
  "bucket_private": true,
  "deposit_intents": 1
}
```

Production remains unchanged. This evidence validates migration behavior only; it does not constitute legal authorization, provider approval or independent mathematical certification.
