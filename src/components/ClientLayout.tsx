'use client'

import { ThemeProvider } from '@/providers/theme-provider'

/**
 * No <Suspense> here on purpose.
 *
 * Wrapping {children} in a Suspense boundary makes Next.js stream the whole
 * page into a `<div hidden>` placeholder that only an inline script reveals
 * (`$RC("B:n","S:n")`). Clients that never execute JavaScript — text-mode
 * browsers, crawlers, users with JS disabled — are left with the fallback
 * instead of the page, which is why the served document reduced to an empty
 * `<div class="min-h-screen bg-background"></div>`.
 *
 * Components that genuinely need useSearchParams()/usePathname() now read the
 * query string client-side instead, so the rest of the page renders straight
 * into the document.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
