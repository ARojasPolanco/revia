'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDialog } from '@/components/DialogProvider';
import { ActionLink } from '@/components/PageHeader';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ZoomableImage } from '@/components/ZoomableImage';
import { ApiError, apiFetch } from '@/lib/api';
import {
  CONDITION_LABELS,
  DELIVERY_LABELS,
  formatArs,
  type Category,
  type Listing,
} from '@/lib/listings';
import type { Order, OrderQuote } from '@/lib/orders';
import type { Coupon } from '@/lib/coupons';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { prompt, confirm } = useDialog();
  const [listing, setListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerMessage, setOfferMessage] = useState<string | null>(null);
  const [chatStarting, setChatStarting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('');
  const [offerId, setOfferId] = useState<string | null>(null);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderCreating, setOrderCreating] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponId, setCouponId] = useState('');

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : '';

    if (!id) {
      return;
    }

    apiFetch<{ listing: Listing }>(`/listings/${id}`)
      .then((data) => setListing(data.listing))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'No encontramos lo que buscabas.')
      )
      .finally(() => setLoading(false));

    apiFetch<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, [params.id]);

  useEffect(() => {
    if (!user || !listing) {
      return;
    }

    apiFetch<{ favorite: boolean }>(`/listings/${listing.id}/favorite`)
      .then((data) => setIsFavorite(data.favorite))
      .catch(() => setIsFavorite(false));
  }, [user, listing]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('offerId');

    if (id) {
      setOfferId(id);
      setCheckoutOpen(true);
    }
  }, []);

  useEffect(() => {
    if (listing && !deliveryMode) {
      setDeliveryMode(listing.deliveryModes[0] ?? '');
    }
  }, [listing, deliveryMode]);

  useEffect(() => {
    if (!checkoutOpen || !user) {
      return;
    }

    apiFetch<{ coupons: Coupon[] }>('/me/coupons/active')
      .then((data) => setCoupons(data.coupons))
      .catch(() => setCoupons([]));
  }, [checkoutOpen, user]);

  useEffect(() => {
    if (!checkoutOpen || !listing || !deliveryMode) {
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    setQuote(null);

    apiFetch<{ quote: OrderQuote }>('/orders/quote', {
      method: 'POST',
      body: JSON.stringify({
        listingId: listing.id,
        offerId: offerId ?? undefined,
        couponId: offerId || !couponId ? undefined : couponId,
        deliveryMode,
      }),
    })
      .then((data) => setQuote(data.quote))
      .catch((caught) =>
        setQuoteError(caught instanceof ApiError ? caught.message : 'No pudimos calcular el total.')
      )
      .finally(() => setQuoteLoading(false));
  }, [checkoutOpen, listing, deliveryMode, offerId, couponId]);

  async function toggleFavorite() {
    if (!listing) {
      return;
    }

    if (!user) {
      setReportMessage('Iniciá sesión para guardar favoritos.');
      return;
    }

    const previous = isFavorite;
    setIsFavorite(!previous);
    setFavoriteBusy(true);
    setReportMessage(null);

    try {
      await apiFetch(`/listings/${listing.id}/favorite`, {
        method: previous ? 'DELETE' : 'POST',
      });
    } catch (caught) {
      setIsFavorite(previous);
      setReportMessage(
        caught instanceof ApiError ? caught.message : 'No se pudo actualizar favoritos.'
      );
    } finally {
      setFavoriteBusy(false);
    }
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setOfferError('Iniciá sesión para ofertar.');
      return;
    }

    if (!listing) {
      return;
    }

    const amount = Number(offerAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setOfferError('Ingresá un monto válido.');
      return;
    }

    setOfferBusy(true);
    setOfferError(null);
    setOfferMessage(null);

    try {
      await apiFetch(`/listings/${listing.id}/offers`, {
        method: 'POST',
        body: JSON.stringify({ amountArs: Math.round(amount) }),
      });
      setOfferMessage('Oferta enviada. El vendedor tiene 24 h para responder.');
      setOfferOpen(false);
      setOfferAmount('');
    } catch (caught) {
      setOfferError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la oferta');
    } finally {
      setOfferBusy(false);
    }
  }

  async function startChat() {
    if (!user) {
      setOfferError('Iniciá sesión para contactar al vendedor.');
      return;
    }

    if (!listing) {
      return;
    }

    setChatStarting(true);
    setOfferError(null);

    try {
      const data = await apiFetch<{ conversation: { id: string } }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ listingId: listing.id }),
      });
      router.push(`/chat/${data.conversation.id}`);
    } catch (caught) {
      setOfferError(caught instanceof ApiError ? caught.message : 'No se pudo iniciar el chat');
    } finally {
      setChatStarting(false);
    }
  }

  async function reportListing() {
    if (!listing) {
      return;
    }

    const reason = await prompt({
      title: 'Denunciar publicación',
      message:
        'Contanos qué problema encontraste. La denuncia se revisa por separado y no modifica la publicación automáticamente.',
      label: 'Motivo de la denuncia',
      multiline: true,
      placeholder: 'Ejemplo: el artículo parece una réplica.',
      confirmLabel: 'Enviar denuncia',
    });

    if (!reason?.trim()) {
      return;
    }

    try {
      const data = await apiFetch<{ message?: string }>(`/listings/${listing.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setReportMessage(data.message ?? 'Recibimos tu denuncia.');
    } catch (caught) {
      setReportMessage(
        caught instanceof ApiError ? caught.message : 'No se pudo enviar la denuncia.'
      );
    }
  }

  async function confirmPurchase() {
    if (!listing || !deliveryMode || !quote) {
      return;
    }

    const confirmed = await confirm({
      title: 'Confirmar compra',
      message: `Vas a comprar "${listing.title}" por ${formatArs(
        quote.totalAmountArs
      )} con ${DELIVERY_LABELS[deliveryMode] ?? deliveryMode}. El dinero queda en custodia de REVIA hasta que confirmes la recepción.`,
      confirmLabel: 'Confirmar compra',
    });

    if (!confirmed) {
      return;
    }

    setOrderCreating(true);
    setOrderError(null);

    try {
      const data = await apiFetch<{ order: Order; paymentError: string | null }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          offerId: offerId ?? undefined,
          couponId: offerId || !couponId ? undefined : couponId,
          deliveryMode,
        }),
      });

      router.push(`/compras/${data.order.id}`);
    } catch (caught) {
      setOrderError(caught instanceof ApiError ? caught.message : 'No se pudo iniciar la compra.');
    } finally {
      setOrderCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando publicación…</p>
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos lo que buscabas
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/publicaciones">
          Volver a publicaciones
        </Link>
      </main>
    );
  }

  const photos = listing.photos;
  const currentPhoto = photos[activePhoto] ?? photos[0];
  const leafCategories = categories.flatMap((category) => category.children ?? []);
  const categoryDefinition = leafCategories.find(
    (category) => category.id === listing.category?.id
  );
  const attributes = (categoryDefinition?.attributes ?? [])
    .map((attribute) => ({
      label: attribute.label,
      value: listing.attributes[attribute.key],
    }))
    .filter(
      (attribute) =>
        attribute.value !== undefined && attribute.value !== null && attribute.value !== ''
    );
  const isOwner = Boolean(user && listing.seller && user.id === listing.seller.id);
  const canInteract = Boolean(user && !isOwner && user.emailVerified && user.onboardingCompleted);
  const canBuy = Boolean(canInteract && listing.status === 'active');
  const needsAccountSetup = Boolean(
    user && !isOwner && (!user.emailVerified || !user.onboardingCompleted)
  );
  const listingPath = `/publicaciones/${listing.id}`;
  const loginHref = `/ingresar?next=${encodeURIComponent(listingPath)}`;
  const onboardingHref = `/completar-perfil?next=${encodeURIComponent(listingPath)}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-12">
      <Link className="text-sm font-semibold text-teal-700" href="/publicaciones">
        ← Volver a publicaciones
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col gap-3">
          {currentPhoto ? (
            <ZoomableImage
              src={currentPhoto.url}
              alt={listing.title}
              loading="eager"
              wrapperClassName="flex h-72 w-full items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-2 sm:h-[400px]"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-neutral-100 text-sm text-neutral-400">
              Sin foto
            </div>
          )}

          {photos.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {photos.map((photo, index) => (
                <button
                  className={`overflow-hidden rounded-lg border bg-neutral-50 ${
                    index === activePhoto ? 'border-teal-600' : 'border-neutral-200'
                  }`}
                  type="button"
                  key={photo.id}
                  onClick={() => setActivePhoto(index)}
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={`Foto ${index + 1}`}
                    className="h-16 w-full object-contain p-1"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {listing.category?.parent ? `${listing.category.parent.name} · ` : ''}
              {listing.category?.name}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
              {listing.title}
            </h1>
            <p className="mt-2 text-3xl font-black text-neutral-900">
              {formatArs(listing.priceArs)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {CONDITION_LABELS[listing.condition] ?? listing.condition} · {listing.location}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {needsAccountSetup ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-950">
                    Completá tu cuenta para comprar, ofertar o contactar.
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    {!user?.onboardingCompleted ? (
                      <ActionLink href={onboardingHref} size="sm" variant="primary">
                        Completar perfil
                      </ActionLink>
                    ) : null}
                    {!user?.emailVerified ? (
                      <ActionLink href="/configuracion" size="sm">
                        Verificar email
                      </ActionLink>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {canBuy ? (
                <button
                  className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  type="button"
                  onClick={() => setCheckoutOpen((value) => !value)}
                >
                  {checkoutOpen ? 'Cerrar checkout' : 'Comprar'}
                </button>
              ) : null}

              {checkoutOpen && canBuy ? (
                <section className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-900">
                      Checkout
                    </p>
                    {offerId ? (
                      <p className="mt-1 text-xs text-teal-900">
                        Estás comprando con una oferta aceptada.
                      </p>
                    ) : null}
                  </div>

                  <label className="text-xs font-semibold text-neutral-700" htmlFor="delivery-mode">
                    Modalidad de entrega
                  </label>
                  <select
                    id="delivery-mode"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
                    value={deliveryMode}
                    onChange={(event) => setDeliveryMode(event.target.value)}
                  >
                    {listing.deliveryModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {DELIVERY_LABELS[mode] ?? mode}
                      </option>
                    ))}
                  </select>

                  {!offerId && coupons.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-neutral-700" htmlFor="coupon">
                        Cupón (opcional)
                      </label>
                      <select
                        id="coupon"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
                        value={couponId}
                        onChange={(event) => setCouponId(event.target.value)}
                      >
                        <option value="">Sin cupón</option>
                        {coupons.map((coupon) => (
                          <option key={coupon.id} value={coupon.id}>
                            {coupon.code} · {formatArs(coupon.amountArs)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {quoteLoading ? (
                    <p className="text-xs text-neutral-500">Calculando total.</p>
                  ) : null}

                  {quoteError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                      <p>{quoteError}</p>
                      {offerId ? (
                        <button
                          className="mt-1 font-semibold underline"
                          type="button"
                          onClick={() => setOfferId(null)}
                        >
                          Comprar al precio publicado
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {quote ? (
                    <>
                      <dl className="flex flex-col gap-1 text-xs text-neutral-700">
                        <div className="flex justify-between gap-3">
                          <dt>Artículo</dt>
                          <dd>{formatArs(quote.itemPriceArs)}</dd>
                        </div>
                        {quote.midpointFeeArs > 0 ? (
                          <div className="flex justify-between gap-3">
                            <dt>Punto medio</dt>
                            <dd>{formatArs(quote.midpointFeeArs)}</dd>
                          </div>
                        ) : null}
                        <div className="flex justify-between gap-3">
                          <dt>Tasa de REVIA</dt>
                          <dd>{formatArs(quote.tasaAmountArs)}</dd>
                        </div>
                        {quote.couponAmountArs > 0 ? (
                          <div className="flex justify-between gap-3 text-teal-800">
                            <dt>Cupón</dt>
                            <dd>-{formatArs(quote.couponAmountArs)}</dd>
                          </div>
                        ) : null}
                        <div className="flex justify-between gap-3 border-t border-teal-200 pt-1 text-sm font-black text-teal-950">
                          <dt>Total</dt>
                          <dd>{formatArs(quote.totalAmountArs)}</dd>
                        </div>
                      </dl>

                      <button
                        className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        type="button"
                        onClick={() => void confirmPurchase()}
                        disabled={orderCreating}
                      >
                        {orderCreating ? 'Iniciando compra.' : 'Confirmar compra'}
                      </button>
                      <p className="text-[11px] leading-relaxed text-neutral-500">
                        El dinero queda en custodia de REVIA hasta que confirmes la recepción. La
                        Tasa de REVIA se calcula sobre el precio del artículo.
                      </p>
                    </>
                  ) : null}

                  {orderError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                      {orderError}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <button
                className="w-full rounded-xl border border-teal-700 px-4 py-3 text-sm font-semibold text-teal-700 disabled:opacity-60"
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteBusy}
              >
                {isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              </button>

              {canInteract ? (
                <>
                  <button
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800 disabled:opacity-60"
                    type="button"
                    onClick={startChat}
                    disabled={chatStarting}
                  >
                    {chatStarting ? 'Abriendo chat…' : 'Contactar vendedor'}
                  </button>

                  {listing.allowOffers && listing.status === 'active' ? (
                    <>
                      <button
                        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800"
                        type="button"
                        onClick={() => setOfferOpen((value) => !value)}
                      >
                        {offerOpen ? 'Cancelar oferta' : 'Hacer oferta'}
                      </button>

                      {offerOpen ? (
                        <form
                          className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                          onSubmit={submitOffer}
                        >
                          <label
                            className="text-xs font-semibold text-neutral-600"
                            htmlFor="offer-amount"
                          >
                            Tu oferta (ARS)
                          </label>
                          <input
                            id="offer-amount"
                            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
                            type="number"
                            min={1}
                            max={listing.priceArs}
                            value={offerAmount}
                            onChange={(event) => setOfferAmount(event.target.value)}
                            required
                          />
                          <p className="text-[11px] text-neutral-500">
                            Hasta 30% menos: mínimo {formatArs(Math.ceil(listing.priceArs * 0.7))}.
                          </p>
                          <button
                            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            type="submit"
                            disabled={offerBusy}
                          >
                            {offerBusy ? 'Enviando…' : 'Enviar oferta'}
                          </button>
                        </form>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}

              {isOwner ? (
                <Link
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-center text-sm font-semibold text-neutral-800"
                  href="/ofertas"
                >
                  Ver ofertas recibidas
                </Link>
              ) : null}

              {!user ? (
                <Link
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-center text-sm font-semibold text-neutral-800"
                  href={loginHref}
                >
                  Ingresá para comprar, ofertar o contactar
                </Link>
              ) : null}

              {offerError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {offerError}
                </p>
              ) : null}

              {offerMessage ? (
                <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
                  {offerMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Detalles</h2>
            <dl className="mt-3 grid gap-2 text-sm text-neutral-600">
              {attributes.map((attribute) => (
                <div className="flex justify-between gap-4" key={attribute.label}>
                  <dt className="text-neutral-500">{attribute.label}</dt>
                  <dd className="text-right font-medium text-neutral-800">
                    {String(attribute.value)}
                  </dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-neutral-400">
              Entrega
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-600">
              {listing.deliveryModes.map((mode) => (
                <li key={mode}>{DELIVERY_LABELS[mode] ?? mode}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Descripción</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
              {listing.description}
            </p>
          </div>

          {listing.seller ? (
            <Link
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              href={`/vendedores/${listing.seller.id}`}
            >
              {listing.seller.avatarUrl ? (
                <img
                  src={listing.seller.avatarUrl}
                  alt={listing.seller.fullName}
                  className="h-14 w-14 rounded-full border border-neutral-200 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-500">
                  {listing.seller.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-neutral-900">
                  {listing.seller.fullName}
                  {listing.seller.sellerVerified ? <VerifiedBadge /> : null}
                </p>
                <p className="text-xs text-neutral-500">{listing.seller.location}</p>
                <p className="text-xs font-semibold text-teal-700">Ver perfil</p>
              </div>
            </Link>
          ) : null}

          <button
            className="w-fit text-xs font-semibold text-neutral-500 underline"
            type="button"
            onClick={reportListing}
          >
            Denunciar publicación
          </button>

          {reportMessage ? (
            <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {reportMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
