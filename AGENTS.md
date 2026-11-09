# AGENTS.md — REVIA

Documento operativo obligatorio para cualquier persona o agente que trabaje en este repositorio. Si una regla de este archivo choca con una decisión nueva, primero se actualiza la documentación (`docs/`) y después el código.

## 1. Contexto del producto

REVIA es un marketplace C2C de artículos de segunda mano entre particulares, exclusivamente en **Bahía Blanca, Argentina**, con moneda **ARS** y solo para mayores de **18 años**.

El comprador paga una **Tasa de REVIA** (7% + $500 ARS, configurable) que cubre reembolsos, procesamiento y mantenimiento. El vendedor paga 0%. El dinero queda en custodia de REVIA hasta que el comprador confirma la entrega (o vencen 48 horas sin reclamo) y luego se transfiere manualmente al vendedor.

El MVP no tiene logística integrada: hay retiro en domicilio, punto medio céntrico y envío coordinado con Uber/Didi por chat. Hay un código de entrega de 6 dígitos, una ventana de reclamo de 48 horas, disputas con SLA de 72 horas y reseñas bidireccionales.

La especificación completa está en `docs/SPEC.md`.

## 2. Estado del repositorio

- Fase actual: **documentación inicial**. Todavía no hay código de aplicación.
- El repositorio se crea nuevo, con historia Git limpia.
- No hay credenciales, claves ni secretos versionados.
- Toda decisión de producto y técnica se registra en `docs/DECISIONS.md`.
- El código se construye por fases según `TASK.md`.

## 3. Orden de lectura obligatorio

1. `AGENTS.md`
2. `TASK.md`
3. `README.md`
4. `docs/SPEC.md`
5. `docs/ARCHITECTURE.md`
6. `docs/API.md`
7. `docs/DECISIONS.md`

Los documentos `docs/DATA-MODEL.md`, `docs/ROUTES.md`, `docs/TESTING.md`, `docs/PRODUCTION.md`, `docs/UI.md` y `docs/TALO-DIDIT.md` se crean durante las fases correspondientes.

## 4. Stack

| Capa          | Tecnología                                                 |
| ------------- | ---------------------------------------------------------- |
| Monorepo      | npm workspaces (`apps/api`, `apps/web`, `packages/shared`) |
| Runtime       | Node.js 22 LTS                                             |
| Lenguaje      | TypeScript estricto (API y web)                            |
| Backend       | Express 4 + Sequelize 6                                    |
| Migraciones   | Umzug con SQL crudo numerado                               |
| Base de datos | PostgreSQL 16 en Neon                                      |
| Validación    | Zod por módulo + schemas compartidos                       |
| Auth          | JWT (1 día) + bcrypt (12 rounds) + email + Google OAuth    |
| Email         | Resend                                                     |
| CAPTCHA       | hCaptcha (opcional en desarrollo/test)                     |
| Fotos         | Multer + sharp + Cloudflare R2                             |
| Pagos         | Talo (transferencia bancaria, oculto al usuario)           |
| KYC           | Didit (oculto al usuario)                                  |
| Push          | `web-push` + VAPID + service worker + PWA                  |
| Frontend      | Next.js 15 (App Router) + React + Tailwind CSS             |
| Tests         | Vitest + Supertest (API); Vitest + Testing Library (web)   |
| Deploy        | API en Render, web en Vercel, PostgreSQL en Neon, R2       |
| Contenedores  | Docker + docker-compose para PostgreSQL y app              |

## 5. Estructura del monorepo

```
REVIA-fullstack/
├─ apps/
│  ├─ api/
│  │  ├─ migrations/            # SQL crudo numerado
│  │  ├─ seeders/
│  │  ├─ src/
│  │  │  ├─ config/             # envs, database, r2, resend, talo, didit, push
│  │  │  ├─ errors/
│  │  │  ├─ middlewares/
│  │  │  ├─ modules/            # auth, users, kyc, listings, offers, orders...
│  │  │  ├─ routes/
│  │  │  ├─ app.ts
│  │  │  └─ index.ts
│  │  └─ vitest.config.ts
│  └─ web/
│     ├─ public/                # manifest, sw.js, iconos
│     └─ src/
│        ├─ app/
│        ├─ components/
│        ├─ lib/
│        └─ styles/
├─ packages/
│  └─ shared/                   # Zod schemas, enums, constantes
├─ docker/
│  └─ initdb/
├─ docs/
├─ docker-compose.yml
├─ Dockerfile.api
├─ Dockerfile.web
├─ AGENTS.md
├─ TASK.md
└─ README.md
```

## 6. Convenciones de código

- **TypeScript estricto** en API y web. No usar `any` salvo justificación documentada.
- ESM (`"type": "module"`) e imports con extensión `.js` en la API.
- Comillas simples, punto y coma, `trailingComma: "es5"`, `printWidth: 100`, 2 espacios.
- Backend: archivos `camelCase.ts`; modelos Sequelize `PascalCase.ts`; clases `PascalCase`.
- Frontend: componentes `PascalCase.tsx`; hooks `useX.ts`; utilidades `camelCase.ts`.
- Variables de entorno en `SCREAMING_SNAKE_CASE`.
- Fechas en DB en UTC (`TIMESTAMPTZ`); la UI muestra `America/Argentina/Buenos_Aires`.
- Dinero en **enteros ARS** (`*_ars`), nunca `float` ni strings con decimales.
- Código autodescriptivo. Comentarios solo para decisiones no obvias, invariantes o riesgos.
- No hardcodear valores configurables: van a `config/` o a la tabla `config`.
- Soft delete: `is_deleted` en entidades persistentes. Se permite borrado físico en tokens y datos efímeros.

## 7. Patrón backend

```
Route → Controller (catchAsync) → Service → Model
                  ↘ Validación Zod → 422
                  ↘ AppError → globalErrorHandler
```

Cada módulo contiene:

- `*.model.ts`: modelo Sequelize.
- `*.service.ts`: acceso a datos y reglas de negocio.
- `*.controller.ts`: handlers HTTP envueltos en `catchAsync`.
- `*.route.ts`: rutas y middlewares.
- `*.schema.ts`: schemas Zod + `validateX()` que devuelve `{ hasError, errorMessages, data }`.

Reglas:

- Los controllers no acceden a modelos directamente.
- Las transacciones viven en servicios.
- Los IDs de autor/owner salen de la sesión, nunca del body.
- Toda operación con dinero es transaccional y registra un evento.

## 8. Manejo de errores

- `AppError` con `statusCode`, `status` (`fail`/`error`), `isOperational`.
- `catchAsync` para handlers async.
- `globalErrorHandler` distinto en desarrollo y producción.
- `errorMatchers` traduce Sequelize, JWT, PostgreSQL, Zod y body-parser.
- Errores 5xx/no operativos se persisten en `errors` con redacción.
- Códigos: 422 validación, 400 entrada inválida/JSON inválido, 401 sin/invalid token, 403 permisos/estado/CORS, 404 inexistente, 409 conflicto, 413 cuerpo demasiado grande, 429 rate limit, 500 inesperado, 503 servicio no disponible.
- Los mensajes de Zod se traducen a español y se devuelven con el campo afectado.
- Los mensajes al usuario no incluyen términos técnicos (JSON, rutas, tablas, stack) ni detalles de proveedores; eso queda en logs internos.
- Errores de body-parser, CORS, Multer, JWT, Sequelize y PostgreSQL se normalizan antes de responder.
- Las violaciones de unicidad se mapean a 409 sin exponer PostgreSQL.
- Los errores de webhook se registran sin romper la respuesta `200` de Talo/Didit.
- Nunca exponer detalles de Talo o Didit en mensajes al usuario.

## 9. Validación

- Zod por módulo con `.strict()` en escrituras.
- `validateX()` devuelve `{ hasError, errorMessages, data }`.
- Normalización: email a minúsculas, trim, títulos sin HTML.
- Enums y schemas compartidos viven en `packages/shared`.
- La Tasa, precios y totales se calculan y validan en el backend.
- No confiar en el cliente para montos, roles, ownership ni estados.

## 10. Auth y seguridad

- bcrypt con 12 rounds.
- JWT de 1 día, sin refresh. Payload mínimo `{ id, role }`.
- JWT transportado en cookie `httpOnly` (`revia_at`), `Secure` en producción y `SameSite=None` para cross-site (Render/Vercel). Cookie no sensible `revia_session=1` como hint del frontend. Bearer solo para tests/herramientas.
- CORS con `credentials` y verificación de `Origin` en mutaciones (CSRF).
- `protect` valida token, usuario existente, no borrado y suspensión vigente.
- `restrictTo(...roles)` para endpoints por rol.
- `requireVerifiedEmail` para comprar, vender, ofertar, chatear y reseñar.
- `requireKycApproved` para publicar y cobrar.
- `requireOnboardingCompleted` hasta que la cuenta tenga fecha de nacimiento y términos (caso Google).
- Verificación de email: token random, hash SHA-256, vence en 24 h, un solo uso.
- Reset de contraseña: token random, hash SHA-256, vence en 1 h, un solo uso, respuesta genérica.
- Google OAuth 2.0 server-side. Las cuentas nuevas con Google entran con onboarding pendiente (fecha de nacimiento y términos) porque Google no aporta la edad.
- hCaptcha en registro; bypass en test y en desarrollo sin secret.
- Password 10–128 caracteres.
- Rate limits por IP, credencial y usuario.
- 18+ obligatorio con fecha de nacimiento y aceptación de términos.
- CORS con whitelist del dominio web.
- Helmet + CSP estricta.
- No usar `dangerouslySetInnerHTML` con contenido de usuario.
- Datos de payout cifrados a nivel aplicación (AES-256-GCM) con clave en env.
- Webhooks con secret/token y procesamiento idempotente.
- No loguear tokens, passwords, emails completos ni datos de pago.
- No exponer Talo ni Didit al usuario.

## 11. Base de datos y migraciones

- Sequelize con `underscored: true`, `timestamps: true`, pool y retry.
- `NODE_ENV=test` usa `TEST_DB_URI`; nunca la base de desarrollo.
- Umzug con migraciones SQL crudas y numeradas.
- PK UUID con `gen_random_uuid()`. Excepción: `errors` y `metrics_events` (`BIGSERIAL`).
- `created_at`/`updated_at` en entidades, salvo tablas inmutables.
- Dinero en columnas `INTEGER` (ARS), nunca `FLOAT`.
- Snapshot de precios y Tasa en la orden.
- Transacciones con `SELECT ... FOR UPDATE` en aceptar oferta, crear orden, validar código y resolver disputa.
- Índices únicos/parciales para evitar carreras (oferta pendiente única, código activo único, reseña única).
- Seeds idempotentes.
- No se editan migraciones ya aplicadas en producción; se agrega una nueva.

## 12. Convenciones de API

- Prefijo `/api/v1`.
- Éxito: `{ "status": "success", ... }`. Error: `{ "status": "fail" | "error", "message": "..." }`.
- IDs UUID. Fechas ISO 8601 UTC.
- Listados con `page`/`limit` (máximo 50).
- Nada de datos sensibles en respuestas públicas.
- Endpoints idempotentes donde el negocio lo permita.
- El contrato completo está en `docs/API.md`.
- La API responde `REVIA API v1` en la raíz.

## 13. Reglas de negocio críticas

### Publicaciones

- Solo publica un vendedor con email verificado, onboarding completo y KYC aprobado.
- Nacen en `draft`; pasan a `pending` al enviarlas a revisión y solo son públicas en `active`.
- Requieren mínimo 3 fotos y máximo 10; JPG/PNG/WebP de hasta 8 MB, procesadas con `sharp`.
- Los atributos obligatorios de cada subcategoría se validan al enviar a revisión.
- Solo se editan en `draft`, `rejected` o `paused`; una publicación activa se pausa antes de editar.
- La moderación previa aprueba o rechaza con motivo; el vendedor puede corregir y reenviar.
- Denuncias de publicaciones se registran y las resuelve moderación.

### Tasa

- `tasa_amount_ars = round(item_price_ars * tasa_percent / 100) + tasa_fixed_ars`.
- Se calcula sobre el precio del artículo, nunca sobre la tarifa logística.
- Se guarda snapshot en la orden.
- El vendedor nunca paga comisión.

### Dinero y custodia

- Los fondos entran a la cuenta de REVIA (Talo) y no salen hasta `completed`.
- El payout se bloquea con disputa abierta, reembolso pendiente o datos inválidos.
- Los payouts son manuales en el MVP y los ejecuta un rol `finance`.
- El titular de la cuenta de cobro debe coincidir con la identidad verificada; si no coincide, queda `pending_review` y no se paga.
- Los datos de payout se guardan cifrados con AES-256-GCM y la API solo devuelve versiones enmascaradas.
- Toda operación de dinero deja evento y auditoría.
- No se expone Talo al usuario.

### Descubrimiento y social

- Búsqueda con `pg_trgm` sobre título y descripción; filtros por rubro, estado, precio, entrega y orden.
- Feed público de recomendados y feed privado de vendedores seguidos.
- Favoritos y follows son idempotentes y no reservan ni modifican la publicación.
- Optimistic UI en favoritos/follow con rollback ante error.

### Ofertas

- Descuento máximo 30%.
- Vigencia 24 h; pago 24 h; no vinculante; no reserva.
- Solo aplican al precio del artículo.

### Entrega y reclamo

- Código de 6 dígitos, un solo uso.
- La entrega marca `delivered`; desde ahí corren 48 h.
- Sin reclamo, la orden pasa a `completed` y habilita payout.
- Una disputa congela el payout y tiene SLA de 72 h.

### Reembolsos

- Dinero: incluye la Tasa.
- Cupón: solo el valor del artículo, sin Tasa, vence a los 90 días y no se combina con ofertas.
- No se crea un reembolso nuevo mientras haya uno `PENDING`.

### KYC

- Obligatorio para publicar y cobrar.
- La UI dice "Verificación de REVIA"; el proveedor nunca se menciona.
- No se guardan biometrías crudas; solo estado, referencia de sesión y motivo.
- El webhook del proveedor se verifica con HMAC-SHA256 y ventana de 5 minutos.
- Sin `DIDIT_WORKFLOW_ID` y fuera de producción, el flujo usa modo mock para pruebas; en producción es obligatorio configurarlo.

## 14. Frontend: reglas críticas

Heredadas del incidente real de Market Design:

1. Ningún componente global montado en el layout raíz puede llamar endpoints autenticados sin token.
2. Todo hook que haga fetch debe chequear la sesión y no llamar a la API si no hay token.
3. Si un componente tiene early return por falta de usuario, los hooks de fetch van en un componente interno montado solo con sesión.
4. El interceptor 401 no manipula cookies `httpOnly` desde JS: marca la sesión como nula y redirige a `/ingresar` solo si no se está ya en una ruta pública de auth. Nunca redirigir en bucle.
5. Los endpoints de auth (`/auth/login`, `/auth/register`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/google`) no disparan redirect.
6. Los endpoints protegidos devuelven 401 sin token; nunca 200 vacío ni redirect del servidor.
7. Toda request protegida asume 401 y lo maneja sin depender de que el usuario esté logueado.
8. `ProtectedRoute`/middleware para rutas privadas; admin con shell propio.
9. `ErrorBoundary` global para evitar pantallas blancas.
10. Fechas y countdowns con `Intl` y zona ART.
11. Optimistic UI en favoritos, likes y ofertas, con rollback en error.
12. No cachear respuestas autenticadas en el service worker.
13. No usar `any`. DTOs tipados y cliente API por módulo.
14. No duplicar enums: reutilizar `packages/shared`.
15. Mobile-first y responsive. La PWA es instalable.

## 15. PWA, push y chat

- Service worker solo gestiona push, click y cache de assets públicos. Nunca cachea API autenticada.
- Permiso de push solo con gesto explícito.
- Payload de push menor a 4 KB; podar suscripciones 404/410.
- Persistir la notificación antes de enviar push.
- Chat por polling cada 3–5 s, con paginación por `after`.
- Filtro de contacto: advierte y marca, no bloquea.
- No compartir datos de contacto automáticamente.

## 16. Tests

- API: Vitest + Supertest, `NODE_ENV=test`, `TEST_DB_URI`, `fileParallelism: false`.
- La base de test es `revia_test`; los tests fallan si no está disponible.
- Migraciones en `beforeAll`.
- Unitarios para Tasa, ofertas, estados, plazos, cupones y permisos.
- Integración para auth, publicaciones, ofertas, órdenes, pagos (mock Talo), payouts, disputas y reembolsos.
- Web: Vitest + Testing Library para hooks, formularios y flujos críticos.
- Sin E2E automatizados en el MVP; el smoke manual es obligatorio.
- Los webhooks se testean con fixtures y se validan idempotencia y estados.

## 17. Git y commits

- Rama de desarrollo: `dev`. Todo el trabajo se integra ahí.
- `main` es producción y solo recibe releases aprobados desde `dev`.
- Husky + lint-staged en pre-commit (Prettier + ESLint).
- commitlint en commit-msg.
- Formato: `type(scope): descripción`.
- Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- Ejemplos: `feat(orders): agregar código de entrega`, `docs(spec): cerrar taxonomía`.
- No se commitean secretos, `.env`, logs ni `node_modules`.
- No se hace commit sin lint y tests en verde.
- No se hace commit, push ni PR sin pedido explícito del usuario.

## 18. Prohibiciones explícitas

- No JavaScript sin tipos en la API ni en la web.
- No Prisma ni Drizzle.
- No Mercado Pago.
- No Redis en el MVP.
- No WebSocket ni SSE en el MVP (chat por polling).
- No app nativa.
- No carrito, combos ni bundles.
- No vendedores profesionales ni tiendas.
- No envío integrado con correo/courier.
- No pago con tarjeta ni cuotas.
- No exponer Talo ni Didit en UI, logs públicos, emails o mensajes de error.
- No hardcodear la Tasa en el frontend.
- No confiar en montos del cliente.
- No borrar datos físicamente salvo tokens/efímeros permitidos.
- No guardar biometrías crudas.
- No mostrar datos de payout completos en respuestas públicas.
- No cambiar reglas de producto sin actualizar `docs/SPEC.md` y `docs/DECISIONS.md`.

## 19. Definition of Done

Una tarea se considera terminada cuando:

- El código cumple las reglas de este archivo.
- La documentación afectada está actualizada.
- `npm run lint` pasa.
- `npm run test` pasa.
- Si toca DB, la migración sube y baja correctamente.
- Si toca auth, interceptores o componentes globales, se completó el smoke manual.
- Si toca UI, funciona en mobile y desktop.
- Si toca dinero, hay tests de montos, estados e idempotencia.
- No se agregaron secretos ni datos personales.
- `TASK.md` refleja el estado real.

## 20. Comandos previstos

```bash
npm run docker:up        # PostgreSQL en localhost:5433
npm run docker:down
npm run docker:app       # PostgreSQL + API + web en Docker
npm run dev              # API en desarrollo
npm run dev:web          # Next.js en desarrollo
npm run build            # build de API y web
npm run lint             # ESLint
npm run test             # tests de API
npm run test:web         # tests de web
npm run seed             # seed de desarrollo
npm run seed:dev         # usuarios demo para probar pantallas protegidas
npm run seed:admin       # crea admin inicial
```

Los comandos definitivos se ajustan en la Fase 0.

## 21. Reutilización de Market Design y Duo LAS

- **Market Design:** monorepo, Express+Sequelize, capas, Zod, errores, soft delete, R2, Resend, rate limits, admin de config, Husky/commitlint, frontend-first con mocks.
- **Duo LAS:** auth JWT+bcrypt+emails, verificación, reset, hCaptcha, PWA, `web-push`/VAPID, service worker, notificaciones persistidas, interceptor 401 sin loops, deploy Render+Vercel+Neon, estructura de `docs/`, seeds idempotentes.
- Se porta la **infraestructura**, no las reglas de negocio ajenas.
- Todo módulo portado se migra a TypeScript y se cubre con tests.

## 22. Principios de producto

- La confianza es la feature principal: moderación, KYC, custodia y soporte.
- El comprador siempre ve el precio final desglosado antes de pagar.
- El vendedor nunca paga comisión.
- Nunca se promete una protección que REVIA no pueda cumplir.
- Ante la duda, se prioriza resolver la disputa y aprender, no maximizar el ingreso.
- El MVP es local y pequeño: se optimiza por claridad operativa, no por escala.
