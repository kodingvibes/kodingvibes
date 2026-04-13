'use client'

import Link from 'next/link'
import { Calendar, MapPin, Video, Users } from 'lucide-react'
import type { Tables } from '@/types/database'

type Event = Tables<'events'> & {
  users?: { name: string | null; username: string | null } | null
  attendee_count?: number
}

interface EventCardProps {
  event: Event
  groupSlug: string
}

export default function EventCard({ event, groupSlug }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'Próximo'
      case 'ongoing':
        return 'En curso'
      case 'completed':
        return 'Finalizado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
              {getStatusText(event.status)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              event.event_type === 'online' 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
            }`}>
              {event.event_type === 'online' ? 'Online' : 'Presencial'}
            </span>
          </div>

          <Link 
            href={`/channel/${groupSlug}/event/${event.id}`}
            className="block"
          >
            <h3 className="font-semibold text-foreground text-lg mb-1 hover:text-primary transition-colors line-clamp-2">
              {event.title}
            </h3>
          </Link>

          {event.description && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.start_date)}</span>
              {event.end_date && (
                <span className="text-muted-foreground/60">
                  - {formatDate(event.end_date)}
                </span>
              )}
            </div>

            {event.event_type === 'online' && event.meeting_link && (
              <div className="flex items-center gap-1.5">
                <Video className="h-4 w-4" />
                <span>Meeting online</span>
              </div>
            )}

            {event.event_type === 'irl' && event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{event.location}</span>
              </div>
            )}

            {typeof event.attendee_count === 'number' && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{event.attendee_count} asistente{event.attendee_count !== 1 ? 's' : ''}</span>
                {event.max_attendees && (
                  <span className="text-muted-foreground/60">
                    / {event.max_attendees} max
                  </span>
                )}
              </div>
            )}
          </div>

          {event.users && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Organizado por{' '}
                <span className="font-medium text-foreground">
                  @{event.users.username || 'usuario'}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
