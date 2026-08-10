# ADR-0001 — Proveedor de pagos de CHIDO

- **Estado:** Propuesto; bloqueado para producción
- **Fecha:** 2026-08-06
- **Alcance:** CHIDO Casino México

## Decisión

CHIDO no utilizará Stripe para depósitos, retiros ni cualquier transacción relacionada con apuestas, casino, premios monetarios o saldo de juego.

Mercado Pago será el único proveedor candidato para CHIDO en México. Su activación depende de todos estos gates:

1. Jurisdicción y licencia aplicable aprobadas.
2. Aprobación expresa y por escrito de Mercado Pago para el modelo de negocio.
3. KYC/AML, límites, juego responsable y autoexclusión operativos.
4. Webhooks firmados, idempotencia, ledger y conciliación probados.
5. Separación comprobada entre sandbox y producción.
6. Evidence pack, rollback y aprobación ejecutiva.

Hasta cumplirlos, depósitos y apuestas con saldo deben permanecer fail-closed.

## Motivo

Stripe clasifica casino, apuestas por Internet y actividades con premios monetarios o materiales como negocios prohibidos. Mantener Stripe en CHIDO expone a cierre de cuenta, retención de fondos, incumplimiento contractual y pérdida de continuidad.

Mercado Pago publica documentación técnica para la industria de gambling, pero sus términos exigen cumplimiento legal y consentimiento expreso para actividades restringidas. La integración técnica no equivale a autorización comercial ni regulatoria.

## Arquitectura de entornos

### Estado seguro

```text
CHIDO_PAYMENT_MODE=disabled
```

### Sandbox

Requiere simultáneamente:

```text
VERCEL_ENV != production
CHIDO_PAYMENT_MODE=sandbox
CHIDO_PAYMENT_SANDBOX_AUTHORIZED=1
MERCADOPAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_SUPABASE_URL=https://<non-production-ref>.supabase.co
CHIDO_PAYMENT_WEBHOOK_BASE_URL=https://<sandbox-host>
```

El sandbox rechaza el proyecto Supabase productivo.

### Producción

Requiere simultáneamente:

```text
VERCEL_ENV=production
CHIDO_PAYMENT_MODE=production
CHIDO_GAMBLING_LICENSE_APPROVED=1
CHIDO_MERCADOPAGO_WRITTEN_APPROVAL=1
CHIDO_KYC_AML_READY=1
MERCADOPAGO_ACCESS_TOKEN=<production credential>
NEXT_PUBLIC_SUPABASE_URL=https://yvuibbcuntqpyqiuqggd.supabase.co
CHIDO_PAYMENT_WEBHOOK_BASE_URL=https://<production-host>
```

Además, cada usuario debe tener `kyc_status=approved` y no estar autoexcluido.

## Contrato de depósito

1. Crear un `deposit_intent` con folio único.
2. Crear preferencia Mercado Pago.
3. Mantener el intent en `created` hasta el submit del Payment Brick.
4. Reclamarlo atómicamente con `created -> processing`.
5. Rechazar submits concurrentes con HTTP 409.
6. Resolver a `pending`, `credited`, `failed` o `review_required`.
7. Acreditar únicamente mediante `credit_deposit_atomic`.
8. Conciliar webhooks repetidos, atrasados y fuera de orden.

## Transición

1. Bloquear nuevas sesiones Stripe.
2. Mantener temporalmente un webhook tombstone 2xx sin acreditación.
3. Confirmar que no existen intents Stripe pendientes.
4. Retirar cron y Edge Functions Stripe obsoletas.
5. Restringir `deposit_intents.provider` a `mercadopago`.
6. Probar Mercado Pago con credenciales y base sandbox.
7. Completar KYC/AML y responsible gaming.
8. Activar producción solo después del evidence pack.

## Continuidad

Mercado Pago será proveedor principal, no punto único definitivo. Antes de escala comercial se debe evaluar un segundo PSP que acepte explícitamente gambling regulado en México. No se implementará fallback automático: ante indisponibilidad, depósitos se congelan y conciliación/retiros continúan bajo operación controlada.

## Consecuencias positivas

- Reduce riesgo contractual y financiero.
- Simplifica conciliación, soporte y observabilidad.
- Centraliza métodos locales mexicanos.
- Conserva Stripe para productos HOCKER no relacionados con apuestas.
- Evita que previews utilicen credenciales o datos productivos.

## Costos y riesgos

- Dependencia inicial de Mercado Pago.
- Posibles reservas, límites o requisitos adicionales.
- Necesidad de un segundo PSP regulado a futuro.
- Mayor disciplina operativa para KYC, conciliación y segregación de entornos.

## Rollback

Revertir código no autoriza reactivar Stripe. Ante una falla de Mercado Pago o de cualquier gate, el estado correcto es `CHIDO_PAYMENT_MODE=disabled`, depósitos congelados y evidencia preservada.
