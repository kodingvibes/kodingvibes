import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/_next/'],
    },
    sitemap: 'https://www.kodingvibes.com/sitemap.xml',
  }
}
