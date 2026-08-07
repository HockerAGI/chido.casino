# CHIDO Casino — Estrategia Maestra de Lanzamiento Regulado en México

Estado: DRAFT / LEGAL REVIEW REQUIRED  
Mercado: México exclusivamente  
Dinero real: NO-GO hasta gates externos  
Fecha de investigación: 2026-08-07

> Este documento organiza requisitos y decisiones. No sustituye opinión jurídica, permiso, resolución de SEGOB, aprobación del PSP ni certificación independiente.

## 1. Principio rector

CHIDO no debe intentar resolver regulación mediante tecnología, PWA, APK, dominio alternativo, procesador de pagos o contrato privado. El canal de distribución no cambia la naturaleza jurídica del juego con apuesta.

La Dirección General de Juegos y Sorteos de SEGOB es la autoridad federal competente para autorizar, controlar y vigilar juegos con apuesta y sorteos. La propia DGJS advierte que operar juegos con apuesta sin permiso es ilegal.

Fuentes oficiales:
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Juego_Ilegal_muestra
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Quienes_Somos
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Marco

## 2. Estructura societaria recomendada

La operación de Centro de Apuestas Remotas requiere una sociedad mercantil constituida conforme a leyes mexicanas. La CSF del fundador identifica actualmente una persona física activa; se recomienda una sociedad separada para CHIDO.

Nombre de trabajo sujeto a autorización de denominación y notario:
- CHIDO Gaming México, S.A. de C.V.; o
- HOCKER Gaming México, S.A. de C.V.

Razones de separación:
- permiso y responsabilidad regulatoria;
- RFC y contabilidad separados;
- cuenta bancaria/PSP empresarial;
- KYC/AML y beneficiario controlador;
- propiedad intelectual y contratos;
- aislamiento financiero de otros productos HOCKER.

El tipo societario final y el objeto social deben ser validados por notario y abogado regulatorio. El Reglamento exige sociedad mercantil, pero no convierte por sí solo una forma societaria particular en requisito suficiente.

## 3. Dos rutas regulatorias en paralelo

### Ruta A — permiso propio

Preparar solicitud de permiso de Centro de Apuestas Remotas a nombre de la sociedad CHIDO.

Ventaja: independencia regulatoria y comercial.  
Desventaja: expediente amplio, evaluación discrecional y posible ciclo largo.

La DGJS publica como requisitos, entre otros: fianza de premios, situación patrimonial, nexos con otras permisionarias, reporte de crédito, estados financieros, autorización corporativa de inversión, consejo/comisarios y accionistas.

Fuente:
https://sitios.segob.gob.mx/es/Juegos_y_Sorteos/Requisitos_para_Salas_de_Sorteos_de_Numeros_y_Centros_de_Apuestas_Remotas_

### Ruta B — relación con permisionario vigente

Objetivo: acelerar el acceso al mercado sin comprar, rentar, ceder o comercializar un permiso.

Regla crítica: los permisos son intransferibles. La reforma del Reglamento publicada el 16-11-2023 eliminó la figura general de nuevos “operadores” asociados al permisionario. Existen litigios y suspensiones respecto de derechos de operadores preexistentes, pero eso no crea una vía automática para CHIDO como nuevo operador.

Por ello, cualquier alianza debe estructurarse únicamente después de obtener confirmación escrita de DGJS sobre el rol permitido de CHIDO (por ejemplo, tecnología, marca, plataforma o servicios) y sobre las modificaciones del permiso que sean necesarias.

Fuentes:
- https://www.dof.gob.mx/nota_detalle.php?codigo=5708745&fecha=16/11/2023
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Salas_de_Sorteos_de_Numeros
- https://sjf2.scjn.gob.mx/detalle/tesis/2029346

## 4. Estrategia recomendada de velocidad

Ejecutar Ruta A y Ruta B simultáneamente.

1. Constituir sociedad CHIDO.
2. Abrir preconsulta escrita con DGJS antes de gastar en integración comercial.
3. Preparar expediente de permiso propio.
4. Evaluar permisionarios vigentes únicamente desde listados oficiales de SEGOB.
5. Solicitar a cada candidato evidencia del permiso vigente, alcance, páginas autorizadas, modificaciones y situación litigiosa.
6. No firmar “renta de permiso”, “subpermiso”, “franquicia regulatoria” o contratos equivalentes sin opinión jurídica y confirmación DGJS.
7. Negociar solo una estructura que mantenga claramente al sujeto regulado autorizado como responsable ante la autoridad cuando así corresponda.

## 5. Gates para dinero real

Todos deben estar verdes:

- sociedad mercantil mexicana constituida;
- RFC empresarial;
- cuenta bancaria empresarial;
- permiso DGJS/SEGOB o estructura formalmente reconocida por autoridad;
- dominio autorizado dentro del alcance regulatorio;
- proveedor de pagos expresamente aprobado para gambling;
- KYC/AML operativo y responsable designado;
- juego responsable, autoexclusión y límites;
- reglas y términos aprobados;
- aviso de privacidad y derechos ARCO;
- tratamiento fiscal definido;
- certificación matemática/RNG independiente por juego;
- conciliación, chargebacks, retiros, soporte e incidentes;
- app/store approvals si se distribuye nativamente;
- release técnico verde y rollback.

## 6. AML / actividad vulnerable

SAT clasifica juegos con apuesta, concursos y sorteos como Actividad Vulnerable. El despacho deberá determinar alta, umbrales, identificación, avisos, beneficiario controlador, expedientes, listas, PEP/sanciones, conservación y responsable de cumplimiento.

Fuentes:
- https://www.sat.gob.mx/minisitio/ActividadesVulnerables/index.html
- https://www.sat.gob.mx/minisitio/ActividadesVulnerables/informacion_general.html

## 7. Distribución mobile

Canal recomendado por fases:

Fase 1: Web/PWA regulada y geolocalizada.  
Fase 2: Android Google Play después de licencia + aprobación Google.  
Fase 3: iOS App Store después de licencia + aprobación Apple.  
APK directo: solo como canal alternativo Android si aporta una ventaja comercial real; nunca como mecanismo de evasión de licencias o stores.

## 8. Regla de lanzamiento

No se cambia `CHIDO_PAYMENT_MODE` ni `CHIDO_GAME_MODE` a producción real hasta que el evidence pack tenga cada gate externo firmado o verificable.
