import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          borderRadius: '8px',
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 40 40"
          fill="none"
          style={{ margin: '2px' }}
        >
          {/* Outer circle - same as Logo.tsx */}
          <circle
            cx="20"
            cy="20"
            r="18"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Left bracket - same as Logo.tsx */}
          <path
            d="M14 14L10 20L14 26"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Right bracket - same as Logo.tsx */}
          <path
            d="M26 14L30 20L26 26"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Middle slash - same as Logo.tsx */}
          <path
            d="M18 28L22 12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
