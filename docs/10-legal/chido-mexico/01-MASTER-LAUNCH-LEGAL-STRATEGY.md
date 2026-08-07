# CHIDO Casino — Estrategia Maestra de Lanzamiento Regulado en México

Estado: DRAFT / LEGAL REVIEW REQUIRED  
Mercado: México exclusivamente  
Producto canónico: APP-05 Chido Casino  
Ecosistema propietario: HOCKER AGI Technologies  
Dinero real: NO-GO hasta gates externos  
Fecha de revisión: 2026-08-07

> Este documento organiza requisitos y decisiones. No sustituye opinión jurídica, permiso, resolución de SEGOB, aprobación del PSP ni certificación independiente.

## 1. Identidad canónica

CHIDO Casino **no es una empresa independiente dentro del modelo HOCKER**. Es APP-05, uno de los diez productos oficiales del ecosistema HOCKER AGI Technologies.

La arquitectura vigente confirma además que:

- `HockerAGI/chido.casino` es el repositorio separado de la aplicación gaming;
- Hocker ONE actúa como control plane y contiene la administración integrada de CHIDO;
- CHIDO usa `hocker-one` como portal y comparte el proyecto Supabase del ecosistema;
- NOVA mantiene agentes especializados `CHIDO_WINS` y `CHIDO_GERENTE` bajo la jerarquía HOCKER;
- la separación técnica de CHIDO responde a riesgo regulatorio/financiero, no a que sea una compañía distinta.

Por tanto, toda estructura jurídica debe preservar esta relación de producto:

**HOCKER AGI Technologies → APP-05 Chido Casino → Chido Wallet / juegos / operación de casino.**

## 2. Hecho corporativo pendiente

Las fuentes actuales usan “Hocker AGI Technologies” como marca y en algunos campos públicos como `legalName`, pero el DOC-10 canónico advierte que no existe todavía evidencia de que esa denominación sea una razón social registrada.

La CSF aportada corresponde actualmente al fundador como persona física activa.

La prioridad societaria correcta es, por tanto:

### Opción base recomendada

Constituir/formalizar **HOCKER AGI Technologies** como sociedad mercantil mexicana (denominación y tipo societario finales sujetos a autorización de Secretaría de Economía, notario y abogado).

CHIDO seguirá siendo producto/marca/servicio de HOCKER y no requerirá una sociedad “CHIDO Casino” separada por decisión interna.

### Opción de aislamiento regulatorio — solo si aporta una ventaja real

Si SEGOB, el despacho, el banco, Mercado Pago, inversionistas o el análisis de responsabilidad aconsejan separar el riesgo gaming, HOCKER podrá constituir una **subsidiaria regulada** (por ejemplo, una sociedad gaming controlada por HOCKER).

En ese escenario:

- HOCKER conserva el ecosistema, tecnología, IP y gobierno;
- CHIDO sigue siendo APP-05 / marca / producto HOCKER;
- la subsidiaria sería únicamente la entidad jurídica titular/operadora regulada según el modelo aprobado;
- deben existir contratos de licencia/servicios/IP entre HOCKER y la subsidiaria;
- no debe presentarse la subsidiaria como un ecosistema independiente.

La subsidiaria **no es el default**. Solo se crea si la matriz de riesgo y la opinión regulatoria demuestran beneficio.

## 3. Principio rector

CHIDO no debe intentar resolver regulación mediante PWA, APK, dominio alternativo, procesador de pagos o contrato privado. El canal de distribución no cambia la naturaleza jurídica del juego con apuesta.

La Dirección General de Juegos y Sorteos de SEGOB es la autoridad federal competente para autorizar, controlar y vigilar juegos con apuesta y sorteos. La propia DGJS advierte que operar juegos con apuesta sin permiso es ilegal.

Fuentes oficiales:
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Juego_Ilegal_muestra
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Quienes_Somos
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Marco

## 4. Dos rutas regulatorias en paralelo

### Ruta A — HOCKER como solicitante/operador

Una vez formalizada la sociedad HOCKER, evaluar que **HOCKER AGI Technologies** solicite el permiso aplicable para operar su producto APP-05 Chido Casino.

Ventajas:
- una sola matriz corporativa para el ecosistema;
- propiedad directa del producto y tecnología;
- gobierno integrado en Hocker ONE;
- menor duplicidad corporativa.

Riesgos a validar:
- exposición de la matriz HOCKER al riesgo regulatorio y financiero del casino;
- exigencias de objeto social/capital/gobierno;
- impacto bancario/PSP sobre otras líneas HOCKER;
- conveniencia de ring-fencing.

La DGJS publica como requisitos, entre otros: fianza de premios, situación patrimonial, nexos con otras permisionarias, reporte de crédito, estados financieros, autorización corporativa de inversión, consejo/comisarios y accionistas.

Fuente:
https://sitios.segob.gob.mx/es/Juegos_y_Sorteos/Requisitos_para_Salas_de_Sorteos_de_Numeros_y_Centros_de_Apuestas_Remotas_

### Ruta B — HOCKER/CHIDO como proveedor tecnológico de un permisionario vigente

Objetivo: acelerar el acceso al mercado sin comprar, rentar, ceder o comercializar un permiso.

La relación comercial se formula como:

**HOCKER AGI Technologies = proveedor/licenciante de APP-05 Chido Casino, software, marca, juegos y servicios tecnológicos.**

**Permisionario = sujeto regulado que conserva las funciones que SEGOB determine como indelegables.**

Regla crítica: los permisos son intransferibles. La reforma del Reglamento publicada el 16-11-2023 eliminó la figura general de nuevos “operadores” asociados al permisionario. Existen litigios y suspensiones respecto de derechos de operadores preexistentes, pero eso no crea una vía automática para HOCKER como nuevo operador.

Por ello, cualquier alianza debe estructurarse únicamente después de obtener confirmación escrita de DGJS sobre el rol permitido de HOCKER y APP-05 CHIDO y sobre las modificaciones del permiso que sean necesarias.

Fuentes:
- https://www.dof.gob.mx/nota_detalle.php?codigo=5708745&fecha=16/11/2023
- https://www.sitios.segob.gob.mx/es/Juegos_y_Sorteos/Salas_de_Sorteos_de_Numeros
- https://sjf2.scjn.gob.mx/detalle/tesis/2029346

## 5. Estrategia recomendada de velocidad

Ejecutar Ruta A y Ruta B simultáneamente, manteniendo la estructura HOCKER.

1. Formalizar HOCKER AGI Technologies como sociedad mercantil mexicana.
2. Definir que APP-05 Chido Casino es el producto gaming regulado de HOCKER.
3. Abrir preconsulta escrita con DGJS antes de gastar en integración comercial.
4. Preparar expediente de permiso propio a nombre de HOCKER o, solo si el análisis lo justifica, de una subsidiaria regulada HOCKER.
5. Evaluar permisionarios vigentes únicamente desde listados oficiales de SEGOB.
6. Solicitar a cada candidato evidencia del permiso vigente, alcance, páginas autorizadas, modificaciones y situación litigiosa.
7. No firmar “renta de permiso”, “subpermiso”, “franquicia regulatoria” o contratos equivalentes sin opinión jurídica y confirmación DGJS.
8. Negociar únicamente estructuras que describan con precisión qué hace HOCKER, qué hace APP-05 CHIDO y qué permanece bajo el permisionario.

## 6. Gates para dinero real

Todos deben estar verdes:

- HOCKER constituida como sociedad mercantil mexicana o subsidiaria regulada aprobada;
- RFC empresarial de la entidad regulada;
- cuenta bancaria empresarial;
- relación de propiedad/licencia clara entre HOCKER y APP-05 CHIDO;
- permiso DGJS/SEGOB o estructura formalmente reconocida por autoridad;
- dominio autorizado dentro del alcance regulatorio;
- proveedor de pagos expresamente aprobado para gambling y para la entidad merchant correcta;
- KYC/AML operativo y responsable designado;
- juego responsable, autoexclusión y límites;
- reglas y términos aprobados;
- aviso de privacidad y derechos ARCO;
- tratamiento fiscal definido;
- certificación matemática/RNG independiente por juego;
- conciliación, chargebacks, retiros, soporte e incidentes;
- app/store approvals si se distribuye nativamente;
- release técnico verde y rollback.

## 7. AML / actividad vulnerable

SAT clasifica juegos con apuesta, concursos y sorteos como Actividad Vulnerable. El despacho deberá determinar qué entidad HOCKER será sujeto obligado y mapear alta, umbrales, identificación, avisos, beneficiario controlador, expedientes, listas, PEP/sanciones, conservación y responsable de cumplimiento.

Fuentes:
- https://www.sat.gob.mx/minisitio/ActividadesVulnerables/index.html
- https://www.sat.gob.mx/minisitio/ActividadesVulnerables/informacion_general.html

## 8. Distribución mobile

Canal recomendado por fases:

Fase 1: Web/PWA de APP-05 CHIDO regulada y geolocalizada.  
Fase 2: Android Google Play bajo la entidad legal HOCKER/operadora autorizada.  
Fase 3: iOS App Store bajo la entidad legal HOCKER/operadora autorizada.  
APK directo: solo como canal alternativo Android si aporta una ventaja comercial real; nunca como mecanismo de evasión de licencias o stores.

## 9. Regla de lanzamiento

No se cambia `CHIDO_PAYMENT_MODE` ni `CHIDO_GAME_MODE` a producción real hasta que el evidence pack tenga cada gate externo firmado o verificable.
