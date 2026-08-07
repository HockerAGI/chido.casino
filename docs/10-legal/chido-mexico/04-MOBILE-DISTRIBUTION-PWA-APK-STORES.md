# CHIDO — Estrategia de distribución PWA, APK, Google Play y App Store

Estado: DRAFT / LEGAL + STORE REVIEW REQUIRED

## Respuesta corta

PWA o APK no eliminan las obligaciones de licencia. Cambian el canal de distribución, no la naturaleza regulada del casino.

## Por qué muchos casinos usan PWA o APK

### PWA

Ventajas reales:
- publicación inmediata desde dominio propio;
- actualizaciones sin revisión de tienda;
- una sola base de producto web;
- menor dependencia de políticas de Apple/Google;
- onboarding desde campañas web;
- geogate y KYC controlados por el propio backend;
- menor fricción operativa para hotfixes.

Desventajas:
- menor presencia/descubrimiento en tiendas;
- algunas capacidades nativas y push pueden ser inferiores o variar por plataforma;
- el usuario debe instalar desde navegador;
- sigue sujeto a ley, licencia, privacidad, pagos, geolocalización y advertising policies.

### APK directo Android

Ventajas reales:
- evita el proceso de review de Google Play como canal de distribución;
- permite releases rápidos;
- más control sobre versión e integración nativa.

Desventajas/riesgos:
- no evita licencia ni requisitos regulatorios;
- el usuario debe habilitar/aceptar instalación externa;
- aumenta fricción y percepción de riesgo;
- CHIDO asume distribución segura, firma, actualización y protección contra APK falsos;
- ciertas campañas/plataformas pueden desconfiar o restringir landing/download flows;
- pierde confianza y discovery que aporta Play.

### Google Play

Google permite actualmente en México apps de casino online con dinero real, con restricciones. Requisitos principales:
- solicitud y aprobación de Google;
- licencia válida para el producto y territorio;
- impedir menores;
- geobloquear fuera del territorio autorizado;
- descarga gratuita;
- no usar Google Play Billing para gambling;
- clasificación adulta;
- información clara de juego responsable.

México figura actualmente entre los países donde se permiten con restricciones `Online Casino games`, apuestas deportivas y loterías.

Fuentes oficiales:
- https://support.google.com/googleplay/android-developer/answer/9877032
- https://support.google.com/googleplay/android-developer/answer/12256011

El piloto DFS mexicano terminó el 4-jun-2026; esto no significa una prohibición general de casino: Google indica que las apps de gambling real pueden continuar si cumplen la política general y son tipos permitidos en México.

Fuente:
https://support.google.com/googleplay/android-developer/answer/12918670

### Apple App Store

Apple permite apps de casino con dinero real, pero exige:
- licencias y permisos en cada lugar donde se use;
- georrestricción;
- app gratuita;
- no usar In-App Purchase para comprar crédito/dinero de gambling;
- documentación de autorización durante review;
- para campos altamente regulados como gambling, la app debe ser presentada por la entidad legal que presta el servicio, no por un desarrollador individual.

Fuente oficial:
https://developer.apple.com/app-store/review/guidelines/

## Recomendación CHIDO

### Etapa 1 — PWA oficial

Usar PWA como canal principal de lanzamiento una vez que exista autorización regulatoria. Razones:
- es la arquitectura actual más cercana al producto;
- permite controlar geografía, edad y compliance centralmente;
- evita retrasar el lanzamiento por reviews de stores;
- sirve como fuente única para operaciones y soporte.

La PWA debe vivir exclusivamente en el dominio autorizado, con manifest y branding verificables.

### Etapa 2 — Google Play

Preparar Android con wrapper/Capacitor únicamente después de tener:
- entidad legal operadora;
- licencia/permisos;
- dominio;
- KYC/AML;
- geogate;
- responsible gambling;
- rules;
- account deletion/privacy;
- evidencia para solicitud Gambling de Google.

### Etapa 3 — iOS

Presentar después de estabilizar Android/PWA y cuando toda la documentación regulatoria esté disponible para App Review.

### APK directo — fallback, no estrategia legal

Mantener capacidad de generar APK firmado puede ser útil para:
- continuidad si existe un problema comercial temporal con Play;
- beta cerrada permitida;
- dispositivos Android compatibles fuera del store, si legalmente procede.

No debe usarse para:
- eludir una suspensión de Google basada en ilegalidad o falta de licencia;
- distribuir a jurisdicciones prohibidas;
- ocultar actividad de gambling;
- esquivar geogate o controles de edad.

## Arquitectura de canal recomendada

Un solo backend regulatorio y ledger.

- `chido.mx` / dominio regulatorio: Web + PWA.
- Android Play: shell nativo sobre los mismos contratos y controles.
- Android APK: build firmado equivalente, solo donde esté autorizado.
- iOS: shell nativo y políticas Apple.

Ningún canal tiene reglas financieras propias. KYC, wallet, límites, geogate, autoexclusión y settlement se aplican server-side para que una versión vieja o un APK manipulado no pueda saltarlos.

## Conclusión

Los casinos que priorizan APK/PWA normalmente buscan control de distribución y velocidad, no una licencia alternativa. Para CHIDO, la combinación óptima es **PWA primero + Google Play + App Store**, con APK directo únicamente como canal secundario legítimo.
