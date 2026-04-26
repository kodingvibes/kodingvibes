import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";
import Script from "next/script";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "KodingVibes - Comunidad de Desarrolladores",
    template: "%s | KodingVibes",
  },
  description: "Una comunidad estilo Reddit para compartir conocimiento, código y experiencias de desarrollo en español. Únete para compartir prompts, workflows y herramientas de IA.",
  keywords: ["desarrolladores", "comunidad", "programación", "código", "AI", "prompts", "workflows", "herramientas", "desarrollo", "software", "español"],
  authors: [{ name: "KodingVibes" }],
  creator: "KodingVibes",
  publisher: "KodingVibes",
  metadataBase: new URL("https://www.kodingvibes.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://www.kodingvibes.com",
    siteName: "KodingVibes",
    title: "KodingVibes - Comunidad de Desarrolladores",
    description: "Una comunidad estilo Reddit para compartir conocimiento, código y experiencias de desarrollo en español.",
    images: [
      {
        url: "/api/og?v=3",
        width: 1200,
        height: 630,
        alt: "KodingVibes - Comunidad de Desarrolladores",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KodingVibes - Comunidad de Desarrolladores",
    description: "Una comunidad estilo Reddit para compartir conocimiento, código y experiencias de desarrollo en español.",
    images: ["/api/og?v=3"],
    creator: "@kodingvibes",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KodingVibes",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification code
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#a855f7" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={plusJakartaSans.variable} suppressHydrationWarning>
      <head>
        <Script
          id="sw-register"
          strategy="lazyOnload"
          src="/register-sw.js"
        />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <ClientLayout>
          {children}
        </ClientLayout>
        <PushNotificationPrompt />
        <Analytics />
      </body>
    </html>
  );
}
