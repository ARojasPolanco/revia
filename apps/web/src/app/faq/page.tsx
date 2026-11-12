import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function FaqPage() {
  return (
    <PlaceholderPage
      description="Acá vamos a responder las dudas más frecuentes sobre compras, ventas, pagos, entregas, disputas y verificaciones."
      eyebrow="Ayuda"
      sections={[
        'Crear una cuenta',
        'Comprar y pagar',
        'Publicar y vender',
        'Entregas',
        'Código de entrega',
        'Disputas y reembolsos',
        'Cupones',
        'Reseñas',
      ]}
      title="Preguntas frecuentes"
    />
  );
}
