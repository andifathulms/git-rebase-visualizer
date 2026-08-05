import type { Metadata } from 'next'
import { Archivo, Azeret_Mono, Source_Sans_3 } from 'next/font/google'
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
  title: 'Cangkok — simulator sejarah git',
  description:
    'Rebase tidak memindahkan commit; ia membuat commit baru dan meninggalkan yang asli di rak. Lihat sendiri, dengan hash content-addressed sungguhan.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${azeret.variable} ${archivo.variable} ${source.variable}`}>
      <body>{children}</body>
    </html>
  )
}
