import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get post ID and title from query params
    const postId = searchParams.get('id');
    let title = searchParams.get('title') || 'KodingVibes';
    let imageUrl = searchParams.get('image') || null;
    
    // If we have a post ID, try to fetch the post data from Supabase
    if (postId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const response = await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${postId}&select=title,image_url&is_deleted=eq.false`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              if (data[0].title && title === 'KodingVibes') {
                title = data[0].title;
              }
              if (data[0].image_url && !imageUrl) {
                imageUrl = data[0].image_url;
              }
            }
          }
        }
      } catch (fetchError) {
        // Log error without sensitive details
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching post data:', fetchError);
        }
        // Continue with default values
      }
    }
    
    // Generate the image
    const imageResponse = (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Logo SVG at top */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Logo SVG */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer circle */}
            <circle
              cx="20"
              cy="20"
              r="18"
              stroke="#6366f1"
              strokeWidth="2"
              fill="none"
            />
            {/* Inner design - code brackets */}
            <path
              d="M14 14L10 20L14 26"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M26 14L30 20L26 26"
              stroke="#a855f7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Middle slash */}
            <path
              d="M18 28L22 12"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          
          {/* KodingVibes text */}
          <span
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            Koding<span style={{ color: '#a855f7' }}>Vibes</span>
          </span>
        </div>
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            width: '100%',
            maxWidth: '1100px',
            marginTop: '40px',
          }}
        >
          {/* Title - without external images for now */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: '#ffffff',
                lineHeight: '1.2',
                textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {title.length > 80 ? title.substring(0, 80) + '...' : title}
            </div>
          </div>
        </div>
        
        {/* Bottom gradient line */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #e94560 100%)',
          }}
        />
      </div>
    );
    
    return new ImageResponse(imageResponse, {
      width: 1200,
      height: 630,
    });
  } catch (e) {
    console.error('Error generating OG image:', e);
    return new Response(`Failed to generate the image: ${e}`, {
      status: 500,
    });
  }
}
