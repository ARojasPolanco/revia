'use client';

import { useState } from 'react';

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="Más información"
        aria-expanded={open}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 text-[10px] font-bold text-neutral-500"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        !
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-10 w-64 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-2 text-xs leading-relaxed text-neutral-600 shadow-md"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
