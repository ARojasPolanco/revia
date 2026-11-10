import { HomeFeed } from '@/components/HomeFeed';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-5 py-12">
      <header className="flex items-center justify-between">
        <span className="text-2xl font-black tracking-tight text-teal-700">REVIA</span>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          Bahía Blanca
        </span>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-neutral-900 sm:text-5xl">
          Comprá y vendé usado con confianza.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-neutral-600">
          REVIA conecta particulares de Bahía Blanca. El comprador paga una Tasa de REVIA que
          protege la compra y el vendedor cobra sin comisión.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white"
            href="/publicaciones"
          >
            Ver publicaciones
          </a>
          <a
            className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
            href="/publicar"
          >
            Publicar
          </a>
          <a
            className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800"
            href="/ingresar"
          >
            Ingresar
          </a>
          <a
            className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800"
            href="/favoritos"
          >
            Favoritos
          </a>
          <a
            className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800"
            href="/configuracion"
          >
            Mi cuenta
          </a>
        </div>

        <nav className="flex flex-wrap gap-4 text-sm font-semibold text-teal-700">
          <a href="/ofertas">Ofertas</a>
          <a href="/compras">Compras</a>
          <a href="/ventas">Ventas</a>
          <a href="/chat">Chat</a>
          <a href="/notificaciones">Notificaciones</a>
        </nav>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Pago protegido',
            body: 'El dinero queda en custodia hasta que confirmás la entrega.',
          },
          {
            title: 'Vendedor verificado',
            body: 'Verificación de identidad antes de publicar y cobrar.',
          },
          {
            title: 'Reclamo en 48 h',
            body: 'Si algo no coincide, abrís una disputa dentro de las 48 horas.',
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-sm font-bold text-neutral-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.body}</p>
          </article>
        ))}
      </section>

      <HomeFeed />

      <footer className="mt-auto border-t border-neutral-200 pt-6 text-xs text-neutral-500">
        REVIA · Bahía Blanca · MVP en desarrollo.
      </footer>
    </main>
  );
}
