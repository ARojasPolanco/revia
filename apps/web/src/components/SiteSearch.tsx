'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SiteSearch({ className = '' }: { className?: string }) {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();

    router.push(value ? `/publicaciones?q=${encodeURIComponent(value)}` : '/publicaciones');
  }

  return (
    <form
      className={`flex h-10 min-w-0 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 transition-colors focus-within:border-teal-500 focus-within:bg-white ${className}`}
      role="search"
      onSubmit={submit}
    >
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.9} />
      <label className="sr-only" htmlFor={inputId}>
        Buscar artículos
      </label>
      <input
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        id={inputId}
        placeholder="Buscar artículos"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}
