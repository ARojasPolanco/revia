# REVIA — Arquitectura

## 1. Vista general

REVIA es un monorepo TypeScript con dos aplicaciones desplegables y un paquete compartido:

```
┌──────────────────────────┐        ┌──────────────────────────┐
│ apps/web — Next.js 15    │ HTTPS  │ apps/api — Express 4     │
│ PWA + Tailwind + RSC     │───────▶│ TypeScript + Sequelize 6 │
│ Vercel                   │        │ Render (web service)     │
└───────────┬──────────────┘        └───────────┬──────────────┘
            │                                   │
            │                                   ├── PostgreSQL 16 (Neon)
            │                                   ├── Cloudflare R2 (fotos)
            │                                   ├── Talo (transferencias)
            │                                   ├── Didit (KYC)
            │                                   ├── Resend (email)
            │                                   └── Web Push (VAPID)
            │
            └── Service Worker + Web Push (navegador)
```

Servicios externos:

| Servicio          | Uso                                                                 | Visible al usuario                        |
| ----------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| **Talo**          | Cobro por transferencia, CVU/alias por orden, webhooks, reembolsos. | No. La UI dice "Pago por transferencia".  |
| **Didit**         | Verificación de identidad (ID + liveness + face match).             | No. La UI dice "Verificación de REVIA".   |
| **Resend**        | Emails transaccionales.                                             | Sí como email de REVIA.                   |
| **Cloudflare R2** | Fotos de publicaciones.                                             | No se expone el bucket; se sirve por CDN. |
| **Neon**          | PostgreSQL gestionado.                                              | No.                                       |
| **Render**        | API persistente y cron jobs.                                        | No.                                       |
| **Vercel**        | Web Next.js y CDN.                                                  | No.                                       |

## 2. Estructura del monorepo

```
REVIA-fullstack/
├─ apps/
│  ├─ api/
│  │  ├─ migrations/            # SQL crudo numerado (Umzug)
│  │  ├─ seeders/
│  │  ├─ src/
│  │  │  ├─ config/             # envs, database, r2, resend, talo, didit, push
│  │  │  ├─ errors/             # AppError, catchAsync, matchers, handler
│  │  │  ├─ middlewares/        # auth, roles, rate limits, validación, upload
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ users/
│  │  │  │  ├─ kyc/
│  │  │  │  ├─ categories/
│  │  │  │  ├─ listings/
│  │  │  │  ├─ favorites/
│  │  │  │  ├─ follows/
│  │  │  │  ├─ offers/
│  │  │  │  ├─ orders/
│  │  │  │  ├─ payments/        # Talo: create, webhook, refund
│  │  │  │  ├─ payouts/
│  │  │  │  ├─ disputes/
│  │  │  │  ├─ reviews/
│  │  │  │  ├─ conversations/
│  │  │  │  ├─ notifications/
│  │  │  │  ├─ push/
│  │  │  │  ├─ admin/
│  │  │  │  ├─ metrics/
│  │  │  │  ├─ config/
│  │  │  │  └─ logs/
│  │  │  ├─ routes/
│  │  │  ├─ app.ts
│  │  │  └─ index.ts
│  │  └─ vitest.config.ts
│  └─ web/
│     ├─ public/                # manifest.webmanifest, sw.js, iconos
│     ├─ src/
│     │  ├─ app/                # App Router
│     │  │  ├─ (public)/
│     │  │  ├─ (auth)/
│     │  │  ├─ (app)/
│     │  │  └─ admin/
│     │  ├─ components/
│     │  ├─ lib/                # api client, auth, push, formatters
│     │  └─ styles/
│     └─ next.config.ts
├─ packages/
│  └─ shared/                   # Zod schemas, enums, constantes, tipos
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

## 3. Stack

| Capa          | Tecnología                                                               |
| ------------- | ------------------------------------------------------------------------ |
| Monorepo      | npm workspaces (`apps/api`, `apps/web`, `packages/shared`)               |
| Runtime       | Node.js 22 LTS                                                           |
| Lenguaje      | TypeScript estricto en API y web                                         |
| Backend       | Express 4 + Sequelize 6                                                  |
| Migraciones   | Umzug con SQL crudo numerado                                             |
| Base de datos | PostgreSQL 16 en Neon                                                    |
| Validación    | Zod en cada módulo + schemas compartidos                                 |
| Auth          | JWT (1 día) + bcrypt (12 rounds) + verificación por email + Google OAuth |
| Email         | Resend                                                                   |
| CAPTCHA       | hCaptcha (opcional en desarrollo/test)                                   |
| Fotos         | Multer + sharp + Cloudflare R2                                           |
| Pagos         | Talo (transferencia bancaria)                                            |
| KYC           | Didit                                                                    |
| Push          | `web-push` + VAPID + service worker + PWA                                |
| Deploy        | API en Render, web en Vercel, PostgreSQL en Neon, R2                     |
| Tests         | Vitest + Supertest (API), Vitest + Testing Library (web)                 |

## 4. Flujo de una compra

```
Comprador            Web (Next.js)              API (Express)                 Talo
   │                      │                         │                          │
   │  Comprar             │                         │                          │
   │─────────────────────▶│  POST /orders           │                          │
   │                      │────────────────────────▶│  crea orden              │
   │                      │                         │  pending_payment         │
   │                      │                         │  POST /payments/         │
   │                      │                         │─────────────────────────▶│
   │                      │                         │◀─────────────────────────│
   │                      │  CVU / alias / QR       │  guarda talo_payment_id  │
   │                      │◀────────────────────────│                          │
   │  Transfiere          │                         │                          │
   │──────────────────────────────────────────────────────────────────────────▶│
   │                      │                         │  webhook (paymentId)     │
   │                      │                         │◀─────────────────────────│
   │                      │                         │  GET /payments/{id}      │
   │                      │                         │─────────────────────────▶│
   │                      │                         │◀─────────────────────────│
   │                      │  orden paid + código    │  SUCCESS → paid          │
   │                      │◀────────────────────────│                          │
```

Reglas:

- `external_id = order_id` y es único.
- El webhook responde `200` rápido y el proceso pesado se hace después de consultar el estado canónico.
- El procesamiento es idempotente por `order_id` + `payment_id`.
- `OVERPAID`/`UNDERPAID` generan una tarea de revisión manual.
- `EXPIRED` cancela la orden y libera la publicación.

## 5. Flujo de custodia y payout

```
Pago confirmado → fondos en cuenta Talo de REVIA
        │
        ▼
Orden delivered (código validado o confirmación del comprador)
        │
        ▼
Ventana de 48 h
   ├─ Disputa → orden disputed → payout congelado
   └─ Sin reclamo → completed
        │
        ▼
payout_pending → Finanzas transfiere (48–72 h hábiles) → paid_out
```

- REVIA es la única que decide cuándo sale el dinero.
- El payout se registra con `payout_account_id`, monto, fecha, comprobante y quién lo ejecutó.
- Si hay disputa, reembolso pendiente o KYC/datos inválidos, el payout no se ejecuta.

## 6. Flujo de KYC

```
Vendedor → POST /kyc/session → Didit crea sesión
        → usuario completa ID + selfie/liveness
        → Didit webhook → API actualiza kyc_verifications
        → approved / rejected / manual_review
        → si approved, se habilita publicar y cobrar
```

- El backend guarda solo estado, `provider_session_id` y metadatos mínimos.
- No se almacenan imágenes de DNI ni selfies.
- La UI nunca menciona Didit.

## 7. Flujo de fotos

1. El web sube fotos a `POST /listings/:id/photos` (multipart).
2. Multer valida tipo y tamaño.
3. `sharp` corrige orientación, elimina EXIF, redimensiona y genera variantes.
4. Se suben a R2 con clave `listings/{listing_id}/{photo_id}.webp`.
5. Se guarda la URL pública/CDN y el orden en `listing_photos`.
6. Al eliminar una publicación se hace soft delete y se limpian assets por job.

En desarrollo, las fotos de publicaciones se guardan en `apps/api/uploads/listings/<listingId>/` y se sirven desde `/uploads`. En producción se migrarán a R2/Cloudinary; el disco de Render es efímero.

**Avatares:** en desarrollo se procesan con `sharp` (512×512, WebP) y se guardan en `apps/api/uploads/avatars`, servidos desde `/uploads`. En producción se migrará a R2 o Cloudinary; el disco de Render es efímero y no debe usarse para almacenamiento permanente.

## 8. Tiempo real y notificaciones

- **Chat:** polling cada 3–5 s con `GET /conversations/:id/messages?after=...`. Sin WebSocket ni SSE en el MVP.
- **Notificaciones in-app:** polling cada 30 s o al recuperar foco.
- **Push:** `web-push` + VAPID + service worker. Se pide permiso solo con gesto explícito. Se podan suscripciones con 404/410.
- **Email:** Resend para eventos críticos y verificación/reset.
- Se persiste la notificación antes de enviar push.
- Si el usuario estaba desconectado, recupera por API.

## 9. Jobs programados

En Render Cron Jobs o un scheduler equivalente:

| Job                   | Frecuencia  | Acción                                                          |
| --------------------- | ----------- | --------------------------------------------------------------- |
| `expire-offers`       | cada 5 min  | Marca ofertas vencidas.                                         |
| `expire-payments`     | cada 15 min | Cancela órdenes `pending_payment` vencidas.                     |
| `complete-orders`     | cada 5 min  | Pasa a `completed` órdenes `delivered` con 48 h sin disputa.    |
| `send-reminders`      | cada hora   | Recordatorios de 48 h, ofertas por vencer y payouts pendientes. |
| `kyc-reconcile`       | cada 15 min | Consulta KYC pendientes.                                        |
| `payment-reconcile`   | diario      | Concilia pagos Talo vs órdenes.                                 |
| `metrics-rollup`      | diario      | Agrega métricas del día.                                        |
| `clean-orphan-photos` | semanal     | Limpia assets huérfanos de R2.                                  |

- Los jobs deben ser idempotentes y tolerar reintentos.
- No usan locks distribuidos en el MVP: una sola instancia de API/cron.

## 10. Modelo de datos (resumen)

Tablas principales:

| Tabla                       | Propósito                                                   |
| --------------------------- | ----------------------------------------------------------- |
| `users`                     | Cuenta, rol, email verificado, 18+, estado.                 |
| `auth_identities`           | Proveedor (local/Google) y `provider_id`.                   |
| `email_verification_tokens` | Token hasheado, vencimiento, uso.                           |
| `password_reset_tokens`     | Token hasheado, vencimiento, uso.                           |
| `kyc_verifications`         | Estado, proveedor, sesión, motivo.                          |
| `categories`                | Rubros y subcategorías (2 niveles).                         |
| `category_attributes`       | Atributos por subcategoría y obligatoriedad.                |
| `listings`                  | Publicación, precio, estado, condición, ubicación, entrega. |
| `listing_photos`            | Fotos, orden, URL, metadatos.                               |
| `favorites`                 | Favoritos por usuario/publicación.                          |
| `follows`                   | Seguimiento entre usuarios.                                 |
| `offers`                    | Oferta, contraoferta, estado, vencimiento.                  |
| `orders`                    | Orden, snapshot de precios, estado, modalidad.              |
| `order_events`              | Historial de transiciones.                                  |
| `delivery_codes`            | Código de 6 dígitos, hash, usado, vencimiento.              |
| `payments`                  | Pago Talo, `payment_id`, estado, montos, CVU/alias.         |
| `payment_events`            | Webhooks y respuestas crudas (redactadas).                  |
| `refunds`                   | Reembolsos Talo (full/partial), estado.                     |
| `payout_accounts`           | CBU/CVU/alias, titular, validación.                         |
| `payouts`                   | Payout manual, estado, comprobante.                         |
| `disputes`                  | Motivo, estado, resolución, SLA.                            |
| `dispute_events`            | Mensajes y cambios de estado.                               |
| `dispute_evidence`          | Fotos/archivos de evidencia.                                |
| `reviews`                   | Calificación bidireccional por orden.                       |
| `conversations`             | Conversación por publicación/comprador/vendedor.            |
| `messages`                  | Mensajes, flags de contacto, leído.                         |
| `notifications`             | Notificaciones in-app.                                      |
| `push_subscriptions`        | Suscripciones Web Push.                                     |
| `user_blocks`               | Bloqueos entre usuarios.                                    |
| `user_reports`              | Denuncias de usuarios.                                      |
| `coupons`                   | Cupones/creditos por reembolso.                             |
| `coupon_redemptions`        | Uso del cupón.                                              |
| `config`                    | Parámetros editables con whitelist.                         |
| `listing_reports`           | Denuncias de publicaciones.                                 |
| `audit_logs`                | Acciones administrativas y de finanzas.                     |
| `metrics_events`            | Eventos de negocio.                                         |
| `errors`                    | Errores 5xx/no operativos.                                  |

Reglas:

- PK UUID con `gen_random_uuid()`, excepto `errors` y `metrics_events` (`BIGSERIAL`).
- `created_at`/`updated_at` UTC (`TIMESTAMPTZ`) y `is_deleted` en entidades persistentes.
- Dinero en enteros ARS (`*_ars`), nunca `float`.
- Snapshots de Tasa e ítem en la orden para que un cambio futuro no altere compras pasadas.
- Índices únicos/parciales para evitar carreras: una oferta `pending` por comprador/publicación, un código activo por orden, un payout activo por orden, una reseña por orden/autor.

## 11. Seguridad

- Secretos solo en variables de entorno; validados con Zod al arrancar.
- `envs.X`, nunca `process.env.X` directo.
- bcrypt 12 rounds, JWT 1 día, payload `{ id, role }`.
- JWT en cookie `httpOnly` (`revia_at`), `Secure` en producción y `SameSite=None` para cross-site; cookie no sensible `revia_session=1` como hint. CORS con `credentials` y validación de `Origin` en mutaciones.
- Google OAuth 2.0 server-side.
- Verificación de email obligatoria para comprar/vender; KYC para vender.
- Rate limiting por IP, credencial y usuario.
- hCaptcha en registro (bypass en test/desarrollo sin secret).
- CORS con whitelist del dominio web.
- Helmet + CSP estricta; sin `dangerouslySetInnerHTML`.
- Filtro de contacto en chat (advierte y marca, no bloquea).
- Datos de payout cifrados a nivel aplicación (AES-256-GCM) con clave en env.
- Webhooks con token secreto en URL/header y verificación de idempotencia.
- Auditoría de acciones admin/finanzas.
- No se loguean tokens, contraseñas, emails completos ni datos de pago.
- R2 con URLs firmadas para assets privados; las fotos de publicación son públicas por CDN.

## 12. Errores y observabilidad

- `AppError`, `catchAsync`, `globalErrorHandler`, `errorMatchers`.
- 422 validación, 400 entrada inválida, 401 sin token/credenciales, 403 permisos/estado, 404 inexistente, 409 conflicto, 429 rate limit, 500 inesperado.
- Errores 5xx/no operativos se persisten en `errors` con redacción.
- Logs estructurados con request id.
- Métricas de negocio en `metrics_events`.
- Alertas mínimas: fallos de webhook, pagos sin conciliar, jobs caídos, tasa de disputas.

## 13. Entornos y deploy

| Entorno    | API              | Web              | DB                       | Storage        |
| ---------- | ---------------- | ---------------- | ------------------------ | -------------- |
| Local      | `localhost:4000` | `localhost:3000` | PostgreSQL Docker `5433` | R2 dev o local |
| Test       | Vitest           | Vitest           | `revia_test`             | mock           |
| Producción | Render           | Vercel           | Neon                     | R2             |

- `NODE_ENV=test` usa `TEST_DB_URI`.
- Migraciones se aplican en el deploy de Render o manualmente antes.
- Render free duerme tras inactividad: afecta webhooks, push y cron. Para producción se recomienda plan Starter (US$7/mes) o un keep-alive; decisión en `docs/PRODUCTION.md` (a crear).
- Vercel sirve la PWA y el service worker con headers de cache correctos.
- Dominio y DNS se definen antes del lanzamiento.

## 14. Riesgos conocidos

| Riesgo                                                                       | Mitigación                                                                       |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Talo es solo transferencia (sin tarjeta/cuotas) y asincrónico.               | Onboarding claro, CVU/alias/QR, recordatorios y expiración controlada.           |
| Retener y redistribuir fondos de terceros puede tener implicancias BCRA/PSP. | Validar figura legal con contador/abogado antes de escalar; volumen bajo en MVP. |
| Payouts manuales no escalan.                                                 | Cola de finanzas, comprobantes y conciliación diaria; automatizar en fase 2.     |
| Fraude con cuentas nuevas o suplantación.                                    | KYC, email verificado, aprobación previa, filtros y límites.                     |
| Render free duerme y corta webhooks/cron.                                    | Plan pago o keep-alive; monitoreo de latencia.                                   |
| Polling de chat genera carga.                                                | Intervalos de 3–5 s, paginación y límites; migrar a SSE/WebSocket si crece.      |
| Avatares en disco efímero.                                                   | Solo para desarrollo; producción con R2/Cloudinary y assets persistentes.        |
| Reembolsos después del payout.                                               | Congelar payout con disputa; recuperación manual y escalamiento.                 |
| Didit free limitado a 500/mes.                                               | Monitoreo de cuota; RENAPER pago o revisión manual como fallback.                |

## 15. Reutilización de Market Design y Duo LAS

Se reutilizan patrones y módulos, adaptados a TypeScript:

- **Market Design:** monorepo, Express+Sequelize, capas, Zod, errores, soft delete, R2, Resend, rate limits, admin de config, Husky/commitlint, frontend-first con mocks.
- **Duo LAS:** auth JWT+bcrypt+emails, verificación de email, reset, hCaptcha, PWA, `web-push`/VAPID, service worker, notificaciones persistidas, interceptor 401 sin loops, deploy Render+Vercel+Neon, estructura de `docs/`, seeds idempotentes.
- **No se copian** reglas de negocio ajenas (ni Riot, ni comisiones de Market Design). Solo infraestructura y convenciones.
