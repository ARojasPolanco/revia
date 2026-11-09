'use client';

import { useEffect, useState } from 'react';

interface Props {
  src: string;
  alt: string;
  wrapperClassName?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  zoomLabel?: string;
}

export function ZoomableImage({
  src,
  alt,
  wrapperClassName = 'aspect-[4/3] w-full overflow-hidden bg-neutral-100',
  className = 'h-full w-full object-cover',
  loading = 'lazy',
  zoomLabel = 'Ampliar imagen',
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        aria-label={zoomLabel}
        className={`group relative ${wrapperClassName}`}
        type="button"
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={alt} className={className} loading={loading} />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          Ampliar
        </span>
      </button>

      {open ? (
        <div
          aria-label="Imagen ampliada"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-neutral-900"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
          >
            Cerrar
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[88vh] max-w-[94vw] rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
