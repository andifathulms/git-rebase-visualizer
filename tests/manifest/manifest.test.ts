/**
 * The web manifest is a static file rather than `app/manifest.ts`, and every
 * URL inside it is relative. Both of those are load-bearing and neither is
 * obvious, so they are asserted here.
 *
 * - **Static, because the file convention wins.** With `app/manifest.ts`
 *   present, Next emits `<link rel="manifest" href="/manifest.webmanifest">`
 *   and ignores `metadata.manifest`. Under a `basePath` that URL points at the
 *   domain root and 404s, so the app is silently not installable.
 * - **Relative, because a manifest resolves against its own location.**
 *   `en/repo/` is `/git-rebase-visualizer/en/repo/` in production and `/en/repo/`
 *   under `pnpm dev`, with nothing to keep in sync. Making these absolute would
 *   hardcode the repository name into a file no build step checks.
 *
 * PRD §12: `basePath` must match the repository name. This is what stops the
 * manifest from being the one place that quietly disagrees.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
  start_url: string
  scope: string
  icons: { src: string; sizes: string; purpose: string }[]
}

describe('web manifest', () => {
  it('keeps every URL relative, so it survives any basePath', () => {
    const urls = [manifest.start_url, manifest.scope, ...manifest.icons.map((i) => i.src)]
    for (const url of urls) {
      expect(url, `${url} must not be absolute`).not.toMatch(/^(\/|https?:)/)
    }
  })

  it('is not shadowed by the app/manifest.ts file convention', async () => {
    const exists = await import('node:fs').then((fs) => fs.existsSync('app/manifest.ts'))
    expect(exists, 'app/manifest.ts would override metadata.manifest and drop the basePath').toBe(
      false,
    )
  })

  it('ships an icon for each purpose a launcher asks for', () => {
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    expect(manifest.icons.filter((i) => i.purpose === 'any').map((i) => i.sizes).sort()).toEqual([
      '192x192',
      '512x512',
    ])
  })
})
