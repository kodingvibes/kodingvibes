import type { Metadata } from 'next'
import { Michroma } from 'next/font/google'
import './card-game.css'

const michroma = Michroma({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-michroma',
})

export const metadata: Metadata = {
  title: 'NetRun - Juego de Cartas Cyberpunk',
  description: 'NetRun: el juego de cartas cyberpunk de KodingVibes. Construye tu deck, hackea el sistema y domina la red.',
}

export default function CardGameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={michroma.variable}>{children}</div>
}
