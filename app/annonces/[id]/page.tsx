import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import AnnonceDetailClient from './annonce-detail-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type PageProps = {
  params: Promise<{
    id: string
  }>
}

async function getAnnonce(id: string) {
  const { data, error } = await supabase
    .from('annonces')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const annonce = await getAnnonce(id)

  if (!annonce) {
    return {
      title: 'Annonce introuvable',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const title =
    annonce.titre ||
    annonce.title ||
    'Petite annonce'

  const lieu =
    annonce.lieu ||
    annonce.location ||
    annonce.ville ||
    'Saint-Pierre-et-Miquelon'

  const prix =
    annonce.prix !== undefined && annonce.prix !== null
      ? `${annonce.prix} €`
      : ''

  const rawDescription =
    annonce.description ||
    `Découvrez cette annonce disponible à ${lieu} sur TrocTruc SPM.`

  const description = rawDescription
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 155)

  let imageUrl: string | undefined

  const rawImages =
    annonce.photos ||
    annonce.image_url ||
    annonce.image_urls ||
    annonce.image ||
    annonce.photo ||
    []

  let firstImage: string | undefined

  if (Array.isArray(rawImages)) {
    firstImage = rawImages[0]
  } else if (typeof rawImages === 'string') {
    firstImage = rawImages
      .split(',')
      .map((item: string) => item.trim())
      .filter(Boolean)[0]
  }

  if (firstImage) {
    if (firstImage.startsWith('http')) {
      imageUrl = firstImage
    } else {
      const { data } = supabase.storage
        .from('annonces-images')
        .getPublicUrl(firstImage)

      imageUrl = data.publicUrl
    }
  }

  const seoTitle = prix
    ? `${title} – ${prix} à ${lieu}`
    : `${title} à ${lieu}`

  return {
    title: seoTitle,
    description,

    alternates: {
      canonical: `/annonces/${id}`,
    },

    openGraph: {
      title: seoTitle,
      description,
      url: `https://troctruc-spm.com/annonces/${id}`,
      siteName: 'TrocTruc SPM',
      locale: 'fr_FR',
      type: 'website',
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: title,
            },
          ]
        : undefined,
    },

    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: seoTitle,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export default async function AnnoncePage({
  params,
}: PageProps) {
  const { id } = await params
  const annonce = await getAnnonce(id)

  if (!annonce) {
    notFound()
  }

  return <AnnonceDetailClient initialAnnonce={annonce} />
}