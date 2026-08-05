import { LOCALES, isLocale } from '@/lib/i18n/locales'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function RepoPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="label">Repositori</p>
      <p className="mt-4 font-mono text-sm text-faded">M2 — graph belum dipasang.</p>
    </main>
  )
}
