import Image from 'next/image'
import Link from 'next/link'
import { Users, Lock, Globe, Home, ArrowRight } from 'lucide-react'
import GroupJoinButton from '@/components/GroupJoinButton'
import type { Tables } from '@/types/database'

export type Group = Tables<'groups'>

export interface GroupWithMembership extends Group {
  is_member?: boolean
  member_role?: string
}

/**
 * Presentational channel card. Deliberately a Server Component: the whole card
 * (banner, name, counts, description and the link to the channel) is part of
 * the initial HTML, so terminal browsers and clients without JavaScript can
 * still list and reach every channel. Only the join/leave button is a client
 * component.
 */
export default function GroupCard({
  group,
  locale,
}: {
  group: GroupWithMembership
  locale: string
}) {
  const isMember = Boolean(group.is_member)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col">
      {/* Banner - positioned at top of card */}
      <div className="relative h-20 overflow-hidden flex-shrink-0">
        {group.banner_url ? (
          <Image
            src={group.banner_url}
            alt={`Banner de ${group.name}`}
            fill
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: group.color || '#6366f1' }}
          />
        )}
        {group.banner_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Header row with icon overlapping banner */}
        <div className="flex items-start justify-between -mt-8 mb-3 relative z-10">
          <div className="flex items-center gap-3">
            {/* Icon - positioned to overlap banner */}
            {group.icon_url ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-card bg-card flex-shrink-0">
                <Image
                  src={group.icon_url}
                  alt={`Icono de ${group.name}`}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-2xl ring-2 ring-card flex-shrink-0"
                style={{ backgroundColor: group.color || '#6366f1' }}
              >
                {group.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  <Link href={`/${locale}/channel/${group.slug}`} className="hover:underline">
                    {group.name}
                  </Link>
                </h3>
                {group.is_default && (
                  <span className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded text-xs font-medium">
                    <Home className="h-3 w-3" />
                    Principal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {group.member_count}
                </span>
                <span>•</span>
                <span>{group.post_count} posts</span>
              </div>
            </div>
          </div>
          {group.is_public ? (
            <Globe className="h-4 w-4 text-green-500" />
          ) : (
            <Lock className="h-4 w-4 text-orange-500" />
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {group.description || 'Sin descripción'}
        </p>

        <div className="flex items-center gap-2 mt-auto pt-4">
          <Link
            href={`/${locale}/channel/${group.slug}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-colors text-sm"
          >
            Ver canal
            <ArrowRight className="h-4 w-4" />
          </Link>

          <GroupJoinButton
            groupId={group.id}
            groupName={group.name}
            isMember={isMember}
            isDefault={group.is_default}
          />
        </div>
      </div>
    </div>
  )
}
