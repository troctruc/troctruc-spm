import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://troctruc-spm.com'),

  title: {
    default:
      'Petites annonces à Saint-Pierre-et-Miquelon | TrocTruc SPM',

    template:
      '%s | TrocTruc SPM',
  },

  description:
    "Achetez, vendez, donnez et échangez à Saint-Pierre-et-Miquelon. Petites annonces locales, véhicules, maison, services, immobilier et covoiturage à Saint-Pierre, Miquelon et Langlade.",

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

  applicationName:
    'TrocTruc SPM',

  authors: [
    {
      name:
        'TrocTruc SPM',
    },
  ],

  creator:
    'TrocTruc SPM',

  publisher:
    'TrocTruc SPM',

  manifest:
    '/manifest.json',

  openGraph: {
    title:
      'Petites annonces à Saint-Pierre-et-Miquelon | TrocTruc SPM',

    description:
      "Achetez, vendez, donnez et échangez à Saint-Pierre-et-Miquelon. Petites annonces locales, véhicules, maison, services, immobilier et covoiturage à Saint-Pierre, Miquelon et Langlade.",

    url:
      'https://troctruc-spm.com',

    siteName:
      'TrocTruc SPM',

    locale:
      'fr_FR',

    type:
      'website',

    images: [
      {
        url:
          '/puffin-logo.jpeg',

        width:
          1200,

        height:
          630,

        alt:
          'TrocTruc SPM - Petites annonces à Saint-Pierre-et-Miquelon',
      },
    ],
  },

  twitter: {
    card:
      'summary_large_image',

    title:
      'Petites annonces à Saint-Pierre-et-Miquelon | TrocTruc SPM',

    description:
      "Achetez, vendez, donnez et échangez localement à Saint-Pierre-et-Miquelon.",

    images: [
      '/puffin-logo.jpeg',
    ],
  },

  robots: {
    index:
      true,

    follow:
      true,

    googleBot: {
      index:
        true,

      follow:
        true,

      'max-image-preview':
        'large',

      'max-snippet':
        -1,

      'max-video-preview':
        -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children:
    React.ReactNode
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