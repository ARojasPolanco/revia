import Link from 'next/link';
import { DELIVERY_LABELS, formatArs } from '@/lib/listings';
import { formatDateTime, orderStatusLabel, type Order } from '@/lib/orders';

interface Props {
  order: Order;
  href: string;
}

export function OrderCard({ order, href }: Props) {
  const counterpart = order.role === 'buyer' ? order.seller : order.buyer;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row">
      <Link className="shrink-0" href={href}>
        {order.listing.photoUrl ? (
          <img
            src={order.listing.photoUrl}
            alt={order.listing.title}
            className="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center rounded-xl bg-neutral-100 text-xs text-neutral-400 sm:h-24 sm:w-24">
            Sin foto
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="text-sm font-bold text-neutral-900 underline-offset-2 hover:underline"
            href={href}
          >
            {order.listing.title}
          </Link>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
            {orderStatusLabel(order.status)}
          </span>
        </div>

        <p className="text-xs text-neutral-500">
          {order.role === 'buyer' ? 'Vendedor' : 'Comprador'}: {counterpart?.fullName ?? '-'}
        </p>
        <p className="text-xs text-neutral-500">
          {DELIVERY_LABELS[order.deliveryMode] ?? order.deliveryMode}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <p className="text-lg font-black text-neutral-900">{formatArs(order.totalAmountArs)}</p>
          <p className="text-[11px] text-neutral-400">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>
    </article>
  );
}
