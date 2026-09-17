import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import AnnonceDetailClient from './annonce-detail-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BASE_URL = 'https://troctruc-spm.com'

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

/*
 * Vérifie si l'annonce est réellement publiée.
 */
function isAnnoncePublished(annonce: any) {
  const status = String(
    annonce.status || ''
  )
    .trim()
    .toLowerCase()

  return (
    annonce.validated === true ||
    status === 'validé' ||
    status === 'valide' ||
    status === 'validée' ||
    status === 'validee' ||
    status === 'publié' ||
    status === 'publie' ||
    status === 'publiée' ||
    status === 'publiee'
  )
}

/*
 * Extrait les informations que TrocTruc stocke
 * dans la première ligne de description :
 *
 * Type : VENTE | Localisation : Saint-Pierre
 *
 * ou :
 *
 * Type : VENTE | Localisation : Saint-Pierre
 * | Sous-catégorie : Vêtements
 */
function parseDescription(rawDescription: string) {
  const parts =
    rawDescription.split('\n\n')

  const firstLine =
    parts[0]?.trim() || ''

  let localisation =
    'Saint-Pierre-et-Miquelon'

  let typeAnnonce = ''

  let sousCategorie = ''

  let cleanDescription =
    rawDescription

  if (
    firstLine.startsWith('Type :')
  ) {
    const metadataParts =
      firstLine
        .split('|')
        .map((part) =>
          part.trim()
        )

    const typePart =
      metadataParts.find(
        (part) =>
          part.startsWith(
            'Type :'
          )
      )

    const localisationPart =
      metadataParts.find(
        (part) =>
          part.startsWith(
            'Localisation :'
          )
      )

    const sousCategoriePart =
      metadataParts.find(
        (part) =>
          part.startsWith(
            'Sous-catégorie :'
          )
      )

    if (typePart) {
      typeAnnonce =
        typePart
          .replace(
            'Type :',
            ''
          )
          .trim()
    }

    if (localisationPart) {
      localisation =
        localisationPart
          .replace(
            'Localisation :',
            ''
          )
          .trim()
    }

    if (sousCategoriePart) {
      sousCategorie =
        sousCategoriePart
          .replace(
            'Sous-catégorie :',
            ''
          )
          .trim()
    }

    cleanDescription =
      parts
        .slice(1)
        .join('\n\n')
        .trim()
  }

  return {
    localisation,
    typeAnnonce,
    sousCategorie,
    cleanDescription,
  }
}

/*
 * Récupère une image utilisable par Google,
 * Facebook, WhatsApp, etc.
 */
function getAnnonceImage(
  annonce: any
) {
  const rawImages =
    annonce.photos ||
    annonce.image_url ||
    annonce.image_urls ||
    annonce.image ||
    annonce.photo ||
    []

  let firstImage:
    | string
    | undefined

  if (
    Array.isArray(rawImages)
  ) {
    firstImage =
      rawImages[0]
  } else if (
    typeof rawImages ===
    'string'
  ) {
    firstImage =
      rawImages
        .split(',')
        .map((item) =>
          item.trim()
        )
        .filter(Boolean)[0]
  }

  /*
   * URL web normale :
   * parfaite pour Open Graph.
   */
  if (
    firstImage?.startsWith(
      'http://'
    ) ||
    firstImage?.startsWith(
      'https://'
    )
  ) {
    return firstImage
  }

  /*
   * Les images base64 fonctionnent dans
   * l'interface mais ne conviennent pas
   * pour une meta Open Graph.
   */
  if (
    firstImage?.startsWith(
      'data:image/'
    )
  ) {
    return `${BASE_URL}/puffin-logo.jpeg`
  }

  /*
   * Si une ancienne annonce contient
   * un chemin Supabase Storage.
   */
  if (firstImage) {
    const { data } =
      supabase.storage
        .from(
          'annonces-images'
        )
        .getPublicUrl(
          firstImage
        )

    if (
      data?.publicUrl
    ) {
      return data.publicUrl
    }
  }

  return `${BASE_URL}/puffin-logo.jpeg`
}

/*
 * METADONNÉES GOOGLE / RÉSEAUX SOCIAUX
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } =
    await params

  const annonce =
    await getAnnonce(id)

  if (!annonce) {
    return {
      title:
        'Annonce introuvable',

      robots: {
        index:
          false,

        follow:
          false,
      },
    }
  }

  const published =
    isAnnoncePublished(
      annonce
    )

  const title =
    annonce.titre ||
    annonce.title ||
    'Petite annonce'

  const {
    localisation,
    sousCategorie,
    cleanDescription,
  } =
    parseDescription(
      annonce.description ||
        ''
    )

  const prix =
    annonce.prix !==
      undefined &&
    annonce.prix !==
      null &&
    Number(annonce.prix) >
      0
      ? `${annonce.prix} €`
      : ''

  /*
   * Exemple :
   *
   * Canapé vintage – 80 € à Saint-Pierre
   *
   * Le layout ajoutera ensuite :
   * | TrocTruc SPM
   */
  const seoTitle =
    prix
      ? `${title} – ${prix} à ${localisation}`
      : `${title} à ${localisation}`

  /*
   * Description propre, sans la ligne :
   * Type : ... | Localisation : ...
   */
  let description =
    cleanDescription
      .replace(
        /\s+/g,
        ' '
      )
      .trim()

  if (!description) {
    description =
      `Découvrez ${title} disponible à ${localisation} sur TrocTruc SPM, le site de petites annonces de Saint-Pierre-et-Miquelon.`
  }

  /*
   * On peut ajouter un peu de contexte
   * local si la description est très courte.
   */
  if (
    description.length <
    90
  ) {
    description =
      `${description} Retrouvez cette annonce ${
        sousCategorie
          ? `dans la catégorie ${sousCategorie} `
          : ''
      }à ${localisation} sur TrocTruc SPM.`
  }

  description =
    description
      .replace(
        /\s+/g,
        ' '
      )
      .trim()
      .slice(
        0,
        158
      )

  const imageUrl =
    getAnnonceImage(
      annonce
    )

  const annonceUrl =
    `${BASE_URL}/annonces/${id}`

  return {
    title:
      seoTitle,

    description,

    alternates: {
      canonical:
        annonceUrl,
    },

    /*
     * Une annonce en attente ou refusée
     * peut rester accessible via son URL,
     * mais Google ne doit pas l'indexer.
     */
    robots: published
      ? {
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
          },
        }
      : {
          index:
            false,

          follow:
            false,
        },

    openGraph: {
      title:
        seoTitle,

      description,

      url:
        annonceUrl,

      siteName:
        'TrocTruc SPM',

      locale:
        'fr_FR',

      type:
        'website',

      images: [
        {
          url:
            imageUrl,

          alt:
            `${title} à ${localisation}`,
        },
      ],
    },

    twitter: {
      card:
        'summary_large_image',

      title:
        seoTitle,

      description,

      images: [
        imageUrl,
      ],
    },
  }
}

/*
 * PAGE DE L'ANNONCE
 */
export default async function AnnoncePage({
  params,
}: PageProps) {
  const { id } =
    await params

  const annonce =
    await getAnnonce(id)

  if (!annonce) {
    notFound()
  }

  return (
    <AnnonceDetailClient
      initialAnnonce={
        annonce
      }
    />
  )
}