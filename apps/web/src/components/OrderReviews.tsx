'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/orders';
import type { OrderReviewState, Review } from '@/lib/reviews';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} de 5 estrellas`}>
      {'★'.repeat(rating)}
      <span className="text-neutral-300">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function OrderReviews({ orderId }: { orderId: string }) {
  const [state, setState] = useState<OrderReviewState | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<OrderReviewState>(`/orders/${orderId}/reviews`);
      setState(data);
    } catch {
      setState(null);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/orders/${orderId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      setComment('');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la reseña.');
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-neutral-900">Reseñas de la operación</h2>

      {state.reviews.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no hay reseñas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {state.reviews.map((review: Review) => (
            <article
              className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
              key={review.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-neutral-900">
                  {review.author?.fullName ?? 'Usuario de REVIA'}
                </p>
                <Stars rating={review.rating} />
              </div>
              {review.comment ? (
                <p className="mt-1 text-sm text-neutral-600">{review.comment}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-neutral-400">
                {formatDateTime(review.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}

      {state.canReview ? (
        <form className="flex flex-col gap-2 border-t border-neutral-200 pt-4" onSubmit={submit}>
          <p className="text-xs font-semibold text-neutral-600">Dejá tu reseña</p>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            Puntaje
            <select
              className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} estrella(s)
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="min-h-20 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
            maxLength={1000}
            placeholder="Contá cómo fue la experiencia (opcional)"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <button
            className="w-fit rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Enviando.' : 'Publicar reseña'}
          </button>
        </form>
      ) : state.reason ? (
        <p className="text-xs text-neutral-500">{state.reason}</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
