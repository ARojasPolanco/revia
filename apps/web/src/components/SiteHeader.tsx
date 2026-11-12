'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CircleHelp, LogOut, Mail, Package, Settings, ShoppingBag } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useDialog } from './DialogProvider';
import { SiteCategories } from './SiteCategories';
import { SiteSearch } from './SiteSearch';

const buyerMenuLinks = [
  { href: '/compras', label: 'Compras' },
  { href: '/ofertas', label: 'Ofertas' },
  { href: '/favoritos', label: 'Favoritos' },
  { href: '/cupones', label: 'Cupones' },
  { href: '/disputas', label: 'Disputas' },
  { href: '/verificacion', label: 'Empezar a vender' },
];

const sellerMenuLinks = [
  { href: '/ventas', label: 'Ventas' },
  { href: '/ofertas', label: 'Ofertas' },
  { href: '/cobros', label: 'Cobros' },
  { href: '/compras', label: 'Compras' },
  { href: '/favoritos', label: 'Favoritos' },
  { href: '/cupones', label: 'Cupones' },
  { href: '/disputas', label: 'Disputas' },
];

const staffMenuLinks = [
  { href: '/admin/publicaciones', label: 'Moderación', roles: ['admin', 'moderator'] },
  { href: '/admin/finanzas', label: 'Finanzas', roles: ['admin', 'finance'] },
  { href: '/admin/ganancias', label: 'Ganancias', roles: ['admin', 'finance'] },
  { href: '/admin/disputas', label: 'Disputas', roles: ['admin', 'support'] },
  { href: '/admin/resenas', label: 'Reseñas', roles: ['admin', 'support'] },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { confirm } = useDialog();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const isStaff = Boolean(user && ['admin', 'moderator', 'support', 'finance'].includes(user.role));
  const isSeller = Boolean(
    user && !isStaff && (user.sellerVerified || user.kycStatus === 'approved')
  );
  const staffLinks = user
    ? staffMenuLinks
        .filter((item) => item.roles.includes(user.role))
        .map(({ href, label }) => ({ href, label }))
    : [];
  const menuLinks = isStaff ? staffLinks : isSeller ? sellerMenuLinks : buyerMenuLinks;
  const showCategories =
    !isStaff && (pathname === '/' || (!isSeller && pathname !== '/configuracion'));

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  async function handleLogout() {
    setAccountOpen(false);

    const confirmed = await confirm({
      title: 'Cerrar sesión',
      message: 'Vas a salir de tu cuenta en este dispositivo.',
      icon: <LogOut className="h-5 w-5" strokeWidth={1.75} />,
      confirmLabel: 'Cerrar sesión',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    await logout();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          className="shrink-0 text-lg font-black tracking-tight text-teal-700 sm:text-xl"
          href="/"
        >
          REVIA
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center px-2 lg:flex">
          <SiteSearch className="w-full max-w-xl" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!loading && !user ? (
            <Link
              className="rounded-xl px-2 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              href="/ingresar"
            >
              <span className="hidden sm:inline">Iniciar sesión</span>
              <span className="sm:hidden">Ingresar</span>
            </Link>
          ) : null}

          {!loading && !user ? (
            <Link
              className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              href="/publicar"
            >
              <span className="hidden sm:inline">Vender ahora</span>
              <span className="sm:hidden">Vender</span>
            </Link>
          ) : null}

          {!loading && !user ? (
            <Link
              aria-label="Ayuda y preguntas frecuentes"
              className="rounded-xl border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              href="/faq"
              title="Ayuda"
            >
              <CircleHelp className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          ) : null}

          {!loading && user && isSeller ? (
            <>
              <Link
                className="rounded-xl bg-teal-700 px-2 py-2 text-sm font-semibold text-white hover:bg-teal-800 sm:px-3"
                href="/publicar"
              >
                Publicar
              </Link>
              <Link
                aria-label="Mis publicaciones"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 p-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 sm:p-2"
                href="/mis-publicaciones"
                title="Mis publicaciones"
              >
                <Package className="h-5 w-5" strokeWidth={1.75} />
                <span className="hidden sm:inline">Mis publicaciones</span>
              </Link>
            </>
          ) : null}

          {!loading && user && !isSeller && !isStaff ? (
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-2.5 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              href="/compras"
              title="Mis compras"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Mis compras</span>
              <span className="sm:hidden">Compras</span>
            </Link>
          ) : null}

          {!loading && user ? (
            <>
              <Link
                aria-label="Chat"
                className="rounded-xl border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 sm:p-2"
                href="/chat"
                title="Chat"
              >
                <Mail className="h-5 w-5" strokeWidth={1.75} />
              </Link>
              <Link
                aria-label="Notificaciones"
                className="rounded-xl border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 sm:p-2"
                href="/notificaciones"
                title="Notificaciones"
              >
                <Bell className="h-5 w-5" strokeWidth={1.75} />
              </Link>
            </>
          ) : null}

          {!loading && user ? (
            <div className="relative" ref={accountRef}>
              <button
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Abrir ajustes de cuenta"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 sm:h-9 sm:w-9"
                title={user.fullName}
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
              >
                <Settings className="h-4 w-4" strokeWidth={1.75} />
              </button>

              {accountOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl"
                  role="menu"
                >
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <p className="truncate text-sm font-bold text-neutral-900">{user.fullName}</p>
                  </div>

                  <div className="mt-2 grid max-h-[55vh] grid-cols-2 gap-0.5 overflow-y-auto">
                    <Link
                      className="flex min-h-9 items-center rounded-lg px-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                      href="/configuracion"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                    >
                      Mi cuenta
                    </Link>
                    {menuLinks.map((item) => (
                      <Link
                        className="flex min-h-9 items-center rounded-lg px-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                        href={item.href}
                        key={item.href}
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <button
                    className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-xl border-t border-neutral-100 px-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                    role="menuitem"
                    type="button"
                    onClick={() => void handleLogout()}
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.75} />
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-neutral-100 px-4 py-2 lg:hidden">
        <SiteSearch />
      </div>

      {showCategories ? <SiteCategories /> : null}
    </header>
  );
}
