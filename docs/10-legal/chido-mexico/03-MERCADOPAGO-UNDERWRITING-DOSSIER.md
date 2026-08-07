# CHIDO — Dossier para evaluación comercial de Mercado Pago

Estado: DRAFT / NO ENVIADO  
Producto: APP-05 Chido Casino  
Ecosistema: HOCKER AGI Technologies  
Objetivo: obtener aprobación expresa para industria gambling regulada en México antes de habilitar producción.

## Hallazgo

Mercado Pago documenta campos específicos para la industria `Gambling`, lo que demuestra soporte técnico de la categoría. Esto no equivale a aceptación comercial automática.

Los Términos de Mercado Pago Standard establecen que los usos prohibidos pueden recibir excepciones únicamente si Mercado Pago las consiente expresamente y siempre que no infrinjan la ley.

Fuentes:
- https://www.mercadopago.com.mx/developers/pt/docs/checkout-api-payments/additional-content/industry-data/gambling
- https://www.mercadolibre.com.mx/ayuda/terminos-y-condiciones_299

## Identidad comercial correcta

CHIDO Casino no se presentará como empresa independiente. El expediente debe identificar:

- **HOCKER AGI Technologies** como ecosistema/propietario de APP-05 CHIDO;
- la razón social HOCKER que finalmente quede constituida como merchant/operadora, o la subsidiaria regulada controlada por HOCKER si la estructura legal aprobada así lo requiere;
- **CHIDO Casino** como nombre comercial/producto APP-05;
- el dominio y aplicaciones asociados a APP-05;
- la relación con un permisionario, si el modelo aprobado usa uno.

Nunca solicitar underwriting con una entidad “CHIDO” inexistente ni con una cuenta personal para la operación regulada.

## Momento correcto para enviar

Abrir preevaluación desde ahora, pero solicitar underwriting definitivo cuando existan:

- sociedad mercantil HOCKER o entidad regulada HOCKER aprobada;
- RFC empresarial;
- cuenta bancaria empresarial;
- permiso DGJS/SEGOB o estructura jurídicamente aprobada con permisionario;
- dominio definitivo de APP-05;
- términos/privacidad;
- programa AML/KYC;
- flujo de depósitos/retiros y conciliación.

## Solicitud de escalamiento

**Asunto: Solicitud de evaluación comercial / risk underwriting — Gambling regulado México — HOCKER AGI Technologies / APP-05 Chido Casino**

HOCKER AGI Technologies desarrolla un portafolio de aplicaciones y servicios tecnológicos. Uno de sus productos oficiales es **APP-05 Chido Casino**, plataforma de juegos con apuestas dirigida exclusivamente a personas adultas ubicadas en México.

La funcionalidad de dinero real de APP-05 permanece técnicamente deshabilitada hasta contar con la autorización regulatoria aplicable y con aprobación expresa del proveedor de pagos.

Solicitamos que este caso sea escalado al área responsable de aceptación comercial, compliance y risk underwriting para la industria Gambling en México, con el propósito de conocer y satisfacer anticipadamente todos los requisitos para una cuenta empresarial productiva de la entidad HOCKER que resulte titular/operadora autorizada.

La plataforma contempla:

- KYC documental;
- verificación de mayoría de edad;
- controles de geolocalización;
- autoexclusión y límites;
- prevención de lavado y revisión de operaciones;
- ledger auditable;
- idempotencia y conciliación;
- webhook autenticado;
- revisión de discrepancias;
- atención de reclamaciones y chargebacks;
- certificación independiente de juegos antes de dinero real.

Agradecemos confirmar:

1. si Mercado Pago puede evaluar y aprobar expresamente esta actividad en México;
2. si la cuenta merchant puede estar a nombre de la sociedad matriz HOCKER cuando CHIDO es uno de sus productos regulados, o si exigen una entidad dedicada;
3. documentos regulatorios y corporativos requeridos;
4. productos de cobro autorizables para depósitos;
5. disponibilidad y requisitos de payouts/retiros a cuentas bancarias mexicanas;
6. restricciones de métodos de pago (tarjeta, SPEI, efectivo u otros);
7. reservas, rolling reserve, límites o garantías aplicables;
8. reglas específicas de contracargos/fraude;
9. campos de industria Gambling obligatorios/recomendados;
10. responsable comercial o de riesgo asignable al expediente;
11. evidencia escrita que constituirá la aprobación de producción.

## Evidence pack a entregar

### Corporativo HOCKER
- acta constitutiva;
- RFC;
- poderes;
- identificación del representante;
- estructura accionaria y beneficiario controlador;
- domicilio;
- cuenta bancaria de la entidad merchant;
- evidencia de que APP-05 Chido Casino pertenece al portafolio/producto de HOCKER;
- licencias/cesiones de marca e IP si una subsidiaria regulada es el merchant.

### Regulatorio
- permiso/resolución DGJS;
- modificaciones aplicables;
- dominio/página autorizada;
- memo jurídico de estructura si participa un permisionario o subsidiaria;
- políticas AML/KYC.

### Producto APP-05
- URL de staging/prelaunch;
- journey de registro/KYC;
- reglas de cada juego;
- política de depósitos/retiros;
- política de bonos;
- juego responsable;
- privacidad y términos;
- soporte/reclamaciones.

### Riesgo y pagos
- ticket mínimo/máximo propuesto;
- volumen estimado mensual;
- payout esperado;
- métodos de depósito;
- proceso de retiro;
- chargeback workflow;
- fraude y device/rate controls;
- conciliación diaria;
- contactos de incidentes.

## Canales oficiales localizados

Mercado Pago Developers dispone de Centro de Soporte para Integraciones y consultas personalizadas:
https://www.mercadopago.com.mx/developers/en/support/30981

Mercado Pago México también publica portal de ayuda y canales de contacto:
https://www.mercadopago.com.mx/blog/como-contactar-mercado-pago

La UNE es canal de reclamaciones financieras, no el canal principal para solicitar underwriting comercial.

## Regla de producción

No considerar aprobación válida:

- tener Access Token productivo;
- lograr un pago de prueba o real;
- que Checkout muestre tarjeta/SPEI;
- recibir respuesta genérica de soporte;
- que exista documentación técnica `Gambling`.

Aprobación válida = consentimiento comercial/risk expreso atribuible a Mercado Pago para **la entidad HOCKER merchant correcta, APP-05 CHIDO, la actividad Gambling, México y la cuenta correspondientes**.
