import Link from 'next/link';

const links = [
  { href: '/quienes-somos', label: 'Quiénes somos' },
  { href: '/faq', label: 'Preguntas frecuentes' },
  { href: '/terminos', label: 'Términos y condiciones' },
  { href: '/privacidad', label: 'Política de privacidad' },
  { href: '/cookies', label: 'Política de cookies' },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-neutral-500 sm:px-6">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {links.map((link) => (
            <Link
              className="font-semibold text-neutral-600 hover:text-teal-700"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p>REVIA · Bahía Blanca · MVP en desarrollo.</p>
      </div>
    </footer>
  );
}
