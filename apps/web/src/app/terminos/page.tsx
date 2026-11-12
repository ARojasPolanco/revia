import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function TermsPage() {
  return (
    <PlaceholderPage
      description="Acá vamos a publicar las condiciones de uso de REVIA, incluyendo reglas de publicación, compra, entrega, custodia y disputas."
      eyebrow="Legal"
      sections={[
        'Uso de la plataforma',
        'Requisitos de las cuentas',
        'Publicaciones y moderación',
        'Compra, pago y custodia',
        'Entrega y reclamos',
        'Payouts',
        'Conductas prohibidas',
        'Responsabilidad y jurisdicción',
      ]}
      title="Términos y condiciones"
    />
  );
}
