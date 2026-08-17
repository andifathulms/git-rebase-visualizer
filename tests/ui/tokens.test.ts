import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Step 3 of DESIGN-REWORK.md's build order — ported from the Myers
 * Visualizer's tests/ui/tokens.test.ts and adapted to this project's
 * structure (a literal-value tailwind.config.ts, not a CSS-custom-property
 * palette). TYPE-SCALE-MEASUREMENT.md's histogram fed a rewrite of
 * theme.fontSize: Tailwind's default scale is replaced, not extended
 * (tailwind.config.ts, `fontSize` sits outside `extend`), so text-xs,
 * text-sm, text-[13px] and the rest produce no CSS at all — a silent
 * rendering bug no other test catches, which is exactly the failure mode
 * DESIGN-REWORK.md §1.1 describes the 12px floor dying to. This file is the
 * mechanism that holds the rule instead of a comment.
 */

const SCALE = ['label', 'note', 'body', 'lede', 'lead', 'heading', 'title', 'display', 'hero']

const CONFIG = readFileSync(join(process.cwd(), 'tailwind.config.ts'), 'utf8')

/** Every file Tailwind scans for classes — the same two roots as `content` in the config. */
function sources(dir = '', roots = ['app', 'components']): string[] {
  if (dir === '') return roots.flatMap((root) => sources(join(process.cwd(), root)))
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return entry.name.endsWith('.tsx') ? [path] : []
  })
}

/**
 * The two documented exceptions to "components never use raw hex"
 * (tailwind.config.ts's own header comment) — a fixed logo with its own
 * palette, and the browser-chrome theme-color meta tag, which Tailwind's
 * class scanner cannot reach either way.
 */
const HEX_EXEMPT_FILES = [join(process.cwd(), 'components', 'site', 'BrandMark.tsx'), join(process.cwd(), 'app', 'layout.tsx')]

describe('type scale', () => {
  it('declares every scale step in tailwind.config.ts, and nothing below the 12px floor', () => {
    for (const step of SCALE) {
      const declared = new RegExp(`${step}:\\s*\\[\\s*'([0-9.]+)px'`).exec(CONFIG)
      expect(declared, `fontSize.${step} is missing from tailwind.config.ts`).not.toBeNull()
      expect(Number(declared?.[1])).toBeGreaterThanOrEqual(12)
    }
  })

  it('uses no font size off the scale', () => {
    // Shaped like a Tailwind default-scale keyword or an arbitrary value —
    // the two ways a stray size actually gets typed. Colour utilities
    // (text-muted, text-catalogue, ...) don't match either shape and pass
    // through untouched.
    const looksLikeASize = /^(xs|sm|base|lg|[0-9]?xl|\[[^\]]+\])$/
    const offenders: string[] = []
    for (const file of sources()) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/(?:^|[\s"'`])(?:[a-z-]+:)?text-([a-zA-Z0-9[\].]+)/g)) {
        const size = match[1]
        if (SCALE.includes(size)) continue
        if (!looksLikeASize.test(size)) continue
        offenders.push(`${file}: text-${size}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('carries no hex literal outside the two documented exceptions', () => {
    const offenders: string[] = []
    for (const file of sources()) {
      if (HEX_EXEMPT_FILES.includes(file)) continue
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        offenders.push(`${file}: ${match[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  /*
   * Three families already carry hierarchy — Azeret Mono, Archivo, Source
   * Sans 3 — and CLAUDE.md's Conventions plus globals.css's own comment now
   * state the rule directly: one weight per family, emphasis comes from
   * family/tracking/case/colour, never from weight. DESIGN-REWORK.md §1.3:
   * "the first person to reach for font-semibold will not know they are
   * breaking anything" — now they will, because the build fails.
   */
  it('uses no weight class — one weight per family, by design', () => {
    const offenders: string[] = []
    for (const file of [...sources(), join(process.cwd(), 'app', 'globals.css')]) {
      // Strip CSS block comments first — globals.css states this very rule
      // in prose, and the rule's own words shouldn't trip the rule.
      const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      for (const match of source.matchAll(/\bfont-(bold|semibold|medium|extrabold|black|light|thin)\b/g)) {
        offenders.push(`${file}: font-${match[1]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
