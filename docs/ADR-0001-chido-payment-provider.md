# ADR-0001 — Proveedor de pagos de CHIDO

- **Estado:** Propuesto para aprobación
- **Fecha:** 2026-08-06
- **Alcance:** CHIDO Casino México

## Decisión

CHIDO no utilizará Stripe para depósitos, retiros ni cualquier transacción relacionada con apuestas, casino, premios monetarios o saldo de juego.

Mercado Pago será el único proveedor candidato para CHIDO en México, sujeto a todos los siguientes gates:

1. Jurisdicción y licencia aplicable aprobadas.
2. Aprobación expresa y por escrito de Mercado Pago para el modelo de negocio.
3. KYC/AML, juego responsable, límites y autoexclusión operativos.
4. Webhooks firmados, idempotencia, ledger y conciliación probados.
5. Entorno de producción habilitado explícitamente mediante variables de control.

Hasta cumplirlos, pagos y depósitos deben permanecer fail-closed.

## Motivo

Stripe clasifica los juegos de casino, apuestas por Internet, sorteos, concursos y actividades con premios monetarios o materiales como negocios prohibidos. Mantener Stripe en CHIDO crea riesgo de cierre de cuenta, retención de fondos, incumplimiento contractual y pérdida de continuidad.

Mercado Pago publica documentación técnica específica para la industria de gambling, pero sus términos exigen cumplimiento legal y permiten excepciones únicamente mediante consentimiento expreso. La existencia de documentación técnica no sustituye la aprobación comercial ni regulatoria.

## Arquitectura

- `CHIDO_PAYMENT_MODE=disabled` por defecto.
- Preview/sandbox: requiere `CHIDO_PAYMENT_MODE=sandbox` y `CHIDO_PAYMENT_SANDBOX_AUTHORIZED=1`; nunca se permite en `VERCEL_ENV=production`.
- Producción: requiere simultáneamente:
  - `CHIDO_PAYMENT_MODE=production`
  - `CHIDO_GAMBLING_LICENSE_APPROVED=1`
  - `CHIDO_MERCADOPAGO_WRITTEN_APPROVAL=1`
  - `CHIDO_KYC_AML_READY=1`
- Stripe permanece denegado por código en todos los entornos de CHIDO.

## Transición

1. Bloquear nuevas sesiones Stripe.
2. Mantener temporalmente un webhook tombstone que responda 2xx sin acreditar fondos.
3. Confirmar que no existen intents Stripe pendientes.
4. Retirar cron y Edge Functions Stripe obsoletas.
5. Restringir `deposit_intents.provider` a `mercadopago`.
6. Probar Mercado Pago únicamente en preview/sandbox.
7. Activar producción solo tras aprobar el evidence pack.

## Consecuencias

### Positivas

- Reduce riesgo contractual y financiero.
- Simplifica conciliación y soporte.
- Centraliza tarjetas, transferencias y métodos locales mexicanos.
- Mantiene Stripe disponible para productos HOCKER no relacionados con apuestas.

### Costos y riesgos

- Dependencia principal de un proveedor en México.
- Se requiere plan de salida y segundo PSP regulado a futuro.
- La aprobación de Mercado Pago puede imponer reservas, límites o requisitos adicionales.

## Rollback

El rollback de código puede restaurar la versión anterior, pero no debe reactivar Stripe para CHIDO. Ante falla de Mercado Pago, el comportamiento correcto es congelar depósitos y mantener retiros/conciliación bajo operación controlada.
