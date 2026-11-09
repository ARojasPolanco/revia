export const metadata = {
  title: 'Ingresar',
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
      <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ingresar a REVIA</h1>
      <p className="text-sm text-neutral-600">
        El formulario de ingreso se implementa en la Fase 1. Este placeholder evita bucles de
        redirección del scaffold.
      </p>
      <a className="text-sm font-semibold text-teal-700" href="/">
        Volver al inicio
      </a>
    </main>
  );
}
