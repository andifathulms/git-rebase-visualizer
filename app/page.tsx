import { DEFAULT_LOCALE } from '@/lib/i18n/locales'

/**
 * `output: 'export'` has no server, so this cannot be a `redirect()` — it has to
 * be a real page that bounces the browser. The URL is relative so it resolves
 * correctly under any `basePath`, and the link keeps it usable without JS.
 */
export default function RootPage() {
  const target = `./${DEFAULT_LOCALE}/`
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <a className="text-catalogue underline" href={target}>
        Cangkok
      </a>
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(target)})` }} />
    </main>
  )
}
