# Security Policy

## Supported code

Security fixes are accepted only against the current default branch and active security-hardening branches. Historical deployments and archived experiments are not supported.

## Reporting a vulnerability

Do not open a public issue containing credentials, personal information, KYC documents, payment identifiers, exploit payloads or player financial data.

Report privately to the repository owner through GitHub private vulnerability reporting when available, or through the security contact configured by HOCKER AGI Technologies.

Include:

- affected route, function, migration or commit;
- reproducible steps using synthetic data;
- expected and observed behavior;
- financial, privacy, authentication or availability impact;
- proposed remediation when known.

## Critical security properties

A release must preserve all of the following:

1. Stripe is never used for CHIDO casino, gambling or monetary-prize activity.
2. Mercado Pago and game writes fail closed unless the correct environment, license, provider approval, KYC/AML and operational gates are proven.
3. Wallet mutations are atomic, idempotent and server-side.
4. Administrative financial actions record the authenticated actor in the same database transaction.
5. KYC documents remain private, short-lived when viewed and linked to an auditable review case.
6. Verified adulthood, KYC and self-exclusion are enforced inside PostgreSQL before deposits or wagers.
7. Game outcomes are reproducible from committed seed material and validated inside PostgreSQL.
8. Preview deployments never write to production financial or game data.
9. Secrets are never committed, logged, embedded in clients or copied into issues.
10. Production changes require tests, lint, typecheck, dependency audit, preview validation, migration validation and rollback evidence.

## Severity and response

- **Critical:** credential exposure, unauthorized wallet mutation, KYC disclosure, authentication bypass, forged settlement, cross-user data access.
- **High:** replay allowing financial inconsistency, missing actor audit, bypass of self-exclusion/KYC/age controls, production-preview data mixing.
- **Moderate:** dependency or configuration weakness with constrained exploitability.
- **Low:** defense-in-depth issue without direct impact.

Critical and high findings block release. There is no accepted-risk path for real-money operation without explicit executive, legal and security approval.

## Safe testing

Use synthetic accounts and isolated Supabase/Vercel environments. Do not test payments, wagers, withdrawals, KYC uploads or destructive migrations against production without a written release procedure and rollback plan.
