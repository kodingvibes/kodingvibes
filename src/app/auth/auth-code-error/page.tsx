'use client'

import { Suspense } from 'react'
import AuthErrorContent from './AuthErrorContent'

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="h-8 w-8 bg-red-300 dark:bg-red-700 rounded-full" />
          </div>
          <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-2" />
          <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
        </div>
      </main>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
