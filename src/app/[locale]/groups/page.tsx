import { createClient } from '@/lib/supabase/server'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { Hash, Plus, Users, Globe, Lock } from 'lucide-react'
import GroupCard, { type GroupWithMembership } from '@/components/GroupCard'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

type Group = Tables<'groups'>

type MembershipRow = { group_id: string; role: string }

type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Rendered on the server so the channel list exists in the initial response.
 * As a client component this page bailed out to client-side rendering and
 * shipped an empty body to anything that does not run React.
 */
export default async function GroupsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: groupsData } = await supabase
    .from('groups')
    .select('*')
    .eq('is_active', true)
    .order('post_count', { ascending: false })

  const groups = (groupsData ?? []) as Group[]

  let myGroups: GroupWithMembership[] = []
  let visibleGroups: GroupWithMembership[] = groups

  if (user) {
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', user.id)

    const membershipMap = new Map(
      ((memberships ?? []) as MembershipRow[]).map((m) => [m.group_id, m.role])
    )

    visibleGroups = groups.map((group) => ({
      ...group,
      is_member: membershipMap.has(group.id),
      member_role: membershipMap.get(group.id),
    }))

    myGroups = visibleGroups.filter((group) => group.is_member)
  }

  const publicGroups = visibleGroups.filter((group) => group.is_public)
  const privateGroups = visibleGroups.filter((group) => !group.is_public)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Hash className="h-8 w-8 text-primary" />
              Canales
            </h1>
            <p className="text-muted-foreground mt-1">
              Únete a canales para compartir y descubrir contenido específico
            </p>
          </div>
          <Link
            href={`/${locale}/channels/create`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" />
            Solicitar nuevo canal
          </Link>
        </div>

        {/* My Groups Section */}
        {myGroups.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Mis Canales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map((group) => (
                <GroupCard key={group.id} group={group} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* Public Groups */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-500" />
            Canales Públicos
          </h2>
          {publicGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicGroups.map((group) => (
                <GroupCard key={group.id} group={group} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay canales públicos disponibles</p>
          )}
        </div>

        {/* Private Groups */}
        {privateGroups.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-500" />
              Canales Privados
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Los canales privados requieren unirse para ver su contenido
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {privateGroups.map((group) => (
                <GroupCard key={group.id} group={group} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
