import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'REVIA — Marketplace de segunda mano en Bahía Blanca',
    template: '%s · REVIA',
  },
  description:
    'Comprá y vendé artículos de segunda mano entre particulares en Bahía Blanca, con pago protegido y Tasa de REVIA.',
  applicationName: 'REVIA',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'REVIA',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
