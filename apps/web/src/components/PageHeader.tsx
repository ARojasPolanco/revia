import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ActionSize = 'sm' | 'md';

const baseAction =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-60 sm:w-auto';

const actionVariants: Record<ActionVariant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800',
  secondary: 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  ghost: 'px-1 text-teal-700 hover:text-teal-800',
};

const actionSizes: Record<ActionSize, string> = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
};

function actionClass(variant: ActionVariant, size: ActionSize, className = ''): string {
  return `${baseAction} ${actionVariants[variant]} ${actionSizes[size]} ${className}`;
}

export function ActionLink({
  href,
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: ActionVariant;
  size?: ActionSize;
  className?: string;
}) {
  return (
    <Link className={actionClass(variant, size, className)} href={href}>
      {children}
    </Link>
  );
}

export function ActionButton({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ActionVariant;
  size?: ActionSize;
}) {
  return (
    <button className={actionClass(variant, size, className)} type="button" {...props}>
      {children}
    </button>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = 'Volver',
  eyebrow,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link className="text-xs font-semibold text-teal-700 hover:text-teal-800" href={backHref}>
            ← {backLabel}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-600">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

const adminTabs = [
  { href: '/admin/publicaciones', label: 'Moderación', roles: ['admin', 'moderator'] },
  { href: '/admin/finanzas', label: 'Finanzas', roles: ['admin', 'finance'] },
  { href: '/admin/disputas', label: 'Disputas', roles: ['admin', 'support'] },
  { href: '/admin/resenas', label: 'Reseñas', roles: ['admin', 'support'] },
];

export function AdminTabs({ role, current }: { role: string | undefined; current: string }) {
  const visible = adminTabs.filter((tab) => (role ? tab.roles.includes(role) : false));

  return (
    <nav
      aria-label="Secciones de administración"
      className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm"
    >
      {visible.map((tab) => (
        <Link
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            current === tab.href
              ? 'bg-teal-50 text-teal-800'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
