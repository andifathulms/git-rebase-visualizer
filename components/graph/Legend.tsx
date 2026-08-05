/**
 * The key to the drawing. Four marks carry the whole model, and a reader who
 * does not already know git cannot infer any of them — least of all that a
 * faded box is present rather than deleted.
 *
 * The swatches are the same shapes the graph draws, not coloured dots, so the
 * mapping is direct.
 */
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

function Swatch({ children }: { children: React.ReactNode }) {
  return (
    <svg width={26} height={16} viewBox="0 0 26 16" role="presentation" className="shrink-0">
      {children}
    </svg>
  )
}

export function Legend({ locale }: { locale: Locale }) {
  const t = UI[locale]

  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
      <li className="flex items-center gap-2">
        <Swatch>
          <rect x={1} y={2} width={24} height={12} rx={2} className="fill-kraft stroke-ink" />
        </Swatch>
        {t.legendCommit}
      </li>
      <li className="flex items-center gap-2">
        <Swatch>
          <rect
            x={1}
            y={2}
            width={24}
            height={12}
            rx={2}
            className="fill-paper stroke-faded"
            strokeDasharray="3 3"
          />
        </Swatch>
        {t.legendUnreachable}
      </li>
      <li className="flex items-center gap-2">
        <Swatch>
          <line x1={0} y1={8} x2={9} y2={8} className="stroke-catalogue" strokeWidth={1.5} />
          <rect x={9} y={2} width={16} height={12} rx={2} className="fill-paper stroke-catalogue" />
        </Swatch>
        {t.legendRef}
      </li>
      <li className="flex items-center gap-2">
        <Swatch>
          <rect
            x={1}
            y={2}
            width={24}
            height={12}
            rx={2}
            className="fill-kraft stroke-ink"
            strokeWidth={2}
          />
          <text x={5} y={12} className="fill-stamp-deep font-mono text-[9px]">
            a1b2
          </text>
        </Swatch>
        {t.legendNew}
      </li>
    </ul>
  )
}
