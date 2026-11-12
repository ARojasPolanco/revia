# TASK.md — REVIA

Tablero vivo del proyecto. Se actualiza al empezar y al terminar cada tarea. Si algo no está acá, no está planificado.

## Estado actual

- **Fase:** Fase 8 completada en local (disputas, reembolsos, cupones y reseñas). La siguiente es la Fase 9 (PWA, push y emails).
- **Repo:** `REVIA-fullstack`, rama `dev`, con Fase 0 en `main` y Fases 1-8 en `dev`.
- **Alcance:** MVP C2C local en Bahía Blanca, ARS, Tasa de REVIA 7% + $500, custodia y payouts manuales.
- **Documentos creados:** `AGENTS.md`, `TASK.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DECISIONS.md`, `README.md`.
- **Decisiones abiertas:** ninguna. D-026 a D-036 cerradas.
- **Riesgo principal:** operación manual de payouts y dependencia de Talo (solo transferencia).
- **Última actualización:** 2026-11-10.

## Ajustes visuales en curso (2026-11-10)

- Header global con navegación desktop y menú lateral mobile abierto desde la derecha, con controles de 44 px.
- Home diferenciado: visitante, comprador, vendedor verificado y equipo REVIA; `Ingresar` se oculta al detectar sesión.
- Header simplificado: logo, buscador, ingreso/cuenta, Vender ahora y ayuda; la navegación secundaria vive en el menú de cuenta.
- Con sesión iniciada se priorizan chat y notificaciones con íconos; el acceso a cuenta usa engranaje de ajustes y no muestra el email.
- Header por rol: vendedor con `Publicar` y `Mis publicaciones` visibles; comprador con chat, notificaciones y menú de compras.
- Para vendedores, la barra de categorías solo se muestra en el home y desaparece al entrar a sus secciones.
- Comprador: "Mis compras" es la acción principal del header; en Mi cuenta no ve categorías ni el formulario de cobros, sino el acceso a verificación para vender.
- Admin/staff: home sin feed de productos ni categorías; muestra accesos a las áreas de trabajo según su rol.
- Menú de cuenta admin solo con áreas internas; se agregó `/admin/ganancias` con tasas históricas, del mes y últimas comisiones.
- Cobros del vendedor aceptan **alias** o CBU/CVU; finanzas ve el dato completo (con copiar) en la cola de payouts, mientras el vendedor sigue viendo la versión enmascarada.
- Comprador: "Empezar a vender" lleva a verificación de identidad; el home ya no muestra el aviso permanente de KYC.
- Home con scroll infinito sobre `/listings` paginado, deduplicación, spinner de carga inicial y de siguientes páginas, y reintento ante error.
- Categorías globales bajo el header: mega-menú al hover en desktop (íconos + subcategorías) y pills directas en mobile.
- Home limpio: sin CTAs duplicados ni grilla de categorías en el cuerpo; foco en feed de publicaciones.
- El catálogo lee `q`, `categoryId`, `condition`, precios y orden desde la URL para que buscador y categorías lleguen filtrados.
- Botoneras estandarizadas con `PageHeader`, `ActionLink`, `ActionButton` y `AdminTabs`; se quitaron accesos duplicados en páginas internas.
- Modales propios sobre Radix UI Dialog (foco atrapado/restaurado, Escape, ARIA y scroll lock); se eliminaron `alert`, `confirm` y `prompt` nativos.
- Confirmaciones rediseñadas con ícono contextual, footer responsive y acciones primaria/secundaria más claras.
- Confirmaciones explícitas en eliminar, bloquear, reportar, cancelar, pagar, resolver y cerrar sesión.
- Logout disponible en mobile y desktop (menú de cuenta), con confirmación; cookie borrada y `/auth/me` devuelve 401.
- Login (contraseña y Google) vuelve a la ruta protegida original mediante `next`; sesión vencida redirige una sola vez a `/ingresar?expired=1`.
- Onboarding incompleto redirige a `/completar-perfil` conservando el destino; home muestra avisos de email, identidad y perfil pendientes.
- Flujo de compra: login vuelve a la publicación, compra bloqueada con guía si falta email/perfil, confirmación previa y próximo paso visible en compras/ventas.
- Placeholders de `Quiénes somos`, `FAQ`, `Términos`, `Privacidad` y `Cookies`.
- Controles de overflow horizontal y estilos base para botones oscuros.
- Pendiente: revisión visual manual en mobile/desktop y definición de la paleta final.

## Leyenda

- `[ ]` pendiente
- `[x]` terminado
- `[~]` en curso
- `[!]` bloqueado

## Documentación inicial

- [x] Relevar modelo de negocio estilo Vinted.
- [x] Cerrar alcance del MVP C2C local.
- [x] Cerrar estructura de la Tasa de REVIA (7% + $500).
- [x] Cerrar modalidades de entrega sin logística integrada.
- [x] Investigar Talo (transferencia, CVU/alias, webhooks, reembolsos).
- [x] Decidir custodia en cuenta de REVIA y payouts manuales.
- [x] Decidir KYC con Didit (plan gratuito).
- [x] Cerrar regateo (-30%, 24 h, no vinculante).
- [x] Cerrar política de devoluciones y reembolsos.
- [x] Cerrar reseñas, follows, feed y chat.
- [x] Definir taxonomía de 8 rubros.
- [x] Crear `AGENTS.md`.
- [x] Crear `TASK.md`.
- [x] Crear `docs/SPEC.md`.
- [x] Crear `docs/ARCHITECTURE.md`.
- [x] Crear `docs/API.md`.
- [x] Crear `docs/DECISIONS.md`.
- [x] Crear `README.md`.

## Avance Fase 0 (2026-11-09)

- Monorepo `revia` con workspaces `@revia/api`, `@revia/web` y `@revia/shared`.
- TypeScript estricto, ESM, ESLint flat, Prettier, commitlint y Husky.
- API Express 4: `envs` con Zod, logger, database, migrator, manejo de errores y `/health`.
- Migración `001_initial` con `users` y `errors`; ciclo down/up verificado en `revia` y `revia_test`.
- Web Next.js 15 + Tailwind 4 + PWA base (layout, home, service worker, manifest, AuthProvider, ErrorBoundary, ProtectedRoute).
- PostgreSQL 16 en Docker (`localhost:5433`) con base `revia` y `revia_test`.
- Verificación: `npm run build`, `npm run build:web`, `npm run lint`, `npm run test` (6 tests) y `/health` 200.
- Imágenes `Dockerfile.api` y `Dockerfile.web` construidas correctamente.
- `docker compose --profile app` levantó API y web: `/health` 200 y web 200 con REVIA.
- Contenedores de app detenidos al cierre; `revia-postgres` queda healthy en `localhost:5433`.
- Git inicializado en rama `dev`; sin commits (pendiente de pedido explícito).
- Auditoría `npm audit --omit=dev`: 5 vulnerabilidades de producción (2 high) en `postcss` vía Next, `zod` y `uuid` vía Sequelize. Revisar upgrades en la fase de hardening.

## Fase 0 — Scaffold, Docker y base técnica

**Objetivo:** monorepo que levanta API, web y PostgreSQL en Docker, con lint, tests base y documentación operativa.

- [x] Crear `package.json` raíz con npm workspaces y scripts.
- [x] Crear `.nvmrc` (Node 22), `.prettierrc.json`, `eslint.config.js`, `commitlint.config.js`.
- [x] Configurar Husky + lint-staged.
- [x] Crear `.gitignore` y `.dockerignore`.
- [x] Crear `docker-compose.yml` con PostgreSQL 16 en `localhost:5433`.
- [x] Crear `docker/initdb/01-create-test-db.sql` con `revia_test`.
- [x] Crear `Dockerfile.api` y `Dockerfile.web`.
- [x] Crear `apps/api`: Express 4 + TypeScript, `envs` con Zod, logger, database, migrator.
- [x] Crear `apps/api/src/errors/*` (AppError, catchAsync, matchers, handler).
- [x] Crear `apps/api/src/modules/logs/*` y tabla `errors`.
- [x] Crear `app.ts`, `index.ts`, `/health`, `/api/v1` con respuesta `REVIA API v1`.
- [x] Crear migración `001_initial` (users + errors).
- [x] Crear `vitest.config.ts` y test base de health.
- [x] Crear `packages/shared` con package.json, constantes y schemas base.
- [x] Crear `apps/web`: Next.js 15 + TypeScript + Tailwind, layout, PWA base.
- [x] Crear cliente API, `AuthProvider`, `ErrorBoundary` y `ProtectedRoute`.
- [x] Crear `.env.example` de API y web.
- [x] Verificar migración down/up en `revia` y `revia_test`.

**DoD:** `npm run docker:up`, `/health`, build de web, `npm run lint` y `npm run test` en verde, migración down/up verificada.

## Fase 1 — Auth, cuenta y 18+

**Objetivo:** registro, verificación de email, login, Google, recuperación y cuenta base.

- [x] Modelos `User`, `AuthIdentity`, `EmailVerificationToken`, `PasswordResetToken`.
- [x] Migración de auth (`002_auth`).
- [x] Registro con fecha de nacimiento, 18+, términos y hCaptcha opcional.
- [x] Login email + password con bcrypt 12 y JWT 1 día en cookie `httpOnly`.
- [x] Google OAuth 2.0 server-side y vinculación de cuentas.
- [x] Verificación de email (24 h, SHA-256, un uso) y reenvío.
- [x] Forgot/reset (1 h, un solo uso, respuesta genérica).
- [x] `protect`, `restrictTo`, `requireVerifiedEmail`, `requireKycApproved`, `requireOnboardingCompleted`.
- [x] Rate limits de registro/login/forgot.
- [x] Perfil propio editable y perfil público.
- [x] Suspensión de cuentas (bloqueo en login y `protect`; gestión desde admin en Fase 10).
- [x] Páginas `/ingresar`, `/registro`, `/verificar-email`, `/recuperar`, `/configuracion`, `/completar-perfil`.
- [x] Tests de auth, tokens, roles y 18+.

**DoD:** flujo completo registro → verificación → login → recuperación; tests, lint y smoke manual.

## Avance Fase 1 (2026-11-09)

- Migración `002_auth`: `auth_identities`, `email_verification_tokens`, `password_reset_tokens` y columnas de perfil/KYC/onboarding.
- Registro con 18+, términos, bcrypt 12, hCaptcha opcional y token de verificación SHA-256 de 24 h.
- Login con JWT de 1 día en cookie `httpOnly` (`revia_at`) + hint `revia_session=1`; logout limpia cookies.
- Verificación de email, reenvío y recuperación de contraseña con tokens de un solo uso (1 h).
- Google OAuth server-side con vinculación por email y onboarding pendiente para cuentas nuevas.
- Middlewares `protect`, `restrictTo`, `requireVerifiedEmail`, `requireKycApproved` y `requireOnboardingCompleted`.
- Perfil propio editable (`PATCH /auth/me`) y perfil público (`GET /users/:id`).
- Web: `/registro`, `/ingresar`, `/verificar-email`, `/recuperar`, `/completar-perfil`, `/configuracion`.
- Respecto a colores: se usó una paleta clara y sobria (blanco/neutral/teal), pendiente de rediseño antes de producción.
- Tests: 18 en total (8 auth, 4 money, 4 middlewares, 2 health); `lint`, `build` y migración `002` down/up en `revia` y `revia_test` verdes.
- Smoke real: registro → verificación → login con cookie → `/auth/me` → logout → `401`; Google sin configurar redirige a `google_no_config`.
- Email: con `RESEND_API_KEY` se envía; sin ella, en desarrollo se loguea el link y se devuelve `devVerificationToken`/`devResetToken`.

## Fase 2 — KYC, perfil y cuenta de payout

**Objetivo:** verificar identidad del vendedor y capturar datos de cobro.

- [x] Modelo `KycVerification` y migración (`003_kyc_payout`).
- [x] Integración con Didit: crear sesión, webhook HMAC-SHA256, estados y reintento.
- [x] Fallback de revisión manual (estado `manual_review`; resolución admin en Fase 10).
- [x] Modelo `PayoutAccount` con CBU/CVU/alias y titular.
- [x] Cifrado AES-256-GCM de datos de payout.
- [x] Validación de formato y coincidencia de titular con KYC.
- [x] Endpoints `/kyc/*` y `/me/payout-account`.
- [x] UI de verificación ("Verificación de REVIA") y estado.
- [x] UI de datos de cobro enmascarados.
- [x] Tests de KYC (mock Didit), validación y cifrado.

**DoD:** vendedor verificado puede publicar; payout account válida; Talo/Didit invisibles.

## Avance Fase 2 (2026-11-09)

- Migración `003_kyc_payout`: `kyc_verifications` y `payout_accounts`.
- Didit: `POST /v3/session/` con `vendor_data = user_id`, callback a `/verificacion`, idioma `es` y webhook HMAC-SHA256 (`X-Signature-V2`, ventana de 5 minutos, idempotencia por `event_id`).
- Mapeo de estados de Didit a `pending`, `approved`, `rejected`, `manual_review` y `expired`.
- Modo mock en desarrollo cuando falta `DIDIT_WORKFLOW_ID`: `POST /kyc/session` + `POST /kyc/dev/verify`.
- Payout account con CBU/CVU (22 dígitos) o alias, titular, cifrado AES-256-GCM y enmascarado en respuestas.
- Coincidencia de titular contra el nombre verificado; si no coincide, `pending_review`.
- Web: `/verificacion` (iniciar, estado y simulación dev) y sección de cobros en `/configuracion`.
- Mail service porteado desde Duo LAS y adaptado a REVIA (light/sobrio): verificación, reset, suspensión y KYC aprobado/rechazado/en revisión.
- Tests: 33 en total; `lint`, `build` y migración `003` down/up en `revia` y `revia_test` verdes.
- Smoke real: payout bloqueado sin KYC (403) → sesión mock → aprobación → payout `active` con cuenta enmascarada; `/auth/me` refleja `kycStatus=approved`.
- Nota: la integración real de Didit requiere `DIDIT_API_KEY` y `DIDIT_WORKFLOW_ID`; sin ellos, solo mock local.
- Seed `npm run seed:dev`: usuarios `demo@revia.test`, `pendiente@revia.test`, `vendedor@revia.test` y `admin@revia.test` (contraseña `revia12345`) para probar `/configuracion`, `/verificacion` y `/completar-perfil` sin depender de Google.

## Ajustes post-Fase 2 (2026-11-09)

- [x] Ocultar el rol en `/configuracion` (sigue en la API para permisos y admin).
- [x] Payout: la UI pide **CBU o CVU** (22 dígitos) con tooltip; se quitó el selector de método y el alias visible.
- [x] Foto de perfil desde el dispositivo (`input[type=file]` + `capture="user"`), preview circular y recorte 512×512 WebP.
- [x] Almacenamiento local de avatares en desarrollo (`apps/api/uploads/avatars`) servido desde `/uploads`.
- [x] Campo `seller_verified_at` y badge "Perfil verificado"; el seed `vendedor@revia.test` lo muestra para pruebas.
- [x] Disparar `seller_verified_at` en la primera orden `completed` (Fase 6).
- [ ] Migrar avatares a R2 o Cloudinary para producción (el disco de Render es efímero).
- [x] Historial de compras/ventas y auditoría de la orden (Fase 6).
- [x] Comprobante de payout descargable (Fase 7).
- [x] Errores: body-parser, CORS, Multer, Sequelize y PostgreSQL normalizados; mensajes Zod en español; rate limit global en español.
- [x] Tests de errores: 404, JSON inválido, 422 con campos obligatorios/email/longitud y 401.

## Fase 3 — Categorías, publicaciones, fotos y moderación

**Objetivo:** publicar artículos con fotos y aprobación previa.

- [x] Modelos `Category`, `CategoryAttribute`, `Listing`, `ListingPhoto`, `ListingReport`.
- [x] Migración `005_listings` y seed idempotente de taxonomía (8 rubros, 35 subcategorías, 126 atributos).
- [x] CRUD de publicaciones con estados (`draft`, `pending`, `active`, `rejected`, `paused`, `sold`, `deleted`).
- [x] Upload de fotos (Multer + sharp, mínimo 3, máximo 10, WebP + thumbnail); almacenamiento local en dev, R2 pendiente para producción.
- [x] Validación de campos y atributos obligatorios por subcategoría.
- [x] Moderación: cola, aprobar, rechazar con motivo y reenviar.
- [x] Pausar, reanudar y eliminar (soft delete).
- [x] Denuncias de publicaciones y resolución por moderación.
- [x] Páginas `/publicar`, `/mis-publicaciones`, `/mis-publicaciones/[id]`, `/publicaciones`, `/publicaciones/[id]` y `/admin/publicaciones`.
- [x] Tests de categorías, publicación, fotos, estados, moderación y permisos.

**DoD:** publicación completa con 3 fotos, aprobación, pausa y rechazo con motivo.

## Avance Fase 3 (2026-11-09)

- Taxonomía idempotente de 8 rubros / 35 subcategorías / 126 atributos (`npm run seed:categories`).
- Modelos y asociaciones de categorías, publicaciones, fotos y denuncias.
- Flujo completo: `draft` → 3+ fotos → `pending` → `active`, con rechazo y reenvío.
- Fotos procesadas con `sharp` (1600 px + thumbnail 400 px, WebP) y servidas desde `/uploads`; en desarrollo se guardan localmente.
- Moderación mínima en `/admin/publicaciones` con aprobar/rechazar y denuncias; el panel admin completo queda para Fase 10.
- Catálogo público básico y detalle con fotos, atributos, entrega, vendedor y badge verificado.
- Tests: **47/47**; build, lint y migración `005` down/up en `revia` y `revia_test` verdes.
- Smoke real: borrador → 3 fotos → `pending` → aprobación → visible en `GET /listings` con 3 fotos.
- Pendiente para producción: mover fotos de publicaciones a R2/Cloudinary y ampliar filtros de catálogo en Fase 4.

## Fase 4 — Descubrimiento: búsqueda, feed, follows y favoritos

**Objetivo:** encontrar artículos y guardar vendedores.

- [x] Búsqueda con `pg_trgm` sobre título y descripción + filtros por rubro, estado, precio y orden.
- [x] Feed: recomendados público + novedades de vendedores seguidos.
- [x] Modelos `Follow`, `Favorite` y migración `006_social`.
- [x] Endpoints de follows, relación, favoritos y feed.
- [x] Perfil público de vendedor con estadísticas y publicaciones activas.
- [x] UI de catálogo con filtros, detalle, favoritos y perfil de vendedor.
- [x] Optimistic UI en favoritos y seguimiento, con rollback.
- [x] Tests de búsqueda, filtros, follows y favoritos.
- [x] Tests de componentes Next.js con Vitest + Testing Library.

**DoD:** catálogo navegable, búsqueda con filtros, feed y favoritos funcionando.

## Avance Fase 4 (2026-11-09)

- Migración `006_social`: `follows`, `favorites` e índices `pg_trgm` para búsqueda.
- Búsqueda por título/descripción con filtros de rubro, estado, precio, modalidad y orden.
- Feed público de recomendados y feed privado de vendedores seguidos.
- Seguir/dejar de seguir con contador de seguidores y perfil público `/vendedores/[id]`.
- Favoritos con alta/baja idempotente, estado por publicación y página `/favoritos`.
- UI: catálogo con filtros, tarjetas reutilizables, detalle con favorito, feed en inicio y perfil de vendedor.
- Optimistic UI en favoritos y follow, con rollback ante error.
- Tests de componentes Next.js: `VerifiedBadge`, `InfoTooltip`, `ListingFields` y `ListingsPage` (5 tests).
- Tests totales: **50 API + 5 web**; build y lint verdes.
- Migración `006` down/up verificada en `revia` y `revia_test`.
- Smoke real: follow + favorito + feed + búsqueda + perfil de vendedor respondiendo correctamente.

## Fase 5 — Ofertas, chat y notificaciones in-app

**Objetivo:** negociar y coordinar dentro de la plataforma.

- [x] Modelo `Offer` y migración `007` con índice de oferta pendiente única.
- [x] Ofertas: crear, aceptar, rechazar, contraofertar, cancelar y expirar.
- [x] Límite de -30%, 24 h, pago 24 h y 25/día.
- [x] Modelos `Conversation`, `Message` y flags de contacto.
- [x] Chat con polling 3–5 s, paginación por `after` y contador de no leídos.
- [x] Filtro de contacto (advierte y marca, no bloquea).
- [x] Bloquear y denunciar usuarios.
- [x] Modelo `Notification`, centro in-app y marcado de leídas.
- [x] UI de ofertas, chat, notificaciones y acciones en el detalle.
- [x] Tests de ofertas, expiración, chat, filtro y notificaciones.

**DoD:** oferta completa, chat operativo y notificaciones in-app.

## Avance Fase 5 (2026-11-10)

- Migración `007_offers_chat_notifications`: ofertas, conversaciones, mensajes, notificaciones, bloqueos y denuncias de usuarios.
- Ofertas: hasta -30%, 24 h de vigencia, 24 h de pago, 25/día, contraofertas y cancelación.
- Chat por publicación con polling de 4 s, paginación por `after`, no leídos y filtro de contacto.
- Bloqueo y denuncia de usuarios; el bloqueo impide enviar mensajes.
- Notificaciones in-app para ofertas, mensajes, publicaciones y KYC.
- UI: `/ofertas`, `/chat`, `/chat/[id]`, `/notificaciones`, y acciones de oferta/contacto en el detalle.
- Tests: **56 API + 7 componentes web**; build/lint verdes; migración `007` aplicada en `revia` y `revia_test`.
- Smoke real: oferta → aceptada → notificación → chat con filtro → bloqueo → notificaciones leídas.

## Fase 6 — Órdenes, Talo, pago y entrega (48 h)

**Objetivo:** cobrar por transferencia, custodiar y completar la entrega.

- [x] Modelos `Order`, `OrderEvent`, `DeliveryCode`, `Payment`, `PaymentEvent`, `Refund`.
- [x] Migraciones y snapshot de precios/Tasa.
- [x] Crear orden desde publicación u oferta.
- [x] Integración Talo: crear pago, CVU/alias/QR, consultar estado.
- [x] Webhook Talo idempotente y conciliación.
- [x] Estados `pending_payment`, `paid`, `delivered`, `completed`.
- [x] Código de 6 dígitos y validación.
- [x] Ventana de 48 h y job de auto-completado.
- [x] Jobs de expiración de ofertas y pagos.
- [x] UI de checkout, pago, orden y entrega.
- [x] Historial de compras del comprador (`/compras`) con estado y acciones.
- [x] Historial de ventas del vendedor (`/ventas`) con estado, comprador, monto y payout.
- [x] Timeline de la orden visible para comprador y vendedor (auditoría de la operación).
- [x] Setear `seller_verified_at` al completar la primera venta y mostrar el check de perfil verificado.
- [x] Tests de Talo mock, webhook, montos, estados e historiales.

**DoD:** compra pagada por transferencia, entrega validada, orden completada a las 48 h y paneles de compras/ventas con auditoría.

## Avance Fase 6 (2026-11-10)

- Migración `008_orders_payments`: `orders`, `order_events`, `delivery_codes`, `payments`, `payment_events` y `refunds`.
- Snapshot de precios, Tasa y payout; índices parciales contra doble venta y compras activas duplicadas.
- Talo Sandbox integrado: token, creación de pago, CVU/alias, consulta de estado, simulación de transferencia y webhook idempotente.
- Órdenes desde publicación u oferta aceptada; checkout con cotización backend y reintento de pago.
- Estados `pending_payment`, `payment_review`, `paid`, `handover_pending`, `delivered`, `completed`, `cancelled` y `expired`.
- Código de entrega de 6 dígitos cifrado; validación por el vendedor y confirmación del comprador.
- Jobs cada 60 s: expiración de ofertas, reconciliación de pagos vencidos y auto-completado a las 48 h.
- `seller_verified_at` en la primera venta completada.
- UI: checkout, `/compras`, `/compras/[id]`, `/ventas`, `/ventas/[id]`, instrucciones de pago con CVU/alias/QR, código y timeline.
- Tests: **63 API + 11 web**; build/lint verdes; migración `008` down/up verificada.
- Smoke real con Talo Sandbox: oferta aceptada → pago → webhook → código → entrega → orden completada (`npm run smoke:fase5-6`).

## Fase 7 — Payouts manuales, finanzas y conciliación

**Objetivo:** pagar al vendedor con control y auditoría.

- [x] Modelo `Payout` y migración.
- [x] Cola de payouts para `finance`.
- [x] Bloqueo por disputa, reembolso pendiente o datos inválidos.
- [x] Marcar `processing`, `paid` y `failed` con comprobante.
- [x] Auditoría de acciones de finanzas.
- [x] Panel de payout del vendedor con comprobante descargable.
- [x] Resumen de ingresos y auditoría de ventas/payouts para el vendedor y para finanzas.
- [x] Conteo de SLA 48–72 h hábiles.
- [x] Conciliación diaria Talo vs órdenes.
- [x] Tests de payout, bloqueos y auditoría.

**DoD:** payout completo con comprobante, bloqueos y trazabilidad.

## Avance Fase 7 (2026-11-10)

- Migración `009_payouts`: `payouts` y `payout_events` con estados, SLA, operación y auditoría.
- Payout automático al completar la orden; orden `completed` → `payout_pending` al procesar → `paid_out` al pagar.
- Bloqueos por KYC, cuenta faltante/en revisión, titular distinto, disputa o reembolso pendiente.
- Cola de finanzas con filtros, procesamiento, pago con `operationId`, fallo con motivo y reintento.
- Panel del vendedor `/cobros` con resumen, estados, SLA y comprobante descargable.
- Resumen y auditoría de payouts para vendedor y finanzas; cuenta de cobro siempre enmascarada.
- Conciliación Talo diaria + ejecución manual desde finanzas.
- Tests: **71 API + 13 web**; build/lint verdes; migración `009` down/up verificada.
- Smoke real: `npm run smoke:fase7` procesa, paga y descarga el comprobante.

## Fase 8 — Disputas, reembolsos, cupones y reseñas

**Objetivo:** resolver problemas y construir reputación.

- [x] Modelos `Dispute`, `DisputeEvent`, `DisputeEvidence`, `Review`, `Coupon`, `CouponRedemption`.
- [x] Apertura de disputa dentro de 48 h.
- [x] Congelamiento de payout y SLA 72 h.
- [x] Evidencia, mensajes y resolución (`refund_money`, `refund_coupon`, `reject`).
- [x] Reembolso Talo `FULL`/`PARTIAL` e idempotencia.
- [x] Cupón por valor del artículo, 90 días, un uso, sin combinar con ofertas.
- [x] Reseñas bidireccionales con ventana de 30 días.
- [x] UI de disputas, reembolsos y reseñas.
- [x] Tests de disputas, cupones, reembolsos y reseñas.

**DoD:** disputa resuelta con reembolso o cupón; reseñas visibles y moderables.

## Avance Fase 8 (2026-11-10)

- Migración `010_disputes_coupons_reviews`: disputas, eventos, evidencia, cupones, redenciones y reseñas.
- Disputa desde `delivered` dentro de 48 h, con bloqueo de payout y SLA de 72 h.
- Mensajes, evidencia por enlace/texto, oferta del vendedor y resolución por soporte/admin.
- Reembolsos Talo `FULL`/`PARTIAL` idempotentes; orden `refunded` y payout anulado.
- Cupones por valor del artículo, 90 días, un uso, sin ofertas y liberación al cancelar/expirar la orden.
- Reseñas bidireccionales 1-5, ventana de 30 días, promedio público y moderación por denuncia.
- UI: `/disputas`, `/disputas/[id]`, `/admin/disputas`, `/cupones`, `/admin/resenas` y reseñas en compras/ventas/perfil.
- Tests: **82 API + 18 web**; build/lint verdes; migración `010` down/up verificada.

## Fase 9 — PWA, Web Push y emails transaccionales

**Objetivo:** notificar sin app nativa.

- [ ] `manifest.webmanifest`, iconos y `sw.js`.
- [ ] Suscripción Web Push con VAPID y permiso explícito.
- [ ] Envío de push para eventos críticos.
- [ ] Poda de suscripciones 404/410.
- [ ] Emails Resend: solo verificación, reset y seguridad de cuenta. Operación, pagos, entregas, payouts y disputas van por in-app + push.
- [ ] Página `/notificaciones` y preferencias.
- [ ] Tests de push (mock) y emails.
- [ ] Smoke en Android/desktop; documentar límites de iOS.

**DoD:** push y emails funcionando en producción; PWA instalable.

## Fase 10 — Admin completo y métricas

**Objetivo:** operar REVIA desde un panel.

- [ ] Shell admin con RBAC (`moderator`, `support`, `finance`, `admin`).
- [ ] Dashboard de métricas.
- [ ] Moderación de publicaciones y denuncias.
- [ ] Usuarios y KYC.
- [ ] Órdenes y reembolsos.
- [ ] Payouts.
- [ ] Disputas.
- [ ] Configuración con whitelist.
- [ ] Notificaciones masivas.
- [ ] Auditoría.
- [ ] Tests de permisos y endpoints admin.

**DoD:** cada rol opera su área sin acceso cruzado indebido.

## Fase 11 — Legales, hardening y deploy

**Objetivo:** salir a producción en Bahía Blanca.

- [ ] Términos, privacidad y "Cómo funciona".
- [ ] Validar figura fiscal (monotributo, factura C) con contador.
- [ ] CORS, CSP, Helmet y rate limits definitivos.
- [ ] Revisión de secretos y rotación.
- [ ] Migraciones en Neon; backups.
- [ ] Deploy API en Render y web en Vercel.
- [ ] Dominio, DNS, SSL y correo.
- [ ] Configurar webhooks de Talo y Didit con URLs productivas.
- [ ] Render Starter o keep-alive para webhooks/cron.
- [ ] Smoke manual completo (registro, publicación, compra, entrega, payout, disputa).
- [ ] Métricas y alertas mínimas.
- [ ] Publicar `docs/PRODUCTION.md` y `docs/TESTING.md`.

**DoD:** MVP desplegado, smoke completo, sin secretos expuestos y métricas visibles.

## Backlog posterior (fuera del MVP)

- [ ] Envío integrado con courier.
- [ ] Pago con tarjeta/cuotas.
- [ ] App nativa.
- [ ] Combos/bundles.
- [ ] Vendedores profesionales.
- [ ] Autenticación de artículos de lujo.
- [ ] Suscripciones/destacados pagos.
- [ ] Multi-ciudad.
- [ ] Automatización de payouts.
- [ ] SSE/WebSocket para chat.
