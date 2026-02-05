import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/** Convierte un color hex (#RRGGBB) a rgba(). Retorna indigo como fallback si el formato no es válido. */
function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return `rgba(99,102,241,${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Imagen mínima que siempre es válida para PNG — se usa como fallback en errores. */
function fallbackImage() {
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, backgroundColor: '#0a0a0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', fontFamily: 'sans-serif' }}>KodingVibes</span>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get post ID and title from query params
    const postId = searchParams.get('id');
    let title = searchParams.get('title') || 'KodingVibes';
    let imageUrl = searchParams.get('image') || null;
    let groupName: string | null = null;
    let groupColor: string | null = null;

    // If we have a post ID, try to fetch the post data from Supabase
    if (postId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          };

          const response = await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${postId}&select=title,image_url,group_id&is_deleted=eq.false`, { headers });

          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              if (data[0].title && title === 'KodingVibes') {
                title = data[0].title;
              }
              if (data[0].image_url && !imageUrl) {
                imageUrl = data[0].image_url;
              }
              // Fetch group name and color if the post belongs to a group
              if (data[0].group_id) {
                const groupResponse = await fetch(`${supabaseUrl}/rest/v1/groups?id=eq.${data[0].group_id}&select=name,color`, { headers });
                if (groupResponse.ok) {
                  const groupData = await groupResponse.json();
                  if (groupData && groupData.length > 0) {
                    groupName = groupData[0].name;
                    groupColor = groupData[0].color;
                  }
                }
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

    // Fetch image and convert to base64 data URL for reliable Satori rendering
    let imageData: string | null = null;
    if (imageUrl) {
      try {
        const imgResponse = await fetch(imageUrl);
        if (imgResponse.ok) {
          // Strip parameters (e.g. "; charset=utf-8") so the data URL stays well-formed
          const contentType = (imgResponse.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();

          // Only embed raster formats that Satori's rasterizer can decode
          const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (supported.includes(contentType)) {
            const buffer = await imgResponse.arrayBuffer();
            if (buffer.byteLength <= 4 * 1024 * 1024) {
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.length; i += 8192) {
                binary += String.fromCharCode(...bytes.slice(i, Math.min(i + 8192, bytes.length)));
              }
              imageData = `data:${contentType};base64,${btoa(binary)}`;
            }
          }
        }
      } catch (_e) {
        // Image fetch failed – render without image
      }
    }

    // Validate groupColor is usable before passing to the renderer
    const safeGroupColor = (groupColor && /^#[0-9a-fA-F]{6}$/.test(groupColor)) ? groupColor : null;

    // Generate the image
    const ogImage = (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0e',
          position: 'relative',
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
              }}
            />
            <span style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: '600' }}>
              kodingvibes.com
            </span>
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        {imageData ? (
          /* Layout split: imagen izquierda, texto derecha */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0 56px',
              gap: '52px',
            }}
          >
            {/* Imagen del post */}
            <div
              style={{
                width: '440px',
                height: '340px',
                flexShrink: 0,
                display: 'flex',
                borderRadius: '20px',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <img
                src={imageData}
                style={{
                  width: '440px',
                  height: '340px',
                }}
              />
              {/* Gradiente inferior para blend con fondo oscuro */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  height: '153px',
                  background: 'linear-gradient(180deg, transparent, rgba(10,10,14,0.55))',
                }}
              />
            </div>

            {/* Contenido textual */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}
            >
              {/* Pill tag – nombre del canal/grupo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: safeGroupColor ? hexToRgba(safeGroupColor, 0.1) : 'rgba(99,102,241,0.08)',
                  border: `1px solid ${safeGroupColor ? hexToRgba(safeGroupColor, 0.25) : 'rgba(99,102,241,0.2)'}`,
                  borderRadius: '30px',
                  padding: '8px 22px',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: safeGroupColor || '#6366f1',
                  }}
                />
                <span
                  style={{
                    color: safeGroupColor || '#a5b4fc',
                    fontSize: '14px',
                    fontWeight: '700',
                    letterSpacing: '0.12em',
                  }}
                >
                  {(groupName || 'KodingVibes').toUpperCase()}
                </span>
              </div>

              {/* Título */}
              <div
                style={{
                  fontSize: '46px',
                  fontWeight: '800',
                  color: '#ffffff',
                  textAlign: 'left',
                  lineHeight: '1.2',
                  letterSpacing: '-0.03em',
                }}
              >
                {title.length > 62 ? title.substring(0, 62) + '...' : title}
              </div>

              {/* Línea acento */}
              <div
                style={{
                  marginTop: '28px',
                  width: '80px',
                  height: '3px',
                  background: 'linear-gradient(90deg, #6366f1, #a855f7, transparent)',
                  borderRadius: '2px',
                }}
              />

              {/* CTA persuasivo */}
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: '18px', fontWeight: '500' }}>
                  Unete a la conversacion &gt;&gt;
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Layout centrado: sin imagen */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 90px',
            }}
          >
            {/* Pill tag – nombre del canal/grupo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: safeGroupColor ? hexToRgba(safeGroupColor, 0.1) : 'rgba(99,102,241,0.08)',
                border: `1px solid ${safeGroupColor ? hexToRgba(safeGroupColor, 0.25) : 'rgba(99,102,241,0.2)'}`,
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
                  background: safeGroupColor || '#6366f1',
                }}
              />
              <span
                style={{
                  color: safeGroupColor || '#a5b4fc',
                  fontSize: '14px',
                  fontWeight: '700',
                  letterSpacing: '0.12em',
                }}
              >
                {(groupName || 'KodingVibes').toUpperCase()}
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
                maxWidth: '940px',
              }}
            >
              {title.length > 72 ? title.substring(0, 72) + '...' : title}
            </div>

            {/* Línea acento */}
            <div
              style={{
                marginTop: '38px',
                width: '100px',
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)',
                borderRadius: '2px',
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
                Unete a la conversacion &gt;&gt;
              </span>
            </div>
          </div>
        )}

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

    return new ImageResponse(ogImage, {
      width: 1200,
      height: 630,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    console.error('Error generating OG image:', e);
    return fallbackImage();
  }
}
