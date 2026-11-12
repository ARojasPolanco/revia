import Link from 'next/link';

interface Props {
  title: string;
  eyebrow: string;
  description: string;
  sections?: string[];
}

export function PlaceholderPage({ title, eyebrow, description, sections = [] }: Props) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Volver al inicio
        </Link>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          REVIA
        </span>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{description}</p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Contenido pendiente de definición con el equipo legal.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Esta página es un placeholder. No debe considerarse información legal definitiva.
          </p>
        </div>

        {sections.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-neutral-900">Secciones previstas</h2>
            <ul className="mt-2 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
              {sections.map((section) => (
                <li
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
                  key={section}
                >
                  {section}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
