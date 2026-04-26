import { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
      return staticRoutes
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/posts?select=id,updated_at&is_deleted=eq.false`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return staticRoutes
    }

    const posts = (await response.json()) as Array<{ id: string; updated_at: string | null }>
    
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
