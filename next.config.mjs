import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/card-game',
        destination: 'https://netrun.kodingvibes.com',
        permanent: true,
      },
      {
        source: '/card-game/:path*',
        destination: 'https://netrun.kodingvibes.com/:path*',
        permanent: true,
      },
      {
        source: '/:locale(es|en|de|fr|it|pt|ru|zh|ja)/card-game',
        destination: 'https://netrun.kodingvibes.com',
        permanent: true,
      },
      {
        source: '/:locale(es|en|de|fr|it|pt|ru|zh|ja)/card-game/:path*',
        destination: 'https://netrun.kodingvibes.com/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.supabase.co https://*.googleusercontent.com data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.google.com; upgrade-insecure-requests;",
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
