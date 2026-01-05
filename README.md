# chido.casino Core (MVP)

Stack:
- Next.js (App Router)
- Tailwind
- Supabase (Auth + DB)
- Stripe (Checkout + Webhook)

Flujo:
1) Usuario se registra / inicia sesión (Supabase)
2) Wallet muestra saldo (Supabase)
3) Depositar crea un Checkout Session (Stripe)
4) Webhook acredita saldo (Supabase, idempotente)