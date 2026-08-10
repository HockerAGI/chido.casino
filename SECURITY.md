# Security Policy

## Supported version

Security fixes target the current `main` release line and are validated on an isolated hardening branch before promotion.

## Reporting a vulnerability

Do not open a public issue for payment or payout flaws, webhook-signature issues, authorization bypasses, exposed credentials, balance manipulation, KYC or personal-data exposure, cross-user access, or infrastructure weaknesses.

Report privately to **contacto.hocker@gmail.com** with the affected component, safe reproduction steps, impact, required privileges, and minimal redacted evidence.

Never include live credentials, payment-card data, KYC documents, personal data, destructive payloads, or sensitive production records in a public report.

Critical payment integrity, authorization, secrets, balance, payout, KYC, destructive-action, and cross-tenant findings block release until remediated and regression-tested. Fixes must preserve idempotency, audit evidence, and rollback capability.
