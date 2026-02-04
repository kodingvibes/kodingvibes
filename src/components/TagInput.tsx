'use client'

import { useState } from 'react'
import { X, Tag } from 'lucide-react'

interface GroupTag {
  id: string
  name: string
  color: string
}

interface TagInputProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  groupTags?: GroupTag[]
}

export default function TagInput({ selectedTags, onChange, maxTags = 5, groupTags = [] }: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Convertir group tags al formato interno
  const groupTagsFormatted = groupTags.map(gt => ({
    value: gt.name.toLowerCase().replace(/\s+/g, '-'),
    label: gt.name,
    color: gt.color
  }))

  // Solo usar tags del grupo
  const filteredTags = groupTagsFormatted.filter(tag => 
    tag.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedTags.includes(tag.value)
  )

  const addTag = (tagValue: string) => {
    if (selectedTags.length < maxTags && !selectedTags.includes(tagValue)) {
      onChange([...selectedTags, tagValue])
    }
    setSearchQuery('')
  }

  const removeTag = (tagValue: string) => {
    onChange(selectedTags.filter(t => t !== tagValue))
  }

  const getTagLabel = (value: string) => {
    const groupTag = groupTagsFormatted.find(t => t.value === value)
    return groupTag?.label || value
  }

  const getTagColor = (value: string) => {
    const groupTag = groupTagsFormatted.find(t => t.value === value)
    return groupTag ? 'text-white dark:text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => {
            const groupTag = groupTagsFormatted.find(t => t.value === tag)
            
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                style={groupTag ? { backgroundColor: groupTag.color } : {}}
              >
                {getTagLabel(tag)}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Tag Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={selectedTags.length >= maxTags}
          className="w-full flex items-center gap-2 px-4 py-2.5 border border-input rounded-lg bg-background text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {selectedTags.length >= maxTags 
              ? `Máximo ${maxTags} tags` 
              : 'Agregar tags...'}
          </span>
        </button>

        {isOpen && selectedTags.length < maxTags && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
            {/* Search */}
            <div className="p-2 border-b border-border sticky top-0 bg-background">
              <input
                type="text"
                placeholder="Buscar tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            {/* Tags List */}
            <div className="p-1">
              {filteredTags.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  {groupTags.length === 0 
                    ? 'Este grupo no tiene tags configurados' 
                    : 'No se encontraron tags'}
                </div>
              ) : (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tags del Grupo
                  </div>
                  {filteredTags.map(tag => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => {
                        addTag(tag.value)
                        if (selectedTags.length + 1 >= maxTags) {
                          setIsOpen(false)
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-2"
                    >
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Selecciona hasta {maxTags} tags para categorizar tu post
      </p>
    </div>
  )
}
