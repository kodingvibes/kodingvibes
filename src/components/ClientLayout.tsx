'use client'

import { ThemeProvider } from '@/providers/theme-provider'
import Header from '@/components/Header'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Header />
      {children}
    </ThemeProvider>
  )
}
