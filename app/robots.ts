import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://troctruc-spm.com'

  return {
    rules: [
      {
        userAgent: '*',

        allow: [
          '/',
          '/annonces/',
          '/covoiturage',
          '/mentions-legales',
        ],

        disallow: [
          '/auth',
          '/profil',
          '/profil/',
          '/conversations',
          '/conversations/',
          '/mes-annonces',
          '/annonces/nouvelle',
          '/annonces/*/modifier',
          '/api/',
        ],
      },
    ],

    sitemap: `${baseUrl}/sitemap.xml`,
  }
}