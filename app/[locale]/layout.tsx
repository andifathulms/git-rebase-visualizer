import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site/SiteFooter'
import { LOCALES, isLocale } from '@/lib/i18n/locales'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound()
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter locale={params.locale} />
    </div>
  )
}
