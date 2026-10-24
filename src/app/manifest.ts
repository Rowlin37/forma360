import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Forma360 — Transformación Física Integral',
    short_name: 'Forma360',
    description:
      'Plataforma personal de fuerza, pérdida de grasa, composición corporal, nutrición española y progresión segura hacia media maratón.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#10b981',
    lang: 'es-ES',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
