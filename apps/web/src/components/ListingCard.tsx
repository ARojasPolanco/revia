import Link from 'next/link';
import { CONDITION_LABELS, formatArs, listingCover, type Listing } from '@/lib/listings';

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listingCover(listing);

  return (
    <Link
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
      href={`/publicaciones/${listing.id}`}
    >
      {cover ? (
        <img
          src={cover}
          alt={listing.title}
          className="h-48 w-full object-cover transition group-hover:opacity-95"
        />
      ) : (
        <div className="flex h-48 items-center justify-center bg-neutral-100 text-sm text-neutral-400">
          Sin foto
        </div>
      )}

      <div className="flex flex-col gap-1 p-4">
        <p className="text-lg font-bold text-neutral-900">{formatArs(listing.priceArs)}</p>
        <h2 className="line-clamp-2 text-sm font-semibold text-neutral-800">{listing.title}</h2>
        <p className="text-xs text-neutral-500">
          {CONDITION_LABELS[listing.condition] ?? listing.condition} · {listing.location}
        </p>
        {listing.seller ? (
          <p className="mt-1 text-xs text-neutral-500">
            {listing.seller.fullName}
            {listing.seller.sellerVerified ? ' · Perfil verificado' : ''}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
