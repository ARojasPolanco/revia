export interface CategoryAttribute {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options: string[] | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  attributes: CategoryAttribute[];
  children?: Category[];
}

export interface ListingPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  sortOrder: number;
}

export interface PublicSeller {
  id: string;
  fullName: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  sellerVerified: boolean;
  createdAt: string;
}

export interface ListingCategory {
  id: string;
  name: string;
  slug: string;
  parent: { id: string; name: string; slug: string } | null;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  condition: string;
  priceArs: number;
  deliveryModes: string[];
  midpointFeeArs: number;
  allowOffers: boolean;
  location: string;
  attributes: Record<string, unknown>;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: ListingPhoto[];
  category: ListingCategory | null;
  seller: PublicSeller | null;
}

export const CONDITION_OPTIONS = [
  { value: 'new_with_tags', label: 'Nuevo con etiqueta' },
  { value: 'new_without_tags', label: 'Nuevo sin etiqueta' },
  { value: 'very_good', label: 'Muy bueno' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Satisfactorio' },
];

export const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITION_OPTIONS.map((option) => [option.value, option.label])
);

export const DELIVERY_OPTIONS = [
  { value: 'pickup_home', label: 'Retiro en el domicilio del vendedor' },
  { value: 'midpoint', label: 'Punto medio en el centro (+$2.200)' },
  { value: 'home_delivery', label: 'Envío coordinado con Uber/Didi' },
];

export const DELIVERY_LABELS: Record<string, string> = Object.fromEntries(
  DELIVERY_OPTIONS.map((option) => [option.value, option.label])
);

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente de aprobación',
  active: 'Activa',
  rejected: 'Rechazada',
  paused: 'Pausada',
  sold: 'Vendida',
  deleted: 'Eliminada',
};

export function formatArs(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function listingCover(listing: Listing): string | null {
  return listing.photos[0]?.thumbnailUrl ?? null;
}

export interface ListingFieldsValue {
  title: string;
  description: string;
  parentCategoryId: string;
  categoryId: string;
  condition: string;
  priceArs: string;
  deliveryModes: string[];
  location: string;
  allowOffers: boolean;
  attributes: Record<string, string | number | boolean>;
}

export function emptyListingFields(): ListingFieldsValue {
  return {
    title: '',
    description: '',
    parentCategoryId: '',
    categoryId: '',
    condition: 'very_good',
    priceArs: '',
    deliveryModes: ['pickup_home'],
    location: 'Bahía Blanca',
    allowOffers: true,
    attributes: {},
  };
}
