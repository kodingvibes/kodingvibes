'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownContentProps {
  content: string
  className?: string
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert prose-slate max-w-none overflow-hidden ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Personalizar enlaces para que se abran en nueva pestaña
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),

          // Personalizar código con syntax highlighting
          code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
            const match = /language-(\w+)/.exec(className || '')
            
            // Si tiene language-*, es un bloque de código
            if (match) {
              const language = match[1]
              return (
                <span className="block my-4 rounded-lg overflow-hidden border border-border">
                  <span className="block bg-muted/80 px-4 py-2 text-xs text-muted-foreground border-b border-border">
                    {language}
                  </span>
                  <SyntaxHighlighter
                    {...props}
                    style={oneDark}
                    language={language}
                    PreTag="span"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0 0 0.5rem 0.5rem',
                      padding: '1rem',
                      display: 'block',
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </span>
              )
            }
            
            // Sin language-* es código inline
            // Eliminar backticks del contenido si existen
            const cleanContent = String(children).replace(/^`|`$/g, '')
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono border border-border text-primary" {...props}>
                {cleanContent}
              </code>
            )
          },

          // Personalizar listas
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside my-2 space-y-1 marker:text-muted-foreground" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal list-inside my-2 space-y-1 marker:text-muted-foreground" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="ml-4" {...props} />
          ),

          // Personalizar citas
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4 bg-muted/30 py-2 pr-2 rounded-r" {...props} />
          ),

          // Personalizar tablas con líneas visibles
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-border">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-muted border-b-2 border-border" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="border border-border px-4 py-3 text-left font-semibold text-foreground" {...props} />
          ),
          tbody: ({ ...props }) => (
            <tbody className="divide-y divide-border" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="border-b border-border hover:bg-muted/50 transition-colors" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border border-border px-4 py-3" {...props} />
          ),

          // Personalizar encabezados
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground border-b border-border pb-2" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-semibold mt-5 mb-3 text-foreground" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-medium mt-4 mb-2 text-foreground" {...props} />
          ),

          // Personalizar párrafos
          p: ({ ...props }) => (
            <p className="mb-3 leading-relaxed" {...props} />
          ),

          // Personalizar líneas horizontales
          hr: ({ ...props }) => (
            <hr className="my-6 border-border" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
