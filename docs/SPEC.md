# REVIA — Especificación del MVP

Este documento es la fuente de verdad del producto. Si una decisión nueva choca con lo escrito acá, primero se actualiza este archivo (y `docs/DECISIONS.md`) y después el código.

## 1. Identidad del producto

- **Nombre:** REVIA.
- **Qué es:** marketplace C2C de artículos de segunda mano entre particulares.
- **Dónde:** exclusivamente **Bahía Blanca, Buenos Aires, Argentina**.
- **Moneda:** peso argentino (`ARS`), siempre entero, sin centavos.
- **Idioma:** español rioplatense.
- **Edad mínima:** 18 años cumplidos.
- **Alcance del MVP:** transacciones entre particulares dentro de Bahía Blanca, con pago por transferencia, custodia de fondos de REVIA, entrega coordinada en la plataforma y Tasa de REVIA pagada por el comprador.

## 2. Propuesta de valor

REVIA permite comprar y vender objetos usados con una capa de confianza: publicación moderada, identidad verificada del vendedor, pago protegido hasta confirmar la entrega, reclamo dentro de las 48 horas y soporte humano. La **Tasa de REVIA** financia esa cobertura y el mantenimiento de la plataforma.

## 3. Usuarios y roles

| Rol           | Descripción                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| **Comprador** | Usuario registrado, mayor de 18, email verificado. Compra, ofrece, chatea, reclama y reseña.                    |
| **Vendedor**  | Usuario registrado, mayor de 18, email verificado y **KYC aprobado**. Publica, recibe ofertas, entrega y cobra. |
| **Moderador** | Revisa publicaciones y denuncias. No toca pagos.                                                                |
| **Soporte**   | Gestiona órdenes, disputas, devoluciones y mensajes.                                                            |
| **Finanzas**  | Gestiona payouts, reembolsos y conciliación.                                                                    |
| **Admin**     | Acceso total, configuración y métricas.                                                                         |

Todo usuario puede ser comprador y vendedor. Para **publicar** o **vender** se exige KYC aprobado. Para **comprar** alcanza con email verificado.

## 4. Modelo de negocio

### 4.1 Tasa de REVIA

- La paga **únicamente el comprador**.
- Se calcula sobre el **precio del artículo**, no sobre la tarifa logística.
- Fórmula: `tasa = round(precio_articulo * 7 / 100) + 500` ARS.
- El vendedor paga **0%**.
- La tasa cubre: comisión de procesamiento de Talo (0,8%–1%), reembolsos, soporte y mantenimiento.
- Es **configurable** desde la tabla `config` con whitelist de claves; nunca hardcodeada en el frontend.
- Valores iniciales:

| Clave            | Valor inicial |
| ---------------- | ------------- |
| `tasa_percent`   | `7`           |
| `tasa_fixed_ars` | `500`         |
| `currency`       | `ARS`         |

### 4.2 Desglose de una compra

```
precio_articulo      → vendedor
tarifa_punto_medio   → vendedor (si aplica)
tasa_revia           → REVIA
------------------------------------
total_comprador = precio_articulo + tarifa_punto_medio + tasa_revia
payout_vendedor = precio_articulo + tarifa_punto_medio
ingreso_revia   = tasa_revia - costo_talo - costo_transferencia
```

La tarifa de punto medio y el precio del artículo son del vendedor. La Tasa es de REVIA.

### 4.3 Otras fuentes de ingreso

No hay en el MVP. Quedan fuera suscripciones, destacados pagos y publicidad.

## 5. Publicaciones

### 5.1 Reglas

- Solo particulares. No se permiten cuentas de negocio ni tiendas.
- El vendedor debe tener **KYC aprobado** y email verificado.
- Toda publicación pasa por **aprobación previa** de un moderador.
- Estado inicial: `pending`. Si se aprueba: `active`. Si se rechaza: `rejected` con motivo obligatorio y opción de corregir y reenviar.
- El vendedor puede pausar, reanudar y eliminar (soft delete) sus publicaciones.
- Una publicación pausada o vendida no aparece en el catálogo.

### 5.2 Campos obligatorios

| Campo            | Regla                             |
| ---------------- | --------------------------------- |
| `title`          | 5–80 caracteres, sin spam.        |
| `description`    | 20–2.000 caracteres.              |
| `category_id`    | Categoría y subcategoría válidas. |
| `condition`      | Uno de los 5 niveles.             |
| `price_ars`      | Entero mayor a 0.                 |
| `photos`         | Mínimo 3, máximo 10.              |
| `location`       | Barrio o zona de Bahía Blanca.    |
| `delivery_modes` | Al menos una modalidad.           |
| `allow_offers`   | Booleano.                         |

### 5.3 Campos según categoría

- Marca, modelo, talle, color, material, año, compatibilidad, edad recomendada, idioma, época y origen se habilitan según la subcategoría.
- Los atributos obligatorios se definen en la taxonomía (sección 14).

### 5.4 Fotos

- Mínimo 3, máximo 10.
- Formatos: JPEG, PNG, WebP.
- Peso máximo: 8 MB por foto.
- La primera foto es la portada.
- El backend procesa con `sharp`: corrige orientación, quita EXIF, redimensiona a 1.600 px de ancho máximo y genera miniaturas.
- Se guardan en Cloudflare R2; las URLs públicas usan un dominio/CDN de REVIA. No se expone el bucket.

### 5.5 Condición del artículo

1. `new_with_tags`: Nuevo con etiqueta.
2. `new_without_tags`: Nuevo sin etiqueta.
3. `very_good`: Muy bueno.
4. `good`: Bueno.
5. `fair`: Satisfactorio.

### 5.6 Moderación

- Checklist objetivo: categoría correcta, fotos nítidas y reales, descripción coherente, sin datos de contacto, sin artículos prohibidos, sin réplicas, sin spam.
- Rechazo con motivo obligatorio.
- El vendedor puede editar y reenviar; vuelve a la cola completa.
- Denuncias de usuarios sobre publicaciones se revisan por separado.

## 6. Ofertas (regateo)

- El comprador puede ofertar desde la publicación o desde el chat.
- Descuento máximo: **30%** sobre el precio publicado.
- Vigencia de la oferta: **24 horas**.
- El vendedor puede aceptar, rechazar o **contraofertar** (también hasta -30%).
- Si acepta, el comprador tiene **24 horas** para pagar.
- La oferta **no es vinculante** y **no reserva** el artículo: sigue visible y disponible hasta que se pague.
- Límite anti-spam: **25 ofertas por comprador por día** (configurable).
- La oferta aplica solo al **precio del artículo**; no descuenta la Tasa ni la tarifa de punto medio.
- Una oferta aceptada y pagada se convierte en orden con `item_price` igual al monto ofertado.

Estados de oferta: `pending`, `accepted`, `rejected`, `countered`, `expired`, `cancelled`.

## 7. Compra, pago y custodia

### 7.1 Regla general

- **Un artículo por compra.** No hay carrito, combos ni bundles en el MVP.
- El comprador paga el total (artículo + tarifa logística + Tasa) por **transferencia bancaria**.
- El dinero entra a una cuenta de REVIA y queda **retenido en custodia** hasta que se cumplan las condiciones de liberación.
- REVIA nunca menciona a Talo ni a Didit al usuario. La UI dice únicamente "Pago por transferencia" y "Verificación de identidad de REVIA".

### 7.2 Flujo de pago

1. El comprador confirma la compra (precio de lista o mejor oferta aceptada).
2. Se crea una orden en estado `pending_payment` con un **snapshot** de `item_price`, `midpoint_fee`, `tasa_percent`, `tasa_fixed_ars`, `tasa_amount` y `total_amount`.
3. El backend crea un pago en Talo con `external_id = order_id`, moneda ARS y método `transfer`.
4. La UI muestra CVU, alias, QR y `payment_url` generados por Talo.
5. El comprador transfiere desde cualquier banco o billetera virtual.
6. Talo detecta la transferencia y dispara un webhook al backend.
7. El backend responde `200` rápido, consulta el pago por API y actualiza la orden de forma **idempotente**.
8. Si el pago es exacto (`SUCCESS`): la orden pasa a `paid`, se genera el **código de entrega** y se notifica a ambas partes.
9. Si hay `OVERPAID` o `UNDERPAID`: la orden queda en revisión manual de finanzas.
10. Si vence sin pago (`EXPIRED`, ~5 días): la orden pasa a `cancelled` y el artículo sigue disponible.

### 7.3 Custodia

- Los fondos permanecen en la cuenta de Talo de REVIA.
- No se transfiere nada al vendedor hasta que la orden esté `completed` y sin disputa abierta.
- REVIA es la única que instruye transferencias de salida.

### 7.4 Liberación

- Se libera cuando el comprador confirma la recepción o cuando vence la ventana de 48 horas sin reclamo.
- La liberación es una **transferencia manual** desde finanzas (MVP), dentro de las **48–72 horas hábiles**.
- El costo de la transferencia lo absorbe REVIA.

## 8. Entrega

### 8.1 Modalidades

| Modalidad                                  | Costo para el comprador                             | Quién lo recibe |
| ------------------------------------------ | --------------------------------------------------- | --------------- |
| Retiro en domicilio del vendedor           | $0                                                  | Vendedor        |
| Punto medio en el centro de Bahía Blanca   | **$2.200 fijos** (1 pasaje de transporte público)   | Vendedor        |
| Envío a domicilio coordinado con Uber/Didi | $0 para REVIA; el comprador paga el viaje por fuera | Vendedor/chofer |

- El punto medio debe ser una dirección céntrica de Bahía Blanca definida por el vendedor.
- La tarifa de punto medio es fija para todos y la cobra el vendedor; REVIA no la retiene.
- En el envío a domicilio, REVIA solo facilita el chat. No cotiza, no cobra ni garantiza el viaje.

### 8.2 Código de entrega

- Al confirmarse el pago, se genera un **código de 6 dígitos** visible para el comprador.
- En la entrega presencial, el comprador se lo da al vendedor, que lo ingresa en la app para marcar la orden como `delivered`.
- En envío por Uber/Didi, el comprador comparte el código con el vendedor cuando recibe el artículo; el vendedor lo ingresa.
- El comprador también puede confirmar antes con el botón "Recibí el artículo", lo que completa la orden directamente.
- Un código solo puede usarse una vez y vence con la orden.

### 8.3 Ventana de 48 horas

- Corre desde que la orden pasa a `delivered`.
- El comprador puede abrir un reclamo dentro de esas 48 horas.
- Si no confirma ni reclama, la orden pasa a `completed` automáticamente y habilita el payout.

## 9. Disputas y devoluciones

### 9.1 Motivos válidos

- **No recibido.**
- **No como se describió.**

No hay devolución por arrepentimiento en el MVP.

### 9.2 Proceso

1. El comprador abre la disputa dentro de las 48 horas.
2. La orden queda **suspendida** y el dinero **retenido**.
3. REVIA analiza evidencia: fotos, video, descripción, chat y código de entrega.
4. El vendedor puede responder y ofrecer un **reembolso parcial** o cubrir el envío de devolución.
5. REVIA resuelve con un **SLA de 72 horas**.
6. Si se exige devolución, el comprador la envía y el vendedor confirma la recepción en buen estado.
7. Se emite el reembolso acordado.

### 9.3 Condiciones de devolución (estilo Vinted)

- El artículo debe estar en el mismo estado descrito.
- Debe incluir todos los accesorios o etiquetas originales.
- Debe empaquetarse correctamente.
- Debe despacharse dentro de **5 días hábiles** desde que el vendedor la solicita.
- Si no se cumplen, la solicitud puede impugnarse o rechazarse.

### 9.4 Quién paga el retorno

- Por defecto, **el comprador paga el envío de devolución**.
- El vendedor puede ofrecer cubrirlo o dar un reembolso parcial para evitar la devolución.
- REVIA resuelve casos donde el artículo no coincide con lo descrito.

### 9.5 Reembolso

El comprador elige una de dos opciones:

1. **Dinero:** se devuelve el total, **incluida la Tasa de REVIA**.
2. **Cupón:** se acredita el **valor del artículo sin la Tasa** como cupón para una próxima compra. Al usarlo, se paga una **Tasa nueva**.

Reglas del cupón:

- Vale por el `item_price` pagado.
- No incluye Tasa ni tarifa logística.
- Vence a los **90 días** (configurable).
- Es de un solo uso, no transferible y no canjeable por dinero.
- Al usarlo, el cupón se aplica como crédito al `item_price`; el comprador paga Tasa y logística.
- Se reserva al crear la orden y se libera si la orden se cancela o vence.
- No se combina con ofertas aceptadas: el comprador elige oferta o cupón.

### 9.6 Reembolso técnico

- Antes del payout: se usa la API de reembolsos de Talo (`FULL` o `PARTIAL`).
- Después del payout: recuperación manual del dinero al vendedor y escalamiento de finanzas.
- No se puede crear un reembolso nuevo mientras haya otro `PENDING` sobre el mismo pago.

## 10. Payouts al vendedor

- El vendedor carga **CBU, CVU o alias** y nombre del titular.
- El titular debe coincidir con el nombre verificado por KYC. Si no coincide, revisión manual.
- REVIA transfiere dentro de **48–72 horas hábiles** desde que la orden queda `completed`.
- Costo de transferencia: **REVIA**.
- Finanzas marca el payout como pagado y adjunta comprobante/ID de operación.
- Un payout se bloquea si hay disputa abierta, reembolso pendiente o datos inválidos.
- El vendedor ve el estado en su panel: `pending`, `processing`, `paid`, `failed`.
- El payout se crea automáticamente al completar la orden. La orden pasa a `payout_pending` cuando finanzas inicia el procesamiento y a `paid_out` cuando se paga.
- La cuenta de cobro se muestra enmascarada y cada acción de finanzas queda auditada.

## 11. KYC (verificación de identidad)

- Proveedor: **Didit** (plan gratuito de 500 verificaciones KYC por mes; RENAPER opcional a US$0,20 por consulta concluyente).
- La UI dice "Verificación de identidad de REVIA". Nunca se nombra a Didit.
- Se exige al vendedor antes de publicar.
- Flujo: sesión de Didit con ID + liveness + face match + análisis de IP; o validación RENAPER con selfie.
- Estados: `not_started`, `pending`, `approved`, `rejected`, `manual_review`.
- Se guarda solo el estado, el identificador de la sesión y metadatos mínimos. **No se guardan biometrías crudas.**
- Si Didit rechaza, el usuario puede reintentar o pedir revisión manual.
- Si se agota la cuota gratuita, se activa revisión manual o se habilita RENAPER pago.

## 12. Reseñas

- Solo se puede reseñar una orden `completed`.
- **Bidireccional:** comprador califica al vendedor y vendedor califica al comprador.
- Escala 1–5 estrellas + comentario.
- Ventana: 30 días desde `completed`.
- Una reseña por orden por autor.
- Públicas en el perfil. Promedio visible.
- Sujetas a denuncia y moderación; una reseña puede ocultarse si viola las normas.

## 13. Funciones sociales y de descubrimiento

- **Favoritos/likes:** guardar publicaciones.
- **Seguir vendedores.**
- **Feed de inicio:** recomendados + novedades de vendedores seguidos.
- **Búsqueda:** texto libre (PostgreSQL full-text / `pg_trgm`), filtros por categoría, precio, estado, modalidad de entrega y orden por recientes/menor precio/mayor precio.
- **Perfil público:** foto circular, nombre, bio, ubicación, reputación, publicaciones y seguidores.
- **Perfil verificado:** check visible cuando el vendedor completa su primera venta.
- **Historial del usuario:** compras y ventas con estado, timeline de la orden, comprobantes de payout y acceso a la disputa.
- **Perfil privado:** datos de cuenta, KYC, dirección de payout y notificaciones.

## 14. Chat y notificaciones

### 14.1 Chat

- Conversación por publicación entre comprador y vendedor.
- Polling cada **3–5 segundos** en el MVP. Sin WebSocket.
- Mensajes de texto. Se permite adjuntar imágenes solo para coordinar entrega o evidencia (máximo 5 MB).
- Filtro de datos de contacto: detecta teléfonos, emails, redes sociales, CVU y alias. **No bloquea**: muestra una advertencia, marca el mensaje y lo registra para revisión. Cerrar la venta fuera de REVIA elimina la protección.
- Bloquear y denunciar usuarios.
- No se comparten datos de contacto automáticamente.

### 14.2 Notificaciones

Canales: in-app, push (Web Push) y email transaccional (Resend).

Eventos mínimos:

- Publicación aprobada o rechazada.
- Nuevo mensaje.
- Oferta recibida, aceptada, rechazada o contraoferta.
- Oferta por vencer.
- Pago confirmado o pago vencido.
- Código de entrega emitido.
- Orden entregada.
- Recordatorio de 48 horas.
- Orden completada.
- Payout enviado.
- Disputa abierta, actualizada o resuelta.
- Reseña recibida.
- KYC aprobado o rechazado.

## 15. Taxonomía

### 15.1 Rubros y subcategorías

1. **Ropa, calzado y accesorios**
   - Mujer, Hombre, Niños, Unisex, Calzado, Accesorios.
   - Atributos: talle, marca, color, material, género.
2. **Electrodomésticos y electrónica**
   - Celulares y tablets, Computación, Audio y video, TV, Línea blanca, Pequeños electrodomésticos.
   - Atributos: marca, modelo, garantía, accesorios incluidos.
3. **Muebles y decoración**
   - Muebles, Iluminación, Decoración, Textiles.
   - Atributos: material, medidas, color.
4. **Herramientas y artículos de trabajo**
   - Manuales, Eléctricas, Jardín, Seguridad e indumentaria.
   - Atributos: marca, potencia/tipo, accesorios.
5. **Repuestos y accesorios para autos y motos**
   - Autos, Motos, Accesorios y repuestos.
   - Atributos: marca, modelo, año, compatibilidad, número de parte.
6. **Bicicletas y artículos deportivos**
   - Bicicletas, Fitness, Camping, Fútbol, Otros deportes.
   - Atributos: tipo, talle, marca.
7. **Juguetes, libros y artículos infantiles**
   - Juguetes, Libros y revistas, Artículos infantiles, Cochecitos y sillas.
   - Atributos: edad recomendada, marca, idioma.
8. **Coleccionables y antigüedades**
   - Coleccionables, Antigüedades, Arte y decoración vintage.
   - Atributos: época, origen, autenticidad declarada.

### 15.2 Reglas de taxonomía

- Cada subcategoría define qué atributos son obligatorios, opcionales u ocultos.
- Los atributos se almacenan en `JSONB` (`attributes`) en la publicación, validados con Zod.
- La taxonomía se administra desde configuración/admin y no se hardcodea en el frontend.
- Se permiten máximo 2 niveles (rubro → subcategoría) en el MVP.

## 16. Artículos prohibidos

No se permite publicar:

- Armas, municiones, explosivos y artículos regulados.
- Drogas, medicamentos, suplementos médicos y material de laboratorio.
- Alimentos, bebidas y productos perecederos.
- Animales vivos, partes de animales protegidos o productos derivados.
- Restos humanos, fluidos o material biológico.
- Réplicas, falsificaciones y productos que violen propiedad intelectual.
- Artículos robados o de procedencia ilegal.
- Materiales peligrosos, inflamables, tóxicos o radiactivos.
- Contenido para adultos, juguetes sexuales y servicios.
- Documentos de identidad, datos personales, cuentas y credenciales.
- Entradas, invitaciones y servicios.
- Criptomonedas, dinero, tarjetas y valores.
- Tabaco, vapeadores y alcohol.
- Dispositivos médicos que requieran receta.
- Especies protegidas y productos de marfil.
- Cualquier artículo cuya venta esté prohibida por ley argentina.

## 17. Estados

### 17.1 Publicación

`draft` → `pending` → `active` → `paused` / `sold` / `deleted`
`pending` → `rejected` → `pending` (reenvío)

### 17.2 Orden

```
pending_payment
   ├─ payment_review (OVERPAID/UNDERPAID o publicación no disponible)
   ├─ paid → handover_pending → delivered → completed → payout_pending → paid_out
   ├─ disputed (desde delivered o handover_pending)
   ├─ refunded
   ├─ cancelled
   └─ expired
```

Reglas:

- `completed` solo cuando pasan 48 horas desde `delivered` sin disputa, o cuando el comprador confirma.
- `payment_review` retiene la orden si el pago no coincide o la publicación ya no está disponible; finanzas lo resuelve manualmente.
- `payout_pending` se habilita con `completed`.
- `paid_out` lo marca finanzas.
- `disputed` congela el payout y habilita la resolución.
- `refunded` y `cancelled` son terminales para el flujo de payout.

### 17.3 Disputa

`open` → `under_review` → `resolved_refund` / `resolved_coupon` / `resolved_rejected` / `cancelled`

### 17.4 Payout

`pending` → `processing` → `paid` / `failed`

### 17.5 KYC

`not_started` → `pending` → `approved` / `rejected` / `manual_review`

## 18. Configuración (valores iniciales)

| Clave                        | Valor | Editable   |
| ---------------------------- | ----- | ---------- |
| `tasa_percent`               | 7     | sí         |
| `tasa_fixed_ars`             | 500   | sí         |
| `midpoint_fee_ars`           | 2200  | sí         |
| `offer_max_discount_percent` | 30    | sí         |
| `offer_ttl_hours`            | 24    | sí         |
| `offer_payment_ttl_hours`    | 24    | sí         |
| `offers_per_buyer_per_day`   | 25    | sí         |
| `claim_window_hours`         | 48    | sí         |
| `dispute_sla_hours`          | 72    | sí         |
| `payout_sla_business_hours`  | 72    | sí         |
| `return_ship_business_days`  | 5     | sí         |
| `coupon_expiry_days`         | 90    | sí         |
| `min_photos`                 | 3     | sí         |
| `max_photos`                 | 10    | sí         |
| `max_photo_mb`               | 8     | sí         |
| `review_window_days`         | 30    | sí         |
| `age_min`                    | 18    | no (legal) |
| `listing_requires_kyc`       | true  | no (MVP)   |
| `listing_requires_approval`  | true  | no (MVP)   |
| `items_per_order`            | 1     | no (MVP)   |

## 19. Fuera de alcance del MVP

- Envío/logística integrada con correo o courier.
- Pago con tarjeta de crédito, débito o cuotas.
- Aplicación móvil nativa (solo PWA).
- Combos, bundles o carrito con varios artículos.
- Vendedores profesionales, tiendas o cuentas de empresa.
- Autenticación/peritaje de artículos de lujo, sneakers o coleccionables.
- Suscripciones, planes premium o publicaciones destacadas pagas.
- Multi-ciudad o expansión fuera de Bahía Blanca.
- Chat en tiempo real con WebSocket (solo polling).
- Devolución por arrepentimiento.
- Facturación automática al vendedor.

## 20. Métricas y metas

Metas de los primeros 3 meses:

- **50 vendedores** con KYC aprobado.
- **300 publicaciones** activas.
- **100 ventas** completadas.

KPIs a instrumentar:

- GMV mensual.
- Take rate real (Tasa cobrada / GMV).
- Órdenes creadas, pagadas, completadas y canceladas.
- Tasa de disputas sobre órdenes completadas (objetivo < 5%).
- Tiempo hasta la primera venta por vendedor.
- Tasa de aprobación de publicaciones.
- Usuarios activos (DAU/MAU).
- Recompra.
- Tiempo medio de payout.

## 21. Legal y fiscal (MVP)

- **Figura:** monotributo.
- **Facturación:** factura C por la Tasa de REVIA.
- **Impuestos:** validar con contador antes de producción; IVA y percepciones según corresponda.
- **Documentos:** términos y condiciones, política de privacidad y "Cómo funciona".
- **Datos personales:** Ley 25.326. Minimización, consentimiento, derecho de acceso y baja.
- **Consumidor:** Ley 24.240. Información clara de precios, Tasa, plazos y derecho de reclamo.
- **Jurisdicción:** Argentina.
- **Retención:** datos de órdenes y pagos según obligaciones fiscales/contables; biometría solo en el proveedor.
- **No se promete** una garantía legal distinta a la política de disputas del MVP.

## 22. Criterios de aceptación del MVP

El MVP se considera listo cuando:

1. Un usuario se registra, verifica email, acepta 18+ y puede comprar.
2. Un vendedor completa KYC, publica con 3 fotos y un moderador aprueba.
3. Un comprador paga por transferencia vía Talo y la orden pasa a `paid` por webhook.
4. Se genera y valida el código de entrega; a las 48 horas la orden se completa.
5. Finanzas registra el payout manual y el vendedor lo ve como `paid`.
6. Un comprador abre una disputa, REVIA la resuelve y se emite reembolso o cupón.
7. Push, in-app y email funcionan para los eventos críticos.
8. El panel admin permite aprobar publicaciones, gestionar órdenes, payouts, disputas y métricas.
9. No se expone Talo ni Didit en la UI.
10. `lint`, `test` y build pasan; migraciones suben y bajan.
