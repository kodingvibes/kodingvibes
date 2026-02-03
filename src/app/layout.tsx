import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";
import Script from "next/script";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";

export const metadata: Metadata = {
  title: "KodingVibes - Comunidad de Desarrolladores",
  description: "Una comunidad estilo Reddit para compartir conocimiento, código y experiencias de desarrollo.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KodingVibes",
  },
  icons: {
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registrado:', registration.scope);
                      
                      // Escuchar mensajes del Service Worker
                      navigator.serviceWorker.addEventListener('message', function(event) {
                        if (event.data && event.data.type === 'PUSH_RECEIVED') {
                          console.log('Push notification received:', event.data);
                        }
                      });
                    },
                    function(err) {
                      console.log('SW falló:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <ClientLayout>
          {children}
        </ClientLayout>
        <PushNotificationPrompt />
      </body>
    </html>
  );
}
