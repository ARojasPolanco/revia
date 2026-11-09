# TASK.md — REVIA

Tablero vivo del proyecto. Se actualiza al empezar y al terminar cada tarea. Si algo no está acá, no está planificado.

## Estado actual

- **Fase:** Fase 2 completada en local (KYC con Didit/mock y cuenta de payout cifrada).
- **Repo:** `REVIA-fullstack`, rama `dev`, con Fase 0 en `main` y Fases 1-2 en `dev`.
- **Alcance:** MVP C2C local en Bahía Blanca, ARS, Tasa de REVIA 7% + $500, custodia y payouts manuales.
- **Documentos creados:** `AGENTS.md`, `TASK.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DECISIONS.md`, `README.md`.
- **Decisiones abiertas:** ninguna. D-026 a D-032 cerradas.
- **Riesgo principal:** operación manual de payouts y dependencia de Talo (solo transferencia).
- **Última actualización:** 2026-11-09.

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

## Fase 3 — Categorías, publicaciones, fotos y moderación

**Objetivo:** publicar artículos con fotos y aprobación previa.

- [ ] Modelos `Category`, `CategoryAttribute`, `Listing`, `ListingPhoto`.
- [ ] Migraciones y seeds idempotentes de taxonomía (8 rubros).
- [ ] CRUD de publicaciones con estados.
- [ ] Upload de fotos (Multer + sharp + R2), mínimo 3.
- [ ] Validación de campos y atributos por subcategoría (Zod).
- [ ] Moderación: cola, aprobar, rechazar con motivo, reenviar.
- [ ] Pausar, reanudar y eliminar (soft delete).
- [ ] Denuncias de publicaciones.
- [ ] Páginas `/publicar`, `/mis-publicaciones`, detalle y edición.
- [ ] Tests de publicación, fotos, estados y moderación.

**DoD:** publicación completa con 3 fotos, aprobación, pausa y rechazo con motivo.

## Fase 4 — Descubrimiento: búsqueda, feed, follows y favoritos

**Objetivo:** encontrar artículos y guardar vendedores.

- [ ] Búsqueda full-text (`pg_trgm`/`tsvector`) con filtros.
- [ ] Feed de inicio: recomendados + seguidos.
- [ ] Modelos `Follow`, `Favorite` y migraciones.
- [ ] Endpoints de follows y favoritos.
- [ ] Perfil público de vendedor.
- [ ] UI de catálogo, filtros, detalle y favoritos.
- [ ] Optimistic UI en favoritos.
- [ ] Tests de búsqueda, filtros, follows y favoritos.

**DoD:** catálogo navegable, búsqueda con filtros, feed y favoritos funcionando.

## Fase 5 — Ofertas, chat y notificaciones in-app

**Objetivo:** negociar y coordinar dentro de la plataforma.

- [ ] Modelo `Offer` y migración con índice de oferta pendiente única.
- [ ] Ofertas: crear, aceptar, rechazar, contraofertar, expirar.
- [ ] Límite de -30%, 24 h, 25/día.
- [ ] Modelos `Conversation`, `Message` y flags de contacto.
- [ ] Chat con polling 3–5 s y paginación `after`.
- [ ] Filtro de contacto (advierte y marca).
- [ ] Bloquear y denunciar.
- [ ] Modelo `Notification` y centro in-app.
- [ ] UI de ofertas, chat y notificaciones.
- [ ] Tests de ofertas, expiración, chat y filtro.

**DoD:** oferta completa, chat operativo y notificaciones in-app.

## Fase 6 — Órdenes, Talo, pago y entrega (48 h)

**Objetivo:** cobrar por transferencia, custodiar y completar la entrega.

- [ ] Modelos `Order`, `OrderEvent`, `DeliveryCode`, `Payment`, `PaymentEvent`, `Refund`.
- [ ] Migraciones y snapshot de precios/Tasa.
- [ ] Crear orden desde publicación u oferta.
- [ ] Integración Talo: crear pago, CVU/alias/QR, consultar estado.
- [ ] Webhook Talo idempotente y conciliación.
- [ ] Estados `pending_payment`, `paid`, `delivered`, `completed`.
- [ ] Código de 6 dígitos y validación.
- [ ] Ventana de 48 h y job de auto-completado.
- [ ] Jobs de expiración de ofertas y pagos.
- [ ] UI de checkout, pago, orden y entrega.
- [ ] Tests de Talo mock, webhook, montos y estados.

**DoD:** compra pagada por transferencia, entrega validada y orden completada a las 48 h.

## Fase 7 — Payouts manuales, finanzas y conciliación

**Objetivo:** pagar al vendedor con control y auditoría.

- [ ] Modelo `Payout` y migración.
- [ ] Cola de payouts para `finance`.
- [ ] Bloqueo por disputa, reembolso pendiente o datos inválidos.
- [ ] Marcar `processing`, `paid` y `failed` con comprobante.
- [ ] Auditoría de acciones de finanzas.
- [ ] Panel de payout del vendedor.
- [ ] Conteo de SLA 48–72 h hábiles.
- [ ] Conciliación diaria Talo vs órdenes.
- [ ] Tests de payout, bloqueos y auditoría.

**DoD:** payout completo con comprobante, bloqueos y trazabilidad.

## Fase 8 — Disputas, reembolsos, cupones y reseñas

**Objetivo:** resolver problemas y construir reputación.

- [ ] Modelos `Dispute`, `DisputeEvent`, `DisputeEvidence`, `Review`, `Coupon`, `CouponRedemption`.
- [ ] Apertura de disputa dentro de 48 h.
- [ ] Congelamiento de payout y SLA 72 h.
- [ ] Evidencia, mensajes y resolución (`refund_money`, `refund_coupon`, `reject`).
- [ ] Reembolso Talo `FULL`/`PARTIAL` e idempotencia.
- [ ] Cupón por valor del artículo, 90 días, un uso, sin combinar con ofertas.
- [ ] Reseñas bidireccionales con ventana de 30 días.
- [ ] UI de disputas, reembolsos y reseñas.
- [ ] Tests de disputas, cupones, reembolsos y reseñas.

**DoD:** disputa resuelta con reembolso o cupón; reseñas visibles y moderables.

## Fase 9 — PWA, Web Push y emails transaccionales

**Objetivo:** notificar sin app nativa.

- [ ] `manifest.webmanifest`, iconos y `sw.js`.
- [ ] Suscripción Web Push con VAPID y permiso explícito.
- [ ] Envío de push para eventos críticos.
- [ ] Poda de suscripciones 404/410.
- [ ] Emails Resend: verificación, reset, orden, entrega, payout, disputa.
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
