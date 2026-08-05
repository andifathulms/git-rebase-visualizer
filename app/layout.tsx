import type { Metadata } from 'next'
import { Archivo, Azeret_Mono, Source_Sans_3 } from 'next/font/google'
import { DEFAULT_LOCALE } from '@/lib/i18n/locales'
import './globals.css'

const azeret = Azeret_Mono({
  subsets: ['latin'],
  variable: '--font-azeret',
  display: 'swap',
})

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

const source = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Git Rebase Simulator — see what rebase actually does',
  description:
    'Rebase does not move commits; it creates new ones and leaves the originals on the shelf. See it for yourself, with real content-addressed hashes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${azeret.variable} ${archivo.variable} ${source.variable}`}>
      <body>{children}</body>
    </html>
  )
}
