import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NetRun - Juego de Cartas Cyberpunk',
  description: 'NetRun: el juego de cartas cyberpunk de KodingVibes. Construye tu deck, hackea el sistema y domina la red.',
}

export default function CardGameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
