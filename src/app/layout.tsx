import type { Metadata, Viewport } from 'next';
import { Forma360Provider } from '@/context/Forma360Context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forma360 — Plataforma Personal de Transformación Física',
  description:
    'Entrenamiento adaptable en casa, pérdida de grasa sostenible, seguimiento corporal, nutrición española y progresión segura hacia media maratón.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Forma360Provider>{children}</Forma360Provider>
      </body>
    </html>
  );
}
