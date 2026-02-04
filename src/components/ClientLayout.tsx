'use client'

import { ThemeProvider } from '@/providers/theme-provider'
import Header from '@/components/Header'
import { Suspense } from 'react'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Header />
        {children}
      </Suspense>
    </ThemeProvider>
  )
}
