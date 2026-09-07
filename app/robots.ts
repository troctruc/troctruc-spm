import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/profil', '/messages'],
    },
    sitemap: 'https://troctruc-spm.com/sitemap.xml',
  }
}