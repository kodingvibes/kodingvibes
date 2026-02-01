'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function MobileCreateButton() {
  return (
    <Link
      href="/submit"
      className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 z-[100]"
      aria-label="Crear post"
    >
      <Plus className="h-7 w-7" strokeWidth={3} />
    </Link>
  )
}
