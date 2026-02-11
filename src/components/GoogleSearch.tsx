'use client'

import { Search } from 'lucide-react'

export default function GoogleSearch() {
  return (
    <div className="bg-background border-b border-foreground/10">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <form
          action="https://www.google.com/search"
          method="GET"
          target="_blank"
          className="relative"
        >
          <input
            type="text"
            name="q"
            placeholder="Buscar en Google..."
            autoComplete="off"
            className="w-full pl-12 pr-4 py-3 rounded-full border border-foreground/20 bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-base"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/50" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>
    </div>
  )
}
