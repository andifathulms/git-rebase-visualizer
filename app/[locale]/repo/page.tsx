import { notFound } from 'next/navigation'
import { Workbench } from '@/components/repo/Workbench'
import { LOCALES, isLocale } from '@/lib/i18n/locales'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function RepoPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  return <Workbench />
}
