import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      description="Acá vamos a publicar cómo REVIA recopila, usa y protege los datos personales de compradores y vendedores."
      eyebrow="Legal"
      sections={[
        'Datos que recopilamos',
        'Uso de datos',
        'Custodia y pagos',
        'KYC y verificación de identidad',
        'Conservación y eliminación',
        'Derechos de las personas usuarias',
        'Contacto y reclamos',
      ]}
      title="Política de privacidad"
    />
  );
}
