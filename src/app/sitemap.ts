import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Base URL
  const baseUrl = 'https://www.kodingvibes.com'
  
  // Static routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]
  
  // Fetch all posts for dynamic routes
  let postRoutes: MetadataRoute.Sitemap = []
  
  try {
    const supabase = await createClient()
    const { data: posts } = await supabase
      .from('posts')
      .select('id, updated_at')
      .eq('is_deleted', false)
    
    if (posts) {
      postRoutes = posts.map((post) => ({
        url: `${baseUrl}/post/${post.id}`,
        lastModified: new Date(post.updated_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    }
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }
  
  return [...staticRoutes, ...postRoutes]
}
