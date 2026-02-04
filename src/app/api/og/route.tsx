import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get post ID and title from query params
    const postId = searchParams.get('id');
    let title = searchParams.get('title') || 'KodingVibes';
    
    // If we have a post ID but no title, try to fetch the title from Supabase
    if (postId && title === 'KodingVibes') {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const response = await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${postId}&select=title&is_deleted=eq.false`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0 && data[0].title) {
              title = data[0].title;
            }
          }
        }
      } catch (fetchError) {
        console.error('Error fetching post title:', fetchError);
        // Continue with default title
      }
    }
    
    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              maxWidth: '1000px',
            }}
          >
            {/* Logo/Brand */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#e94560',
                marginBottom: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '40px' }}>{`{`}</span>
              KodingVibes
              <span style={{ fontSize: '40px' }}>{`}`}</span>
            </div>
            
            {/* Title */}
            <div
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: '#ffffff',
                lineHeight: '1.2',
                marginBottom: '30px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {title.length > 80 ? title.substring(0, 80) + '...' : title}
            </div>
            
            {/* Subtitle */}
            <div
              style={{
                fontSize: '28px',
                color: '#a0a0a0',
                marginTop: '20px',
              }}
            >
              Comunidad de desarrolladores
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.log(`${e}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
