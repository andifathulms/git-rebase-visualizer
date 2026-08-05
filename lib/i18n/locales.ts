/**
 * PRD §9 writes the copy Indonesian-first; English is the default *route* so
 * the project is legible to whoever lands on it cold. Git's own vocabulary
 * stays English in both, so what is learned here transfers to real git and to
 * real documentation.
 */
export const LOCALES = ['en', 'id'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}
