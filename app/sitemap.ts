import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://troctruc-spm.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/covoiturage`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ]

  const { data: annonces, error } = await supabase
    .from('annonces')
    .select('id, updated_at, created_at, validated, status')
    .or('validated.eq.true,status.eq.validé')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur génération sitemap annonces:', error)
    return staticPages
  }

  const annoncePages: MetadataRoute.Sitemap =
    annonces?.map((annonce) => ({
      url: `${baseUrl}/annonces/${annonce.id}`,
      lastModified: new Date(
        annonce.updated_at || annonce.created_at || now
      ),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })) || []

  return [...staticPages, ...annoncePages]
}