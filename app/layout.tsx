import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://troctruc-spm.com'),

  alternates: {
    canonical: '/',
  },

  title: {
    default: 'Petites annonces à Saint-Pierre-et-Miquelon | TrocTruc SPM',
    template: '%s | TrocTruc SPM',
  },

  description:
    "Achetez, vendez, donnez et échangez localement à Saint-Pierre-et-Miquelon. Petites annonces et covoiturage à Saint-Pierre, Miquelon et Langlade.",

  keywords: [
    'Saint-Pierre-et-Miquelon',
    'SPM',
    'petites annonces Saint-Pierre-et-Miquelon',
    'petites annonces SPM',
    'occasion SPM',
    'occasion Saint-Pierre-et-Miquelon',
    'troc Saint-Pierre',
    'troc SPM',
    'covoiturage SPM',
    'achat vente SPM',
    'Miquelon',
    'Langlade',
  ],

  manifest: '/manifest.json',

  openGraph: {
    title: 'Petites annonces à Saint-Pierre-et-Miquelon | TrocTruc SPM',
    description:
      "Achetez, vendez, donnez et échangez localement à Saint-Pierre-et-Miquelon.",
    url: 'https://troctruc-spm.com',
    siteName: 'TrocTruc SPM',
    locale: 'fr_FR',
    type: 'website',
  },

  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}