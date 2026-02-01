'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function AuthCodeErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'no-code':
        return 'No se recibió el código de autorización de Google.'
      case 'unexpected':
        return 'Ocurrió un error inesperado durante la autenticación.'
      default:
        return errorCode || 'Ocurrió un error durante la autenticación.'
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Error de autenticación
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {getErrorMessage(error)}
        </p>
        
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          
          <div className="text-sm text-muted-foreground pt-4 border-t border-border">
            <p className="mb-2">Posibles causas:</p>
            <ul className="text-left space-y-1 text-xs">
              <li>• Google OAuth no está habilitado en Supabase</li>
              <li>• Las URLs de redirección no coinciden</li>
              <li>• Las credenciales de Google Cloud son incorrectas</li>
              <li>• El proveedor está en modo "Testing" sin tu email agregado</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
