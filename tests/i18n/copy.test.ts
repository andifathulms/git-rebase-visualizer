/**
 * The interface is bilingual by construction, not by discipline: a key present
 * in one locale and missing from the other is a blank space on a page, and a
 * command with no help line renders `undefined` in the command reference.
 *
 * With exactly two locales there is no key registry to lean on (see CLAUDE.md
 * on `lib/i18n/localized`), so this file is what keeps them in step.
 */
import { describe, expect, it } from 'vitest'
import { SUPPORTED_COMMANDS } from '@/lib/git/execute'
import { LOCALES } from '@/lib/i18n/locales'
import { COMMAND_HELP, TODO_HELP, UI } from '@/lib/i18n/ui'

describe('interface copy', () => {
  it('carries the same keys in every locale', () => {
    const reference = Object.keys(UI.en).sort()
    for (const locale of LOCALES) {
      expect(Object.keys(UI[locale]).sort()).toEqual(reference)
    }
  })

  it('leaves no string empty', () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(UI[locale])) {
        expect(value.trim(), `${locale}.${key}`).not.toBe('')
      }
    }
  })

  it('explains every command the engine accepts, in every locale', () => {
    for (const locale of LOCALES) {
      for (const command of SUPPORTED_COMMANDS) {
        expect(COMMAND_HELP[locale][command], `${locale}: ${command}`).toBeTruthy()
      }
      // `write` is not a git command, which is exactly why it needs a line.
      expect(COMMAND_HELP[locale].write).toBeTruthy()
    }
  })

  it('explains every rebase todo action, in every locale', () => {
    for (const locale of LOCALES) {
      for (const action of ['pick', 'reword', 'squash', 'fixup', 'drop']) {
        expect(TODO_HELP[locale][action], `${locale}: ${action}`).toBeTruthy()
      }
    }
  })
})
