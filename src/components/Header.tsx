'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Plus, Sun, Moon, LogOut, User as UserIcon, Settings, Hash, Crown, Gamepad2, Menu, X, FileText } from 'lucide-react'
import { useTheme } from '@/providers/theme-provider'
import { LogoFull } from '@/components/icons/Logo'
import { NotificationBell } from '@/components/NotificationBell'

interface ChannelInfo {
  id: string
  name: string
  slug: string
  color: string | null
  role: string
  banner_url: string | null
  icon_url: string | null
}

interface GroupMembership {
  role: string
  groups: {
    id: string
    name: string
    slug: string
    color: string | null
    banner_url: string | null
    icon_url: string | null
  } | null
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userChannels, setUserChannels] = useState<ChannelInfo[]>([])
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        
        setIsAdmin(userData?.is_admin || false)

        const { data: memberships } = await supabase
          .from('group_members')
          .select(`
            role,
            groups (
              id,
              name,
              slug,
              color,
              banner_url,
              icon_url
            )
          `)
          .eq('user_id', user.id)
          .in('role', ['owner', 'admin', 'moderator', 'mod'])

        if (memberships) {
          const channels: ChannelInfo[] = memberships
            .filter((m: GroupMembership) => m.groups)
            .map((m: GroupMembership) => ({
              id: m.groups!.id,
              name: m.groups!.name,
              slug: m.groups!.slug,
              color: m.groups!.color,
              role: m.role,
              banner_url: m.groups!.banner_url,
              icon_url: m.groups!.icon_url
            }))
          setUserChannels(channels)
        }
      }
      
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setIsAdmin(false)
        setUserChannels([])
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogin = async () => {
    // Always use NEXT_PUBLIC_SITE_URL for production, fallback to window.location.origin only for local dev
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const redirectTo = `${baseUrl}/auth/callback`
    
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
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Logo */}
              <Link href="/" className="flex items-center group">
                <LogoFull className="text-foreground transition-transform group-hover:scale-105" />
              </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/groups"
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors text-sm font-medium text-foreground"
                >
                  <Hash className="h-4 w-4" />
                  Canales
                </Link>
                <Link
                  href="/card-game"
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors text-sm font-medium text-foreground"
                >
                  <Gamepad2 className="h-4 w-4" />
                  NetRun
                </Link>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                suppressHydrationWarning
              >
                {mounted && (
                  <>
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Moon className="h-5 w-5 text-slate-600" />
                    )}
                  </>
                )}
              </button>

              {/* Notification Bell - Only for logged in users */}
              {user && <NotificationBell />}

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

              {/* User Section - Hidden on mobile, shown in hamburger menu */}
              {loading ? (
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full hidden md:block" />
              ) : user ? (
                <div className="relative hidden md:block" ref={userMenuRef}>
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
                    <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg py-2 animate-fade-in max-h-[80vh] overflow-y-auto">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Haz click en &quot;Mi perfil&quot; para poner tu pseudónimo
                        </p>
                      </div>
                      
                      {/* User Channels Section */}
                      {userChannels.length > 0 && (
                        <div className="py-2">
                          <p className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Mis Canales
                          </p>
                          {userChannels.map((channel) => (
                            <Link
                              key={channel.id}
                              href={`/group/${channel.slug}`}
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: channel.color || '#6366f1' }}
                              >
                                {channel.name[0].toUpperCase()}
                              </div>
                              <span className="flex-1 truncate">{channel.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {channel.role === 'owner' ? 'Owner' : channel.role === 'admin' ? 'Admin' : 'Mod'}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}

                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Mi perfil</span>
                      </Link>
                      <Link
                        href="/drafts"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Mis borradores</span>
                      </Link>
                      {/* Admin Link */}
                      {isAdmin && (
                        <Link
                          href="/admin/group-requests"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <Crown className="h-4 w-4 text-yellow-500" />
                          <span>Admin: Solicitudes</span>
                        </Link>
                      )}
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        ref={mobileMenuRef}
        className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-[101] transform transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 h-16 border-b border-border">
            <LogoFull className="text-foreground" />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Navigation Links */}
            <div className="px-4 space-y-1">
              <Link
                href="/groups"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <Hash className="h-5 w-5" />
                <span className="font-medium">Canales</span>
              </Link>
              <Link
                href="/card-game"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <Gamepad2 className="h-5 w-5" />
                <span className="font-medium">NetRun</span>
              </Link>
            </div>

            {user && userChannels.length > 0 && (
              <div className="mt-6 px-4">
                <p className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Mis Canales
                </p>
                <div className="space-y-2">
                  {userChannels.map((channel) => (
                    <Link
                      key={channel.id}
                      href={`/group/${channel.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="relative flex items-center gap-3 px-4 py-3 rounded-lg overflow-hidden group"
                      style={{
                        backgroundImage: channel.banner_url 
                          ? `url(${channel.banner_url})` 
                          : undefined,
                        backgroundColor: !channel.banner_url ? (channel.color || '#6366f1') : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"
                      />
                      {channel.icon_url ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-background/20">
                          <img
                            src={channel.icon_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: channel.color || '#6366f1' }}
                        >
                          {channel.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="relative flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{channel.name}</p>
                        <p className="text-xs text-white/70 capitalize">
                          {channel.role === 'owner' ? 'Owner' : channel.role === 'admin' ? 'Admin' : 'Mod'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* User Section in Mobile Menu */}
            {user && (
              <div className="mt-6 px-4 border-t border-border pt-6">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{user.email}</p>
                    <p className="text-sm text-muted-foreground">Miembro</p>
                  </div>
                </div>
                
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Mi perfil</span>
                </Link>
                
                {isAdmin && (
                  <Link
                    href="/admin/group-requests"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                  >
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Admin: Solicitudes</span>
                  </Link>
                )}
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Create Post Button - Floating */}
      {user && (
        <Link
          href="/submit"
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 z-[100]"
          aria-label="Crear post"
        >
          <Plus className="h-7 w-7" strokeWidth={3} />
        </Link>
      )}
    </>
  )
}
