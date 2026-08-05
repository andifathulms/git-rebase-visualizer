/**
 * A string the engine produces in both interface languages.
 *
 * PRD §9 asks for Indonesian-first copy with English secondary, and git's own
 * vocabulary left in English throughout. There are exactly two locales, so both
 * are written at the site that raises the message rather than behind a key
 * registry: a key table would let the identifier and the text drift apart, and
 * these messages explain git semantics — being slightly wrong in one language
 * is exactly the failure mode this project cannot afford.
 *
 * `lib/git` stays locale-free: it produces this pair as data and never chooses
 * between the two. The choosing happens in the UI.
 */
import type { Locale } from './locales'

export interface Localized {
  readonly en: string
  readonly id: string
}

export function localize(text: Localized, locale: Locale): string {
  return text[locale]
}

/** Both languages, for the rare case where one string is genuinely shared. */
export function both(text: string): Localized {
  return { en: text, id: text }
}
