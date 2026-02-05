'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Video, Users, X } from 'lucide-react'

interface EventFormProps {
  groupId: string
  groupSlug: string
  userId: string
  onClose: () => void
  onSuccess?: () => void
}

export default function EventForm({ groupId, userId, onClose, onSuccess }: EventFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'online' as 'online' | 'irl',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location: '',
    meeting_link: '',
    max_attendees: '',
    is_public: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validaciones
      if (!formData.title.trim()) {
        throw new Error('El título es requerido')
      }
      if (!formData.start_date || !formData.start_time) {
        throw new Error('La fecha y hora de inicio son requeridas')
      }

      // Construir fechas
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
      let endDateTime = null
      if (formData.end_date && formData.end_time) {
        endDateTime = new Date(`${formData.end_date}T${formData.end_time}`)
      }

      // Validar que end_date sea después de start_date
      if (endDateTime && endDateTime <= startDateTime) {
        throw new Error('La fecha de fin debe ser después de la fecha de inicio')
      }

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          group_id: groupId,
          created_by: userId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          event_type: formData.event_type,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime?.toISOString() || null,
          location: formData.event_type === 'irl' ? formData.location.trim() || null : null,
          meeting_link: formData.event_type === 'online' ? formData.meeting_link.trim() || null : null,
          max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
          is_public: formData.is_public,
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Crear Nuevo Evento</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Título del evento *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Workshop de Prompt Engineering"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el evento, agenda, requisitos..."
              rows={3}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Tipo de evento */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Tipo de evento *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, event_type: 'online' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  formData.event_type === 'online'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-border hover:bg-muted/80'
                }`}
              >
                <Video className="h-4 w-4" />
                Online
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, event_type: 'irl' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  formData.event_type === 'irl'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-border hover:bg-muted/80'
                }`}
              >
                <MapPin className="h-4 w-4" />
                Presencial
              </button>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Fecha de inicio *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Hora de inicio *
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Fecha de fin (opcional)
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Hora de fin (opcional)
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Campos específicos por tipo */}
          {formData.event_type === 'online' ? (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Link de la reunión (Zoom, Meet, etc.)
              </label>
              <input
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Ubicación
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Dirección o lugar del evento"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Máximo de asistentes */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Máximo de asistentes (opcional)
            </label>
            <input
              type="number"
              min="1"
              value={formData.max_attendees}
              onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
              placeholder="Sin límite"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Visibilidad */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="is_public" className="text-sm">
              Evento público (visible para no miembros)
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
