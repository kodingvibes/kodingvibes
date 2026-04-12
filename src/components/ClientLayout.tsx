'use client'

import { ThemeProvider } from '@/providers/theme-provider'
import { Suspense } from 'react'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        {children}
      </Suspense>
    </ThemeProvider>
  )
}
