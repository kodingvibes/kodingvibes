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
          backgroundColor: '#0a0a0e',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ─── BACKGROUND DEPTH LAYER ─── */}
        {/* Orb indigo – esquina superior izquierda */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            left: '-110px',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 62%)',
          }}
        />
        {/* Orb violeta – esquina inferior derecha */}
        <div
          style={{
            position: 'absolute',
            bottom: '-140px',
            right: '-100px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 62%)',
          }}
        />
        {/* Orb rosa – zona central derecha (sutil) */}
        <div
          style={{
            position: 'absolute',
            top: '200px',
            right: '40px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(233,69,96,0.11) 0%, transparent 60%)',
          }}
        />

        {/* ─── GEOMETRIC RINGS ─── */}
        <div
          style={{
            position: 'absolute',
            top: '-70px',
            right: '-50px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            border: '1px solid rgba(99,102,241,0.14)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '30px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: '1px solid rgba(168,85,247,0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '-40px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: '1px solid rgba(168,85,247,0.08)',
          }}
        />

        {/* ─── DECORATIVE PARTICLES ─── */}
        <div
          style={{
            position: 'absolute',
            top: '108px',
            left: '200px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99,102,241,0.45)',
            boxShadow: '0 0 6px rgba(99,102,241,0.4)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '175px',
            left: '250px',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: 'rgba(168,85,247,0.35)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '155px',
            right: '220px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: 'rgba(233,69,96,0.4)',
            boxShadow: '0 0 5px rgba(233,69,96,0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '110px',
            left: '130px',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99,102,241,0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '300px',
            left: '90px',
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            backgroundColor: 'rgba(168,85,247,0.25)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '90px',
            right: '260px',
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99,102,241,0.3)',
          }}
        />

        {/* ─── DIAGONAL ACCENT LINES ─── */}
        <div
          style={{
            position: 'absolute',
            top: '55px',
            right: '195px',
            width: '130px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)',
            transform: 'rotate(-38deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '90px',
            left: '60px',
            width: '90px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2), transparent)',
            transform: 'rotate(25deg)',
          }}
        />

        {/* ─── HEADER BAR ─── */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '78px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 56px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            zIndex: 1,
          }}
        >
          {/* Logo group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#6366f1" strokeWidth="2" fill="none" />
              <path d="M14 14L10 20L14 26" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M26 14L30 20L26 26" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M18 28L22 12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            <span style={{ fontSize: '21px', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.01em' }}>
              Koding<span style={{ color: '#a855f7' }}>Vibes</span>
            </span>
          </div>

          {/* URL badge con indicador online */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.22)',
              borderRadius: '24px',
              padding: '7px 18px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34,197,94,0.65)',
              }}
            />
            <span style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: '600' }}>
              kodingvibes.com
            </span>
          </div>
        </div>

        {/* ─── MAIN CONTENT (centrado verticalmente) ─── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 90px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Pill tag – contexto de comunidad */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '30px',
              padding: '8px 22px',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#6366f1',
                boxShadow: '0 0 8px rgba(99,102,241,0.7)',
              }}
            />
            <span
              style={{
                color: '#a5b4fc',
                fontSize: '14px',
                fontWeight: '700',
                letterSpacing: '0.12em',
              }}
            >
              COMUNIDAD DE DESARROLLADORES
            </span>
          </div>

          {/* Título principal */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: '800',
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: '1.18',
              letterSpacing: '-0.03em',
              textShadow: '0 0 60px rgba(99,102,241,0.3), 0 2px 6px rgba(0,0,0,0.5)',
              maxWidth: '940px',
            }}
          >
            {title.length > 72 ? title.substring(0, 72) + '…' : title}
          </div>

          {/* Línea acento con glow */}
          <div
            style={{
              marginTop: '38px',
              width: '100px',
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)',
              borderRadius: '2px',
              boxShadow: '0 0 14px rgba(99,102,241,0.55), 0 0 36px rgba(99,102,241,0.2)',
            }}
          />

          {/* CTA persuasivo */}
          <div
            style={{
              marginTop: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '18px', fontWeight: '500' }}>
              Únete a la conversación
            </span>
            <span
              style={{
                color: '#a855f7',
                fontSize: '20px',
                fontWeight: '600',
                textShadow: '0 0 8px rgba(168,85,247,0.5)',
              }}
            >
              →
            </span>
          </div>
        </div>

        {/* ─── BOTTOM ACCENT BAR ─── */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '5px',
            background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 30%, #e94560 60%, #a855f7 85%, #6366f1 100%)',
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
