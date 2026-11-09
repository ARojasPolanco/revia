# REVIA — Registro de decisiones

Formato: `D-XXX · fecha · estado`. Estados: `aceptada`, `revisar`, `reemplazada`.

---

## D-001 · 2026-11-09 · aceptada

**Monorepo con API y web separadas.**

- Contexto: el equipo ya trabaja con monorepos Express+Sequelize (Market Design, Duo LAS) y quiere reutilizar lógica.
- Decisión: `apps/api` (Express + Sequelize), `apps/web` (Next.js 15), `packages/shared` (Zod/tipos), Docker para entornos.
- Consecuencias: más reutilización y despliegues independientes; requiere manejar dos deploy targets y CORS.

## D-002 · 2026-11-09 · aceptada

**TypeScript en API y web.**

- Contexto: los repos de referencia son JavaScript puro; REVIA necesita más seguridad de tipos en un dominio con dinero.
- Decisión: TypeScript estricto en todo el monorepo. Los módulos portados se tipan al migrarse.
- Consecuencias: más trabajo inicial de tipado; menos errores en órdenes, montos y estados.

## D-003 · 2026-11-09 · aceptada

**Sequelize + Umzug con SQL crudo.**

- Contexto: reutilización directa de modelos, servicios y migraciones de Market Design/Duo LAS.
- Decisión: Sequelize 6 con `underscored: true`, `timestamps: true`; migraciones SQL numeradas con Umzug.
- Consecuencias: se evita reescribir la capa de datos; no se usa Prisma.

## D-004 · 2026-11-09 · aceptada

**Pagos con Talo, solo transferencia bancaria.**

- Contexto: Mercado Pago no ofrece el split/custodia buscados y sus tasas son altas; Talo cobra 0,8%–1%.
- Decisión: Talo como procesador. CVU/alias único por orden, webhook y reembolsos.
- Consecuencias: no hay tarjeta ni cuotas; el checkout es asincrónico y exige buena UX de transferencia.

## D-005 · 2026-11-09 · aceptada

**Custodia en la cuenta de REVIA, no split de Talo.**

- Contexto: Split Payments de Talo es beta cerrada, con una única instrucción de payout y hold de 12 h.
- Decisión: todo el dinero entra a la cuenta de REVIA y se distribuye manualmente en el MVP.
- Consecuencias: control total del escrow; mayor carga operativa y riesgo regulatorio a validar.

## D-006 · 2026-11-09 · aceptada

**Tasa de REVIA: 7% + $500, pagada por el comprador.**

- Contexto: la cobertura de reembolsos y mantenimiento debe cubrir costos operativos; 5% + $500 resultaba bajo.
- Decisión: `tasa = round(precio * 7 / 100) + 500` ARS, configurable. Vendedor 0%.
- Consecuencias: ingreso más sano por venta; tickets bajos pagan proporcionalmente más. Se puede ajustar sin tocar código.

## D-007 · 2026-11-09 · aceptada

**Custodia con ventana de 48 h y liberación automática.**

- Contexto: se busca un plazo corto y simple, alineado con las 48 h de Vinted.
- Decisión: 48 h desde `delivered` para reclamar; sin reclamo, la orden pasa a `completed` y habilita el payout.
- Consecuencias: menos tiempo de protección que Vinted en algunos mercados; simple de operar.

## D-008 · 2026-11-09 · aceptada

**Código de entrega de 6 dígitos.**

- Contexto: no hay logística integrada; se necesita prueba de entrega.
- Decisión: el comprador recibe un código y lo entrega al vendedor al recibir; el vendedor lo ingresa. El comprador también puede confirmar con un botón.
- Consecuencias: prueba simple y sin hardware; depende de que el comprador comparta el código.

## D-009 · 2026-11-09 · aceptada

**Tres modalidades de entrega sin logística integrada.**

- Contexto: el MVP es local en Bahía Blanca.
- Decisión: retiro en domicilio ($0), punto medio céntrico ($2.200 fijos) y envío con Uber/Didi coordinado por chat (REVIA no cobra).
- Consecuencias: cero integración logística; la tarifa de punto medio es del vendedor, no de REVIA.

## D-010 · 2026-11-09 · aceptada

**Ofertas: -30%, 24 h, no vinculantes.**

- Contexto: paridad con Vinted, con un límite algo más conservador.
- Decisión: descuento máximo 30%, oferta válida 24 h, pago en 24 h, sin reserva del artículo.
- Consecuencias: negociación ágil sin bloquear stock; puede haber ofertas que no se concreten.

## D-011 · 2026-11-09 · aceptada

**Un artículo por compra.**

- Contexto: simplificar pagos, entregas y disputas en el MVP.
- Decisión: no hay carrito ni bundles.
- Consecuencias: menos conversión por transacción; operación y conciliación simples.

## D-012 · 2026-11-09 · aceptada

**KYC con Didit (plan gratuito) y RENAPER opcional.**

- Contexto: Truora y Didit son pagos; se necesita validar identidad sin costo inicial y sin exponer Talo.
- Decisión: Didit con 500 verificaciones gratis/mes; RENAPER a US$0,20 como opción. La UI muestra "Verificación de REVIA".
- Consecuencias: costo casi nulo al inicio; límite de 500/mes y dependencia de un tercero.

## D-013 · 2026-11-09 · aceptada

**Secreto de proveedores de pago y KYC.**

- Contexto: el vendedor no debe saber que se usa Talo para retener el dinero.
- Decisión: Talo y Didit son internos. La UI habla de "Pago por transferencia" y "Verificación de REVIA".
- Consecuencias: menor fricción y más control de marca; exige disciplina en textos, logs y errores.

## D-014 · 2026-11-09 · aceptada

**Payout manual dentro de 48–72 h hábiles.**

- Contexto: volumen bajo y custodia manual en el MVP.
- Decisión: finanzas transfiere manualmente, con comprobante y auditoría; costo a cargo de REVIA.
- Consecuencias: no escala a gran volumen; requiere proceso operativo y conciliación.

## D-015 · 2026-11-09 · aceptada

**Reembolso: dinero con Tasa o cupón sin Tasa.**

- Contexto: se quiere ofrecer una alternativa que fomente la recompra.
- Decisión: el comprador elige reembolso total (incluye Tasa) o cupón por el valor del artículo sin Tasa (paga Tasa nueva al usarlo).
- Consecuencias: doble opción de resolución; hay que implementar cupones con vencimiento y uso único.

## D-016 · 2026-11-09 · aceptada

**Política de devoluciones estilo Vinted.**

- Contexto: el usuario aportó la política de Vinted y pidió replicarla.
- Decisión: el comprador paga el retorno por defecto; el vendedor puede cubrirlo o dar reembolso parcial; 5 días hábiles para despachar; mismas condiciones, accesorios y embalaje.
- Consecuencias: reglas claras y conocidas; REVIA debe mediar con evidencia.

## D-017 · 2026-11-09 · aceptada

**Reseñas bidireccionales al completar.**

- Contexto: reputación para ambos lados.
- Decisión: 1–5 estrellas + comentario, 30 días desde `completed`, una por orden/autor, públicas.
- Consecuencias: más confianza; requiere moderación de reseñas abusivas.

## D-018 · 2026-11-09 · aceptada

**Funciones sociales: favoritos, seguidos y feed.**

- Contexto: paridad con Vinted y tracción.
- Decisión: favoritos, seguir vendedores y feed de recomendados + seguidos.
- Consecuencias: más superficie de producto; se implementa simple, sin ranking avanzado.

## D-019 · 2026-11-09 · aceptada

**Chat con polling y filtro de contacto.**

- Contexto: se quiere evitar cerrar ventas fuera de REVIA sin bloquear la coordinación.
- Decisión: polling cada 3–5 s; se detectan teléfonos, emails, redes, CVU y alias, se advierte y se marca el mensaje.
- Consecuencias: menor carga que WebSocket; el filtro puede tener falsos positivos.

## D-020 · 2026-11-09 · aceptada

**PWA instalable con Web Push.**

- Contexto: se necesita notificar sin app nativa.
- Decisión: Next.js PWA + service worker + `web-push` + VAPID. En iOS requiere instalar y iOS 16.4+.
- Consecuencias: sin costo de tiendas; limitaciones de push en iOS y necesidad de permiso explícito.

## D-021 · 2026-11-09 · aceptada

**Moderación previa de publicaciones.**

- Contexto: catálogo amplio y riesgo de artículos prohibidos.
- Decisión: toda publicación pasa por aprobación manual antes de publicarse.
- Consecuencias: más confianza y control; cuello de botella operativo que habrá que medir.

## D-022 · 2026-11-09 · aceptada

**Solo particulares C2C y solo Bahía Blanca.**

- Contexto: foco del MVP y operación local.
- Decisión: no hay vendedores profesionales ni multi-ciudad.
- Consecuencias: propuesta clara; el crecimiento requiere abrir ciudad y cuentas pro en fases futuras.

## D-023 · 2026-11-09 · aceptada

**Roles administrativos con RBAC.**

- Contexto: separar moderación, soporte y dinero.
- Decisión: `user`, `moderator`, `support`, `finance`, `admin`.
- Consecuencias: menos riesgo operativo; hay que implementar permisos por endpoint.

## D-024 · 2026-11-09 · aceptada

**Figura fiscal: monotributo + factura C.**

- Contexto: inicio simple en Argentina.
- Decisión: REVIA factura C por la Tasa; validar IVA/percepciones con contador.
- Consecuencias: simple al inicio; revisar al crecer o al facturar a empresas.

## D-025 · 2026-11-09 · aceptada

**Reutilización de infraestructura de Market Design y Duo LAS.**

- Contexto: ambos repos ya resuelven auth, errores, push, PWA, deploy y convenciones.
- Decisión: portar patrones y módulos a TypeScript, sin copiar reglas de negocio ajenas.
- Consecuencias: acelera el desarrollo; exige revisar y tipar cada módulo portado.

## D-026 · 2026-11-09 · aceptada

**Inicio de la ventana de 48 h.**

- Contexto: se eligió "desde confirmación del comprador" y también código de entrega.
- Decisión: el código/QR de 6 dígitos validado marca `delivered` y desde ahí corren las 48 h. El comprador puede confirmar antes con el botón "Recibí el artículo".
- Consecuencias: operativamente simple y trazable; el vendedor depende de que el comprador comparta el código.

## D-027 · 2026-11-09 · aceptada

**Render free al inicio.**

- Contexto: el presupuesto inicial es US$0–20/mes y el volumen esperado es bajo.
- Decisión: usar Render free al inicio, aceptando que el servicio duerme por inactividad. Se documenta la limitación de webhooks/cron y se migra a Starter cuando el volumen lo justifique.
- Consecuencias: costo cero al inicio; posibles cold starts y webhooks demorados. Monitorear y migrar antes de campañas grandes.

## D-028 · 2026-11-09 · aceptada

**Persistencia del JWT en cookie httpOnly.**

- Contexto: `localStorage` es vulnerable a XSS; se prioriza seguridad sobre paridad con los repos anteriores.
- Decisión: JWT en cookie `httpOnly` (`revia_at`), `Secure` en producción, `SameSite=None` para cross-site Render/Vercel y `SameSite=Lax` en local. Cookie no sensible `revia_session=1` como hint para el frontend. CORS con `credentials` y verificación de `Origin` para CSRF. Bearer queda soportado solo para tests/herramientas.
- Consecuencias: más seguro frente a XSS; requiere CORS con credenciales, protección CSRF y cuidado con el dominio de la cookie.

## D-029 · 2026-11-09 · aceptada

**Onboarding obligatorio para cuentas creadas con Google.**

- Contexto: Google aporta email y nombre, pero no fecha de nacimiento ni aceptación de términos.
- Decisión: las cuentas nuevas con Google se crean con `onboarding_completed=false`, `birth_date` y `accepted_terms_at` nulos. Tras el callback se redirigen a `/completar-perfil`, donde completan edad y términos. El resto de las acciones de negocio exige `requireOnboardingCompleted`.
- Consecuencias: cumple 18+ sin bloquear el alta con Google; suma un paso de onboarding.

## D-030 · 2026-11-09 · aceptada

**Tokens de desarrollo para probar email sin Resend.**

- Contexto: en local/test no hay proveedor de email configurado.
- Decisión: cuando `NODE_ENV !== production`, `register`, `resend-verification` y `forgot-password` devuelven `devVerificationToken`/`devResetToken`. Si falta `RESEND_API_KEY`, el link se loguea en consola. En producción nunca se exponen tokens en respuestas.
- Consecuencias: permite smoke manual completo; exige no filtrar los tokens en producción.

## D-031 · 2026-11-09 · aceptada

**KYC con Didit + modo mock de desarrollo.**

- Contexto: Didit requiere `workflow_id` y cuenta configurada; el MVP necesita validar identidad y permitir pruebas locales sin credenciales.
- Decisión: `POST /v3/session/` con `vendor_data = user_id`, callback a `/verificacion` y webhook HMAC-SHA256 (`X-Signature-V2`, ventana de 5 minutos). Sin `DIDIT_WORKFLOW_ID` y fuera de producción, el flujo entra en modo mock y se aprueba/rechaza con `/kyc/dev/verify`.
- Consecuencias: integración real lista para producción sin bloquear el desarrollo; el modo mock está prohibido en producción.

## D-032 · 2026-11-09 · aceptada

**Datos de payout cifrados con AES-256-GCM.**

- Contexto: CBU/CVU/alias son datos sensibles y no deben quedar en texto plano.
- Decisión: cifrado a nivel aplicación con `PAYOUT_ENCRYPTION_KEY` de 32 bytes (hex o base64). En desarrollo, si falta la clave, se deriva de `JWT_SECRET`; en producción es obligatoria. La API solo devuelve datos enmascarados.
- Consecuencias: mayor seguridad y cumplimiento; rotar la clave requiere migración de datos cifrados.

## D-033 · 2026-11-09 · aceptada

**Búsqueda con `pg_trgm` y feed simple.**

- Contexto: el MVP necesita búsqueda por texto y un feed sin infraestructura extra.
- Decisión: índices GIN `pg_trgm` sobre título/descripción y `ILIKE`; feed público de activos recientes y feed privado de vendedores seguidos. Sin Elasticsearch ni motor de recomendación.
- Consecuencias: búsqueda suficiente para el catálogo local; se puede migrar a `tsvector` o ranking si el volumen lo exige.

## D-034 · 2026-11-09 · aceptada

**Tests de componentes Next.js con Vitest + Testing Library.**

- Contexto: los tests actuales cubren la API; el frontend no tenía cobertura automatizada.
- Decisión: Vitest con `jsdom`, Testing Library y JSX automático de esbuild. Se testean componentes compartidos y una página real de App Router con `apiFetch` mockeado.
- Consecuencias: se detectan regresiones de UI antes del smoke manual; no se reemplaza la prueba end-to-end del navegador.
