'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { User, Save, ArrowLeft, AtSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  id: string
  email: string
  name: string | null
  username: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const [, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const generateUsername = useCallback((email: string): string => {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    const random = Math.floor(Math.random() * 10000)
    return `${base}${random}`.substring(0, 20)
  }, [])

  const createProfile = useCallback(async (id: string, email: string) => {
    const newUsername = generateUsername(email)
    const newName = email.split('@')[0]

    const { data, error: insertError } = await supabase
      .from('users')
      .insert({
        id,
        email,
        name: newName,
        username: newUsername,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating profile:', insertError)
      setError('No se pudo crear el perfil automáticamente')
    } else if (data) {
      setProfile(data)
      setUsername(data.username || '')
      setName(data.name || '')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }, [supabase, generateUsername])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/')
          return
        }

        setUserId(user.id)
        setUserEmail(user.email || '')

        // Intentar cargar el perfil
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) {
          console.error('Error loading profile:', fetchError)
          setError('Error al cargar el perfil')
        } else if (data) {
          // Perfil existe
          setProfile(data)
          setUsername(data.username || '')
          setName(data.name || '')
        } else {
          // Perfil no existe, crearlo automáticamente
          console.log('Profile not found, creating...')
          await createProfile(user.id, user.email || '')
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Error inesperado al cargar el perfil')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, supabase, createProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    if (!userId) return

    // Validate username format
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('El username debe tener entre 3 y 20 caracteres, solo letras, números y guiones bajos')
      setSaving(false)
      return
    }

    // Check if username is already taken (only if username is being changed)
    if (username) {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId) // Exclude current user
        .maybeSingle()

      if (checkError) {
        console.error('Error checking username:', checkError)
        setError('Error al verificar disponibilidad del username')
        setSaving(false)
        return
      }

      if (existingUser) {
        setError(`El username "${username}" ya está en uso. Por favor elige otro.`)
        setSaving(false)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        username: username || null,
        name: name || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('Este username ya está en uso')
      } else {
        setError('Error al guardar los cambios')
        console.error('Update error:', updateError)
      }
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tu Perfil</h1>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
            Perfil actualizado correctamente
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                <span>Pseudónimo (Username)</span>
              </div>
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="tu_username"
              className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Entre 3 y 20 caracteres. Solo letras, números y guiones bajos.
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link
              href="/"
              className="px-6 py-2.5 border border-border rounded-full text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !userId}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        <div className="mt-6 bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">¿Cómo te verán otros usuarios?</p>
          <p>
            Tu pseudónimo (username) se mostrará en tus posts y comentarios. 
            Si no tienes uno, se usará tu nombre o email.
          </p>
        </div>
      </div>
    </main>
  )
}
