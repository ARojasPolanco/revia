import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function CookiesPage() {
  return (
    <PlaceholderPage
      description="Acá vamos a detallar qué cookies y tecnologías similares usa REVIA, para qué sirven y cómo podés gestionarlas."
      eyebrow="Legal"
      sections={[
        'Cookies necesarias',
        'Cookies de sesión',
        'Cookies de preferencias',
        'Medición y analítica',
        'Cómo gestionar cookies',
      ]}
      title="Política de cookies"
    />
  );
}
