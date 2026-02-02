'use client'

import { useState } from 'react'
import { X, Tag } from 'lucide-react'

// Tags predefinidos relacionados con desarrollo e IA
export const PREDEFINED_TAGS = [
  // Desarrollo
  { value: 'javascript', label: 'JavaScript', category: 'dev' },
  { value: 'typescript', label: 'TypeScript', category: 'dev' },
  { value: 'react', label: 'React', category: 'dev' },
  { value: 'nextjs', label: 'Next.js', category: 'dev' },
  { value: 'nodejs', label: 'Node.js', category: 'dev' },
  { value: 'python', label: 'Python', category: 'dev' },
  { value: 'rust', label: 'Rust', category: 'dev' },
  { value: 'golang', label: 'Go', category: 'dev' },
  { value: 'frontend', label: 'Frontend', category: 'dev' },
  { value: 'backend', label: 'Backend', category: 'dev' },
  { value: 'fullstack', label: 'Full Stack', category: 'dev' },
  { value: 'devops', label: 'DevOps', category: 'dev' },
  { value: 'database', label: 'Base de Datos', category: 'dev' },
  { value: 'api', label: 'API', category: 'dev' },
  { value: 'testing', label: 'Testing', category: 'dev' },
  { value: 'security', label: 'Seguridad', category: 'dev' },
  { value: 'performance', label: 'Performance', category: 'dev' },
  
  // Inteligencia Artificial
  { value: 'ai', label: 'Inteligencia Artificial', category: 'ai' },
  { value: 'machine-learning', label: 'Machine Learning', category: 'ai' },
  { value: 'deep-learning', label: 'Deep Learning', category: 'ai' },
  { value: 'llm', label: 'LLM', category: 'ai' },
  { value: 'chatgpt', label: 'ChatGPT', category: 'ai' },
  { value: 'claude', label: 'Claude', category: 'ai' },
  { value: 'cursor', label: 'Cursor', category: 'ai' },
  { value: 'copilot', label: 'GitHub Copilot', category: 'ai' },
  { value: 'prompt-engineering', label: 'Prompt Engineering', category: 'ai' },
  { value: 'agents', label: 'AI Agents', category: 'ai' },
  { value: 'openai', label: 'OpenAI', category: 'ai' },
  { value: 'anthropic', label: 'Anthropic', category: 'ai' },
  { value: 'huggingface', label: 'Hugging Face', category: 'ai' },
  { value: 'tensorflow', label: 'TensorFlow', category: 'ai' },
  { value: 'pytorch', label: 'PyTorch', category: 'ai' },
  { value: 'nlp', label: 'NLP', category: 'ai' },
  { value: 'computer-vision', label: 'Computer Vision', category: 'ai' },
  
  // Herramientas y Plataformas
  { value: 'vscode', label: 'VS Code', category: 'tools' },
  { value: 'docker', label: 'Docker', category: 'tools' },
  { value: 'kubernetes', label: 'Kubernetes', category: 'tools' },
  { value: 'aws', label: 'AWS', category: 'tools' },
  { value: 'vercel', label: 'Vercel', category: 'tools' },
  { value: 'supabase', label: 'Supabase', category: 'tools' },
  { value: 'git', label: 'Git', category: 'tools' },
  { value: 'github', label: 'GitHub', category: 'tools' },
  
  // Conceptos
  { value: 'tutorial', label: 'Tutorial', category: 'concept' },
  { value: 'beginner', label: 'Principiante', category: 'concept' },
  { value: 'advanced', label: 'Avanzado', category: 'concept' },
  { value: 'best-practices', label: 'Mejores Prácticas', category: 'concept' },
  { value: 'architecture', label: 'Arquitectura', category: 'concept' },
  { value: 'tips', label: 'Tips', category: 'concept' },
  { value: 'showcase', label: 'Showcase', category: 'concept' },
  { value: 'discussion', label: 'Discusión', category: 'concept' },
]

interface TagInputProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
}

export default function TagInput({ selectedTags, onChange, maxTags = 5 }: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTags = PREDEFINED_TAGS.filter(tag => 
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
    return PREDEFINED_TAGS.find(t => t.value === value)?.label || value
  }

  const getTagColor = (value: string) => {
    const tag = PREDEFINED_TAGS.find(t => t.value === value)
    switch (tag?.category) {
      case 'dev':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'ai':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'tools':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
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
          ))}
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
                  No se encontraron tags
                </div>
              ) : (
                <>
                  {/* Dev Tags */}
                  {filteredTags.some(t => t.category === 'dev') && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Desarrollo
                      </div>
                      {filteredTags.filter(t => t.category === 'dev').map(tag => (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => {
                            addTag(tag.value)
                            if (selectedTags.length + 1 >= maxTags) {
                              setIsOpen(false)
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* AI Tags */}
                  {filteredTags.some(t => t.category === 'ai') && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Inteligencia Artificial
                      </div>
                      {filteredTags.filter(t => t.category === 'ai').map(tag => (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => {
                            addTag(tag.value)
                            if (selectedTags.length + 1 >= maxTags) {
                              setIsOpen(false)
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Other Tags */}
                  {filteredTags.some(t => !['dev', 'ai'].includes(t.category)) && (
                    <div>
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Otros
                      </div>
                      {filteredTags.filter(t => !['dev', 'ai'].includes(t.category)).map(tag => (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => {
                            addTag(tag.value)
                            if (selectedTags.length + 1 >= maxTags) {
                              setIsOpen(false)
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
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
