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
    default: 'TrocTruc SPM - Petites annonces et covoiturage à Saint-Pierre-et-Miquelon',
    template: '%s | TrocTruc SPM',
  },
  description:
    "Plateforme locale de troc, vente d'occasion, dons et covoiturage entre particuliers à Saint-Pierre-et-Miquelon.",
  keywords: [
    'Saint-Pierre-et-Miquelon',
    'SPM',
    'petites annonces SPM',
    'troc Saint-Pierre',
    'covoiturage SPM',
    'occasion Saint-Pierre-et-Miquelon',
    'achat vente SPM',
  ],
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'TrocTruc SPM - Petites annonces & covoiturage local',
    description:
      "Achetez, vendez, donnez et partagez vos trajets à Saint-Pierre-et-Miquelon.",
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