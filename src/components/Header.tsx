'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Plus, Sun, Moon, LogOut, User as UserIcon, Settings } from 'lucide-react'
import { useTheme } from '@/providers/theme-provider'
import { LogoFull } from '@/components/icons/Logo'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogin = async () => {
    const redirectTo = typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    setIsMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <LogoFull className="text-foreground transition-transform group-hover:scale-105" />
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-600" />
                )}
              </button>

              {/* Create Post Button - Desktop only */}
              {user && (
                <Link
                  href="/submit"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear post</span>
                </Link>
              )}

              {/* User Section */}
              {loading ? (
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-2 animate-fade-in">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Haz click en &quot;Mi perfil&quot; para poner tu pseudónimo
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Mi perfil</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Iniciar sesión</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Create Post Button - Outside header for proper positioning */}
      {user && (
        <Link
          href="/submit"
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 z-[100]"
          aria-label="Crear post"
        >
          <Plus className="h-7 w-7" strokeWidth={3} />
        </Link>
      )}
    </>
  )
}
