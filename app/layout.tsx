import type { Metadata, Viewport } from 'next'
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

/**
 * `metadataBase` is what turns the file-convention `opengraph-image.png` into
 * the absolute URL a link preview needs — a relative one is silently dropped by
 * every social crawler.
 *
 * It must be the **origin only**. Next already prefixes the image path with
 * `basePath`, so folding the basePath in here too produces
 * `…/git-rebase-visualizer/git-rebase-visualizer/opengraph-image.png`, which
 * 404s and shows no preview at all. Both values come from the same env var
 * `next.config.js` reads, so a rename of the repository moves them together.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://andifathulms.github.io'
const siteUrl = basePath ? `${origin}${basePath}/` : 'http://localhost:3000/'

const TITLE = 'Git Rebase Simulator — see what rebase actually does'
const DESCRIPTION =
  'Rebase does not move commits; it creates new ones and leaves the originals on the shelf. See it for yourself, with real content-addressed hashes.'

export const metadata: Metadata = {
  metadataBase: new URL(basePath ? origin : siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Git Rebase Simulator',
  // Next does not apply basePath to the manifest link, so it points at the site
  // root and 404s under Pages unless it is spelled out here.
  manifest: `${basePath}/manifest.webmanifest`,
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Git Rebase Simulator',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: 'Rebase Sim',
    // The mark is a dark tile, so the status bar should read as part of it.
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  // The brand tile's ink, so the browser chrome continues the icon.
  themeColor: '#1E1D19',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${azeret.variable} ${archivo.variable} ${source.variable}`}>
      <body>{children}</body>
    </html>
  )
}
