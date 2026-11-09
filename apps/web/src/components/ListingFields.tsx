'use client';

import type { Category, ListingFieldsValue } from '@/lib/listings';
import { CONDITION_OPTIONS, DELIVERY_OPTIONS } from '@/lib/listings';

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600 disabled:bg-neutral-100';
const labelClass = 'text-sm font-medium text-neutral-700';

interface Props {
  categories: Category[];
  value: ListingFieldsValue;
  onChange: (value: ListingFieldsValue) => void;
  disabled?: boolean;
}

export function ListingFields({ categories, value, onChange, disabled = false }: Props) {
  const selectedParent = categories.find((category) => category.id === value.parentCategoryId);
  const subcategories = selectedParent?.children ?? [];
  const selectedCategory = subcategories.find((category) => category.id === value.categoryId);
  const attributes = selectedCategory?.attributes ?? [];

  function update<K extends keyof ListingFieldsValue>(key: K, next: ListingFieldsValue[K]) {
    onChange({ ...value, [key]: next });
  }

  function updateAttribute(key: string, next: string | number | boolean) {
    onChange({
      ...value,
      attributes: {
        ...value.attributes,
        [key]: next,
      },
    });
  }

  function toggleDelivery(mode: string) {
    const next = value.deliveryModes.includes(mode)
      ? value.deliveryModes.filter((item) => item !== mode)
      : [...value.deliveryModes, mode];

    update('deliveryModes', next);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Datos del artículo</h2>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col">
            <span className={labelClass}>Título</span>
            <input
              className={inputClass}
              value={value.title}
              onChange={(event) => update('title', event.target.value)}
              required
              minLength={5}
              maxLength={80}
              disabled={disabled}
              placeholder="Ej. Campera de abrigo talle M"
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Descripción</span>
            <textarea
              className={inputClass}
              value={value.description}
              onChange={(event) => update('description', event.target.value)}
              required
              minLength={20}
              maxLength={2000}
              rows={5}
              disabled={disabled}
              placeholder="Contá el estado, detalles, medidas y qué incluye."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col">
              <span className={labelClass}>Estado</span>
              <select
                className={inputClass}
                value={value.condition}
                onChange={(event) => update('condition', event.target.value)}
                disabled={disabled}
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col">
              <span className={labelClass}>Precio (ARS)</span>
              <input
                className={inputClass}
                type="number"
                min={1}
                step={1}
                value={value.priceArs}
                onChange={(event) => update('priceArs', event.target.value)}
                required
                disabled={disabled}
                placeholder="15000"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Categoría</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col">
            <span className={labelClass}>Rubro</span>
            <select
              className={inputClass}
              value={value.parentCategoryId}
              onChange={(event) =>
                onChange({
                  ...value,
                  parentCategoryId: event.target.value,
                  categoryId: '',
                  attributes: {},
                })
              }
              required
              disabled={disabled}
            >
              <option value="">Elegí un rubro</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Subcategoría</span>
            <select
              className={inputClass}
              value={value.categoryId}
              onChange={(event) =>
                onChange({
                  ...value,
                  categoryId: event.target.value,
                  attributes: {},
                })
              }
              required
              disabled={disabled || !selectedParent}
            >
              <option value="">Elegí una subcategoría</option>
              {subcategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {attributes.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {attributes.map((attribute) => (
              <label className="flex flex-col" key={attribute.id}>
                <span className={labelClass}>
                  {attribute.label}
                  {attribute.required ? ' *' : ''}
                </span>

                {attribute.type === 'boolean' ? (
                  <input
                    className="mt-2 h-4 w-4"
                    type="checkbox"
                    checked={Boolean(value.attributes[attribute.key])}
                    onChange={(event) => updateAttribute(attribute.key, event.target.checked)}
                    disabled={disabled}
                  />
                ) : attribute.type === 'select' ? (
                  <select
                    className={inputClass}
                    value={String(value.attributes[attribute.key] ?? '')}
                    onChange={(event) => updateAttribute(attribute.key, event.target.value)}
                    required={attribute.required}
                    disabled={disabled}
                  >
                    <option value="">Elegí una opción</option>
                    {(attribute.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputClass}
                    type={attribute.type === 'number' ? 'number' : 'text'}
                    value={String(value.attributes[attribute.key] ?? '')}
                    onChange={(event) => updateAttribute(attribute.key, event.target.value)}
                    required={attribute.required}
                    disabled={disabled}
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Entrega y ofertas</h2>

        <label className="mt-4 flex flex-col">
          <span className={labelClass}>Ubicación</span>
          <input
            className={inputClass}
            value={value.location}
            onChange={(event) => update('location', event.target.value)}
            required
            maxLength={120}
            disabled={disabled}
          />
        </label>

        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className={labelClass}>Modalidades de entrega</legend>
          {DELIVERY_OPTIONS.map((option) => (
            <label className="flex items-start gap-2 text-sm text-neutral-700" key={option.value}>
              <input
                className="mt-0.5"
                type="checkbox"
                checked={value.deliveryModes.includes(option.value)}
                onChange={() => toggleDelivery(option.value)}
                disabled={disabled}
              />
              <span>{option.label}</span>
            </label>
          ))}
          <p className="text-xs text-neutral-500">
            Si elegís punto medio, el comprador paga $2.200 extra que van al vendedor.
          </p>
        </fieldset>

        <label className="mt-4 flex items-start gap-2 text-sm text-neutral-700">
          <input
            className="mt-0.5"
            type="checkbox"
            checked={value.allowOffers}
            onChange={(event) => update('allowOffers', event.target.checked)}
            disabled={disabled}
          />
          <span>Permitir ofertas de compradores (hasta 30% menos).</span>
        </label>
      </section>
    </div>
  );
}
