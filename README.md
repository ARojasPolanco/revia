# REVIA

Marketplace C2C de artículos de segunda mano entre particulares de **Bahía Blanca, Argentina**. El comprador paga una **Tasa de REVIA** (7% + $500 ARS) que cubre reembolsos, procesamiento y mantenimiento. El vendedor paga 0%.

El dinero queda en custodia de REVIA hasta que el comprador confirma la entrega (o vencen 48 horas sin reclamo) y luego se transfiere manualmente al vendedor. El MVP es local, sin logística integrada, con entrega coordinada en la plataforma, código de 6 dígitos, disputas con SLA de 72 horas y reseñas bidireccionales.

## Estado

Fases 0-7 implementadas en local: auth, KYC, publicaciones, descubrimiento, ofertas/chat, órdenes con Talo Sandbox y payouts manuales. Ver `TASK.md`.

## Stack

- **Monorepo:** npm workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **API:** Node.js 22 + TypeScript + Express 4 + Sequelize 6 + PostgreSQL 16.
- **Web:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + PWA.
- **Base de datos:** Neon.
- **Auth:** JWT 1 día en cookie `httpOnly` + bcrypt + Google OAuth.
- **Fotos:** Cloudflare R2 + sharp.
- **Pagos:** Talo (transferencia bancaria, oculto al usuario).
- **KYC:** Didit (oculto al usuario).
- **Email:** Resend.
- **Push:** `web-push` + VAPID.
- **Deploy:** API en Render, web en Vercel.
- **Tests:** Vitest + Supertest + Testing Library.
- **Contenedores:** Docker + docker-compose.

## Estructura

```
REVIA-fullstack/
├─ apps/
│  ├─ api/            # Express + Sequelize (TypeScript)
│  └─ web/            # Next.js 15 (TypeScript) + PWA
├─ packages/
│  └─ shared/         # Zod schemas, enums y constantes
├─ docker/
│  └─ initdb/
├─ docs/
│  ├─ SPEC.md
│  ├─ ARCHITECTURE.md
│  ├─ API.md
│  └─ DECISIONS.md
├─ docker-compose.yml
├─ Dockerfile.api
├─ Dockerfile.web
├─ AGENTS.md
├─ TASK.md
└─ README.md
```

## Documentación

Orden de lectura recomendado:

1. `AGENTS.md` — reglas operativas del repositorio.
2. `TASK.md` — tablero de fases y estado.
3. `docs/SPEC.md` — alcance, reglas de negocio y taxonomía.
4. `docs/ARCHITECTURE.md` — arquitectura, flujos y deploy.
5. `docs/API.md` — contratos de la API v1.
6. `docs/DECISIONS.md` — decisiones tomadas y abiertas.

## Requisitos

- Node.js 22 LTS.
- npm 10+.
- Docker Desktop.
- Cuenta de Neon (o PostgreSQL local).
- Cuentas y claves de Talo, Didit, Resend, Cloudflare R2 y Google OAuth para integraciones reales.

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar PostgreSQL local en localhost:5433
npm run docker:up

# 3. Copiar variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Correr migraciones y seed
npm run seed

# 5. API en desarrollo
npm run dev

# 6. Web en desarrollo
npm run dev:web
```

- API: `http://localhost:4000`
- Web: `http://localhost:3000`
- PostgreSQL: `localhost:5433`
- Base de test: `revia_test`

## Scripts previstos

| Comando                   | Descripción                                              |
| ------------------------- | -------------------------------------------------------- |
| `npm run docker:up`       | Levanta PostgreSQL en `localhost:5433`.                  |
| `npm run docker:down`     | Baja los contenedores.                                   |
| `npm run docker:app`      | Levanta PostgreSQL + API + web en Docker.                |
| `npm run dev`             | API en desarrollo.                                       |
| `npm run dev:web`         | Next.js en desarrollo.                                   |
| `npm run build`           | Build de API y web.                                      |
| `npm run lint`            | ESLint.                                                  |
| `npm run test`            | Tests de API.                                            |
| `npm run test:web`        | Tests de web.                                            |
| `npm run seed`            | Seed de desarrollo.                                      |
| `npm run seed:dev`        | Crea usuarios demo para probar las pantallas protegidas. |
| `npm run seed:categories` | Siembra la taxonomía de 8 rubros y sus atributos.        |
| `npm run seed:admin`      | Crea admin inicial.                                      |
| `npm run talo:smoke`      | Crea y simula un pago de $100 en Talo Sandbox.           |
| `npm run smoke:fase5-6`   | Flujo real oferta → pago sandbox → entrega → completada. |
| `npm run smoke:fase7`     | Procesa, paga y descarga un payout pendiente.            |

Los scripts definitivos se ajustan en la Fase 0.

## Tests

- `npm run test`: API con Vitest + Supertest.
- `npm run test:web`: componentes Next.js con Vitest + Testing Library.
- `npm run smoke:fase5-6`: smoke real contra Talo Sandbox (requiere `apps/api/.env` y `npm run seed:dev`).
- `npm run smoke:fase7`: procesa y paga un payout generado por el smoke anterior.

## Usuarios demo

Después de `npm run migrate`, ejecutá `npm run seed:dev`. Contraseña para todos: `revia12345`.

| Email                  | Qué permite probar                                                             |
| ---------------------- | ------------------------------------------------------------------------------ |
| `demo@revia.test`      | Cuenta verificada sin KYC: `/configuracion` y flujo de `/verificacion`.        |
| `pendiente@revia.test` | Onboarding pendiente: `/completar-perfil`.                                     |
| `vendedor@revia.test`  | KYC aprobado y perfil verificado simulado: publicar, gestionar fotos y cobrar. |
| `admin@revia.test`     | Moderación en `/admin/publicaciones`.                                          |

`seed:dev` también crea **3 publicaciones demo activas** con las imágenes de `apps/web/public` (`/1.jpeg`, `/2.jpeg`, `/3.jpg`) para probar catálogo, detalle, feed y favoritos con fotos reales.

Los avatares se guardan localmente en `apps/api/uploads/avatars` durante el desarrollo. En producción se migrarán a R2 o Cloudinary.

## Variables de entorno (referencia)

### API

```env
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
DB_URI=postgres://revia:revia@localhost:5433/revia
TEST_DB_URI=postgres://revia:revia@localhost:5433/revia_test
JWT_SECRET=
JWT_EXPIRES_IN=1d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
RESEND_API_KEY=
EMAIL_FROM=
HCAPTCHA_SECRET=
HCAPTCHA_ENABLED=false
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
TALO_USER_ID=
TALO_CLIENT_ID=
TALO_CLIENT_SECRET=
TALO_API_URL=https://sandbox-api.talo.com.ar
TALO_WEBHOOK_SECRET=
DIDIT_API_KEY=
DIDIT_WEBHOOK_SECRET=
DIDIT_API_URL=https://verification.didit.me
DIDIT_WORKFLOW_ID=
DIDIT_CALLBACK_URL=http://localhost:3000/verificacion
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
PAYOUT_ENCRYPTION_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

### Web

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
```

Nunca commitear `.env` ni claves reales.

## Reglas de negocio clave

- **Tasa:** `round(precio_articulo * 7 / 100) + 500` ARS, configurable.
- **Compra:** un artículo por orden. Sin carrito.
- **Ofertas:** -30% máximo, 24 h, pago 24 h, no vinculantes ni reservan.
- **Entrega:** retiro ($0), punto medio ($2.200) o Uber/Didi por chat.
- **Reclamo:** 48 h desde la entrega; sin reclamo, se completa y habilita payout.
- **Payout:** manual, 48–72 h hábiles, costo de REVIA.
- **Reembolso:** dinero con Tasa o cupón sin Tasa (90 días).
- **KYC:** obligatorio para publicar y cobrar.
- **Proveedores:** Talo y Didit son internos; nunca se muestran al usuario.

## Deploy

| Componente | Plataforma                                              |
| ---------- | ------------------------------------------------------- |
| API        | Render (web service + cron jobs)                        |
| Web        | Vercel                                                  |
| PostgreSQL | Neon                                                    |
| Fotos      | Cloudflare R2                                           |
| Webhooks   | `https://api.<dominio>/api/v1/webhooks/talo` y `/didit` |

Render free duerme tras inactividad y puede perder webhooks/cron; para producción se recomienda Render Starter o un keep-alive. Ver `docs/DECISIONS.md` (D-027).

## Licencia

Privado. Todos los derechos reservados.
