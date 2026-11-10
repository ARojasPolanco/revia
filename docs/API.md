# REVIA — API v1

## 1. Convenciones

- Base URL local: `http://localhost:4000/api/v1`.
- Producción: `https://api.revia.com.ar/api/v1` (a confirmar dominio).
- Formato: JSON UTF-8.
- Autenticación: cookie `httpOnly` `revia_at` (en producción cross-site: `SameSite=None; Secure`). Bearer opcional solo para tests/herramientas.
- CORS con credenciales y verificación de `Origin` en mutaciones.
- IDs: UUID v4.
- Fechas: ISO 8601 UTC.
- Dinero: enteros en ARS (`*_ars`), sin decimales.
- Paginación: `?page=1&limit=20` (máximo 50).
- Éxito: `{ "status": "success", ... }`.
- Error: `{ "status": "fail" | "error", "message": "..." }`.
- Códigos: 200/201, 400, 401, 403, 404, 409, 422, 429, 500.
- Idempotencia: `Idempotency-Key` en `POST /orders` y `POST /orders/:id/payment` (opcional en MVP, recomendado).

Roles: `user`, `moderator`, `support`, `finance`, `admin`. Se indica el mínimo requerido.

## 2. Autenticación

| Método | Ruta                        | Auth    | Descripción                                                                        |
| ------ | --------------------------- | ------- | ---------------------------------------------------------------------------------- |
| POST   | `/auth/register`            | público | Email, password, nombre, fecha de nacimiento, aceptación 18+ y términos, hCaptcha. |
| POST   | `/auth/login`               | público | Email + password. Setea cookie `httpOnly` y devuelve usuario.                      |
| GET    | `/auth/google`              | público | Inicia OAuth 2.0 con Google.                                                       |
| GET    | `/auth/google/callback`     | público | Callback de Google; crea/vincula cuenta y redirige a la web.                       |
| POST   | `/auth/verify-email`        | público | Token de verificación (24 h, un uso).                                              |
| POST   | `/auth/resend-verification` | usuario | Reenvía email de verificación.                                                     |
| POST   | `/auth/forgot-password`     | público | Respuesta genérica; token de 1 h.                                                  |
| POST   | `/auth/reset-password`      | público | Token + nueva password.                                                            |
| POST   | `/auth/complete-onboarding` | usuario | Fecha de nacimiento + términos para cuentas creadas con Google.                    |
| GET    | `/auth/me`                  | usuario | Usuario autenticado con rol, KYC y estado de onboarding.                           |
| PATCH  | `/auth/me`                  | usuario | Nombre, bio, ubicación, foto de perfil.                                            |
| POST   | `/auth/logout`              | público | Limpia las cookies de sesión.                                                      |

Reglas:

- Password 10–128 caracteres.
- Email verificado obligatorio para comprar, vender, ofertar y chatear.
- 18+ obligatorio.
- Rate limit estricto en register/login/forgot.
- Las cuentas nuevas con Google quedan con `onboardingCompleted=false` hasta completar fecha de nacimiento y términos.
- El usuario de `/auth/me` incluye `avatarUrl` y `sellerVerified` (check de perfil verificado tras la primera venta).
- En desarrollo/test, `register`, `resend-verification` y `forgot-password` devuelven `devVerificationToken`/`devResetToken` y los links se loguean si no hay `RESEND_API_KEY`.

## 3. Usuarios y social

| Método | Ruta                      | Auth    | Descripción                                                        |
| ------ | ------------------------- | ------- | ------------------------------------------------------------------ |
| GET    | `/users/:id`              | público | Perfil público con `stats` (seguidores, siguiendo, publicaciones). |
| GET    | `/users/:id/listings`     | público | Publicaciones activas del vendedor.                                |
| GET    | `/users/:id/reviews`      | público | Reseñas recibidas + promedio.                                      |
| GET    | `/users/:id/relationship` | usuario | Devuelve `{ isFollowing }` para el usuario autenticado.            |
| POST   | `/me/avatar`              | usuario | Multipart `avatar` (JPG/PNG/WebP ≤5 MB); recorte 512x512 y WebP.   |
| POST   | `/users/:id/follow`       | usuario | Seguir. Idempotente.                                               |
| DELETE | `/users/:id/follow`       | usuario | Dejar de seguir.                                                   |
| GET    | `/me/following`           | usuario | A quién sigo.                                                      |
| GET    | `/me/followers`           | usuario | Quiénes me siguen.                                                 |
| POST   | `/users/:id/block`        | usuario | Bloquear usuario; impide mensajes entre ambos.                     |
| DELETE | `/users/:id/block`        | usuario | Desbloquear.                                                       |
| POST   | `/users/:id/report`       | usuario | Denunciar usuario (`reason` 5–500).                                |

## 4. KYC

| Método | Ruta              | Auth               | Descripción                                                                                   |
| ------ | ----------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| POST   | `/kyc/session`    | usuario verificado | Crea sesión. Devuelve `mode: redirect` + URL, o `mode: mock` en desarrollo sin proveedor.     |
| GET    | `/kyc/status`     | usuario            | Estado propio: `not_started`, `pending`, `approved`, `rejected`, `manual_review`, `expired`.  |
| POST   | `/kyc/dev/verify` | usuario (solo dev) | Simula `approved`, `rejected` o `manual_review` para pruebas manuales.                        |
| POST   | `/webhooks/didit` | público firmado    | Webhook con HMAC-SHA256 (`X-Signature-V2`, ventana de 5 minutos, idempotente por `event_id`). |

Reglas:

- KYC es obligatorio para publicar y cobrar.
- La respuesta pública nunca menciona al proveedor; la UI dice "Verificación de REVIA".
- Sin `DIDIT_WORKFLOW_ID` en desarrollo, `POST /kyc/session` entra en modo mock y se puede aprobar con `/kyc/dev/verify`.
- Los estados del proveedor se mapean a `approved`, `rejected`, `manual_review`, `pending` o `expired`.

## 5. Categorías y configuración

| Método | Ruta             | Auth    | Descripción                                                 |
| ------ | ---------------- | ------- | ----------------------------------------------------------- |
| GET    | `/categories`    | público | Árbol de rubros/subcategorías con atributos.                |
| GET    | `/config/public` | público | Tasa, tarifa punto medio, límites de oferta, fotos y cupón. |
| GET    | `/config`        | admin   | Toda la configuración.                                      |
| PUT    | `/config`        | admin   | Whitelist de claves; el resto 422.                          |

## 6. Publicaciones

| Método | Ruta                            | Auth         | Descripción                                                                                                      |
| ------ | ------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| GET    | `/listings`                     | público      | Catálogo activo con `q`, `categoryId`, `condition`, `minPrice`, `maxPrice`, `delivery`, `sort`, `page`, `limit`. |
| GET    | `/listings/:id`                 | público      | Detalle activo/vendido; incluye vendedor, categoría y fotos.                                                     |
| GET    | `/me/listings`                  | usuario      | Todas mis publicaciones con estado y motivo de rechazo.                                                          |
| GET    | `/me/listings/:id`              | usuario      | Detalle de una publicación propia en cualquier estado.                                                           |
| POST   | `/listings`                     | vendedor KYC | Crea la publicación en `draft`.                                                                                  |
| PATCH  | `/listings/:id`                 | dueño        | Edita en `draft`, `rejected` o `paused`.                                                                         |
| POST   | `/listings/:id/photos`          | dueño        | Multipart `photos` (1–10 por request; máximo 10 en total; JPG/PNG/WebP ≤8 MB).                                   |
| DELETE | `/listings/:id/photos/:photoId` | dueño        | Elimina una foto (soft delete).                                                                                  |
| POST   | `/listings/:id/submit`          | dueño        | Valida atributos y mínimo 3 fotos; pasa a `pending`.                                                             |
| POST   | `/listings/:id/pause`           | dueño        | Pausa una publicación activa.                                                                                    |
| POST   | `/listings/:id/resume`          | dueño        | Reanuda una publicación pausada.                                                                                 |
| DELETE | `/listings/:id`                 | dueño        | Soft delete.                                                                                                     |
| POST   | `/listings/:id/report`          | usuario      | Denuncia publicación (`reason` 5–500).                                                                           |
| GET    | `/listings/:id/favorite`        | usuario      | Devuelve `{ favorite }` para el usuario autenticado.                                                             |
| POST   | `/listings/:id/favorite`        | usuario      | Agrega a favoritos. Idempotente.                                                                                 |
| DELETE | `/listings/:id/favorite`        | usuario      | Quita de favoritos.                                                                                              |
| GET    | `/me/favorites`                 | usuario      | Mis publicaciones favoritas activas/vendidas.                                                                    |
| GET    | `/feed`                         | público      | Recomendados (activos recientes).                                                                                |
| GET    | `/me/feed`                      | usuario      | Novedades de vendedores seguidos.                                                                                |

Estados: `draft`, `pending`, `active`, `rejected`, `paused`, `sold`, `deleted`.

Flujo: `POST /listings` crea el borrador → `POST /listings/:id/photos` agrega imágenes → `POST /listings/:id/submit` envía a moderación → aprobación/rechazo desde admin. Las fotos se procesan con `sharp` (1600 px + thumbnail 400 px) y en desarrollo se sirven desde `/uploads`; producción usará R2/Cloudinary.

## 7. Ofertas

| Método | Ruta                   | Auth         | Descripción                                     |
| ------ | ---------------------- | ------------ | ----------------------------------------------- |
| POST   | `/listings/:id/offers` | usuario      | Crea oferta; valida -30%.                       |
| GET    | `/me/offers`           | usuario      | Ofertas enviadas y recibidas.                   |
| POST   | `/offers/:id/accept`   | destinatario | Acepta; habilita pago por 24 h.                 |
| POST   | `/offers/:id/reject`   | destinatario | Rechaza.                                        |
| POST   | `/offers/:id/counter`  | destinatario | Contraoferta (crea una nueva oferta pendiente). |
| DELETE | `/offers/:id`          | creador      | Cancela su oferta pendiente.                    |

Estados: `pending`, `accepted`, `rejected`, `countered`, `expired`, `cancelled`.

Reglas:

- Descuento máximo 30% sobre `price_ars`; mínimo 70% del precio publicado.
- Vigencia 24 h; pago 24 h tras aceptación (`paymentExpiresAt`).
- No reserva el artículo.
- Límite 25/día por comprador.
- No aplica a Tasa ni tarifa logística.
- Cada oferta/contraoferta notifica al destinatario en el centro in-app.
- La oferta aceptada queda lista para el checkout de la Fase 6.

## 8. Órdenes

| Método | Ruta                        | Auth               | Descripción                                         |
| ------ | --------------------------- | ------------------ | --------------------------------------------------- |
| POST   | `/orders`                   | usuario            | Crea orden desde publicación u oferta aceptada.     |
| GET    | `/orders/:id`               | comprador/vendedor | Detalle con desglose y estado.                      |
| GET    | `/orders`                   | usuario            | `?role=buyer                                        | seller&status=`. |
| POST   | `/orders/:id/payment`       | comprador          | Crea/reutiliza pago Talo. Devuelve CVU/alias/QR.    |
| GET    | `/orders/:id/payment`       | comprador          | Estado del pago.                                    |
| POST   | `/orders/:id/delivery-code` | vendedor           | Valida código de 6 dígitos y marca `delivered`.     |
| POST   | `/orders/:id/confirm`       | comprador          | Confirma recepción y marca `delivered`/`completed`. |
| POST   | `/orders/:id/cancel`        | comprador          | Cancela si no pagó.                                 |
| GET    | `/orders/:id/events`        | comprador/vendedor | Historial.                                          |

Body de creación:

```json
{
  "listing_id": "uuid",
  "offer_id": "uuid | null",
  "delivery_mode": "pickup_home | midpoint | home_delivery",
  "coupon_id": "uuid | null"
}
```

Respuesta con desglose:

```json
{
  "status": "success",
  "order": {
    "order_id": "uuid",
    "status": "pending_payment",
    "item_price_ars": 20000,
    "midpoint_fee_ars": 0,
    "tasa_percent": 7,
    "tasa_fixed_ars": 500,
    "tasa_amount_ars": 1900,
    "total_amount_ars": 21900,
    "seller_payout_ars": 20000,
    "delivery_mode": "pickup_home"
  }
}
```

Estados: `pending_payment`, `paid`, `handover_pending`, `delivered`, `completed`, `payout_pending`, `paid_out`, `disputed`, `refunded`, `cancelled`, `expired`.

## 9. Payouts

| Método | Ruta                             | Auth         | Descripción                                             |
| ------ | -------------------------------- | ------------ | ------------------------------------------------------- |
| GET    | `/me/payout-account`             | usuario      | Datos enmascarados (últimos 4 o alias parcial).         |
| PUT    | `/me/payout-account`             | vendedor KYC | CBU/CVU (22 dígitos) o alias + titular; se cifra en DB. |
| GET    | `/me/payouts`                    | vendedor     | Historial y estado.                                     |
| GET    | `/admin/payouts`                 | finance      | Cola de payouts.                                        |
| POST   | `/admin/payouts/:id/mark-paid`   | finance      | Marca pagado + comprobante.                             |
| POST   | `/admin/payouts/:id/mark-failed` | finance      | Marca fallido + motivo.                                 |

Estados: `pending`, `processing`, `paid`, `failed`.

## 10. Disputas

| Método | Ruta                          | Auth           | Descripción                                         |
| ------ | ----------------------------- | -------------- | --------------------------------------------------- |
| POST   | `/orders/:id/dispute`         | comprador      | Abre disputa (`not_received` o `not_as_described`). |
| GET    | `/disputes/:id`               | partes/soporte | Detalle y timeline.                                 |
| POST   | `/disputes/:id/messages`      | partes/soporte | Mensajes.                                           |
| POST   | `/disputes/:id/evidence`      | partes         | Fotos/videos.                                       |
| POST   | `/disputes/:id/offer`         | vendedor       | Reembolso parcial o cubrir retorno.                 |
| POST   | `/admin/disputes/:id/resolve` | support/admin  | `refund_money`, `refund_coupon`, `reject`.          |

Estados: `open`, `under_review`, `resolved_refund`, `resolved_coupon`, `resolved_rejected`, `cancelled`.

Reglas:

- Solo dentro de 48 h desde `delivered`.
- Congela el payout.
- SLA de resolución: 72 h.
- Reembolso de dinero incluye Tasa; cupón no.

## 11. Reseñas

| Método | Ruta                  | Auth    | Descripción                          |
| ------ | --------------------- | ------- | ------------------------------------ |
| POST   | `/orders/:id/reviews` | partes  | 1–5 + comentario, dentro de 30 días. |
| GET    | `/users/:id/reviews`  | público | Reseñas y promedio.                  |
| POST   | `/reviews/:id/report` | usuario | Denunciar.                           |

## 12. Conversaciones y mensajes

| Método | Ruta                                 | Auth         | Descripción                                  |
| ------ | ------------------------------------ | ------------ | -------------------------------------------- |
| GET    | `/conversations`                     | usuario      | Bandeja con último mensaje y no leídos.      |
| POST   | `/conversations`                     | usuario      | Crea/reutiliza conversación por publicación. |
| GET    | `/conversations/:id`                 | participante | Detalle de la conversación.                  |
| GET    | `/conversations/:id/messages?after=` | participante | Polling de mensajes (cada 3–5 s).            |
| POST   | `/conversations/:id/messages`        | participante | Enviar mensaje; filtro de contacto.          |
| POST   | `/conversations/:id/read`            | participante | Marca leído.                                 |

Mensaje:

```json
{
  "body": "texto"
}
```

La respuesta incluye `message.flaggedContact`, `message.flaggedReasons` y `warning` cuando se detectan teléfonos, emails, redes o datos de pago. **No se bloquea el envío**: se advierte y se marca para revisión.

## 13. Notificaciones y push

| Método | Ruta                      | Auth    | Descripción                           |
| ------ | ------------------------- | ------- | ------------------------------------- |
| GET    | `/notifications`          | usuario | Listado paginado + `unreadCount`.     |
| POST   | `/notifications/:id/read` | usuario | Marca una.                            |
| POST   | `/notifications/read-all` | usuario | Marca todas.                          |
| POST   | `/push/subscribe`         | usuario | Guarda suscripción Web Push (Fase 9). |
| POST   | `/push/unsubscribe`       | usuario | Elimina suscripción (Fase 9).         |
| GET    | `/push/public-key`        | público | Clave VAPID pública (Fase 9).         |

## 14. Admin

| Método | Ruta                             | Rol       | Descripción                            |
| ------ | -------------------------------- | --------- | -------------------------------------- |
| GET    | `/admin/metrics`                 | admin     | KPIs y series.                         |
| GET    | `/admin/listings?status=pending` | moderator | Cola de moderación (cualquier estado). |
| POST   | `/admin/listings/:id/approve`    | moderator | Aprueba (`pending` → `active`).        |
| POST   | `/admin/listings/:id/reject`     | moderator | Rechaza con motivo (`reason` 5–500).   |
| GET    | `/admin/reports?status=open`     | moderator | Denuncias de publicaciones.            |
| POST   | `/admin/reports/:id/resolve`     | moderator | `resolved` o `dismissed`.              |
| GET    | `/admin/users`                   | admin     | Búsqueda y filtros.                    |
| PATCH  | `/admin/users/:id`               | admin     | Suspender/reactivar, rol.              |
| GET    | `/admin/orders`                  | support   | Órdenes con filtros.                   |
| POST   | `/admin/orders/:id/refund`       | finance   | Reembolso total/parcial.               |
| GET    | `/admin/payouts`                 | finance   | Cola.                                  |
| POST   | `/admin/payouts/:id/mark-paid`   | finance   | Transferencia realizada.               |
| GET    | `/admin/disputes`                | support   | Bandeja.                               |
| POST   | `/admin/disputes/:id/resolve`    | support   | Resolución.                            |
| GET    | `/admin/reports`                 | moderator | Denuncias.                             |
| POST   | `/admin/reports/:id/resolve`     | moderator | Resolución.                            |
| POST   | `/admin/notifications/broadcast` | admin     | Aviso masivo.                          |
| GET    | `/admin/audit-logs`              | admin     | Auditoría.                             |

## 15. Webhooks

### 15.1 Talo

`POST /webhooks/talo`

- Público, protegido por token secreto en URL o header.
- Payload mínimo: `{ paymentId, externalId }`.
- Responder `200` rápido y luego consultar `GET /payments/{paymentId}`.
- Idempotente por `paymentId`/`externalId`; se registra en `payment_events`.
- Estados: `PENDING`, `SUCCESS`, `OVERPAID`, `UNDERPAID`, `EXPIRED`.

### 15.2 Didit

`POST /webhooks/didit`

- Verifica firma/secret configurado.
- Actualiza `kyc_verifications` y notifica al usuario.
- Idempotente por `provider_session_id`.

### 15.3 Google OAuth

`GET /auth/google/callback`

- Intercambia código por perfil, vincula o crea usuario.
- No expone tokens en logs.

## 16. Reglas de negocio en respuestas

- La Tasa se calcula siempre en el backend; el frontend solo la muestra.
- El snapshot de Tasa y precios se guarda en la orden.
- `total_amount_ars = item_price_ars + midpoint_fee_ars + tasa_amount_ars`.
- `seller_payout_ars = item_price_ars + midpoint_fee_ars`.
- Nunca se exponen `talo_payment_id` internos al comprador más allá de lo necesario para pagar.
- Nunca se menciona Talo ni Didit en mensajes de error visibles.

## 17. Errores de dominio frecuentes

| Código | Caso                                                             |
| ------ | ---------------------------------------------------------------- |
| 403    | Vender sin KYC aprobado o email sin verificar.                   |
| 409    | Oferta ya resuelta, orden ya pagada, código ya usado.            |
| 422    | Oferta con descuento mayor a 30%, faltan fotos, datos inválidos. |
| 429    | Exceso de ofertas diarias o rate limit.                          |
| 409    | Reembolso mientras hay otro `PENDING`.                           |
| 409    | Payout bloqueado por disputa abierta.                            |
| 413    | El cuerpo de la solicitud supera el límite.                      |
| 503    | Base de datos o servicio externo temporalmente no disponible.    |

Los mensajes de validación se devuelven en español con el campo afectado (por ejemplo, `El campo contraseña debe tener al menos 10 caracteres`). Los mensajes al usuario no incluyen términos técnicos (JSON, rutas, tablas, stack) ni detalles de PostgreSQL, Talo o Didit.
