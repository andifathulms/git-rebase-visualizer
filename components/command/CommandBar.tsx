'use client'

/**
 * The command bar. It stays a command bar — this is a tool for learning the
 * real thing, and a button that runs `rebase` for you teaches a button.
 *
 * What is added is everything that a terminal gives you for free and a text
 * input does not: a list of what is accepted, one line of explanation each,
 * tab-completion of the verb, and a few starter lines to copy. None of it
 * shortens a command; it only makes the accepted vocabulary discoverable.
 */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SUPPORTED_COMMANDS } from '@/lib/git/execute'
import type { Locale } from '@/lib/i18n/locales'
import { COMMAND_HELP, STARTER_LINES, UI } from '@/lib/i18n/ui'

export interface OutputLine {
  readonly id: number
  readonly kind: 'input' | 'info' | 'warn' | 'destructive' | 'error'
  readonly text: string
}

const TONE: Record<OutputLine['kind'], string> = {
  input: 'text-ink',
  info: 'text-muted',
  warn: 'text-catalogue',
  destructive: 'text-stamp',
  error: 'text-stamp',
}

/**
 * A line offered from elsewhere on the page. `n` increments per offer, so
 * offering the same line twice still lands in the box.
 */
export interface Prefill {
  readonly line: string
  readonly n: number
}

export function CommandBar({
  output,
  history,
  onSubmit,
  prefill,
  locale,
}: {
  output: readonly OutputLine[]
  history: readonly string[]
  onSubmit: (line: string) => void
  prefill?: Prefill | null
  locale: Locale
}) {
  const t = UI[locale]
  const help = COMMAND_HELP[locale]
  const [value, setValue] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const [reference, setReference] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [output])

  // Offered lines land in the box and wait there. Nothing on this page runs a
  // command on the user's behalf — a scenario that presses its own button
  // teaches the button, not the command.
  useEffect(() => {
    if (!prefill) return
    setValue(prefill.line)
    input.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.n])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (value.trim() === '') return
    onSubmit(value.trim())
    setValue('')
    setCursor(null)
  }

  /** Put a line in the box rather than running it — the user still presses enter. */
  function offer(line: string) {
    setValue(line)
    input.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Tab completes the verb, as a shell does.
    if (event.key === 'Tab' && !value.includes(' ')) {
      const matches = SUPPORTED_COMMANDS.filter((command) => command.startsWith(value.trim()))
      if (value.trim() !== '' && matches.length > 0) {
        event.preventDefault()
        setValue(`${matches[0]} `)
      }
      return
    }

    // Up and down walk the entered lines, as a shell does.
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    if (history.length === 0) return
    event.preventDefault()

    const next =
      event.key === 'ArrowUp'
        ? cursor === null
          ? history.length - 1
          : Math.max(0, cursor - 1)
        : cursor === null
          ? null
          : cursor + 1 >= history.length
            ? null
            : cursor + 1

    setCursor(next)
    setValue(next === null ? '' : history[next])
  }

  return (
    // Bounded like the graph panel, for the same reason (DESIGN-REWORK.md
    // §2): `.panel`'s own `flex min-h-0 flex-col` only makes the output
    // log's `overflow-y-auto` actually scroll, instead of growing forever,
    // once something above gives `.panel` itself a real height to fill.
    // Pinning this panel to the column's bottom (in Workbench.tsx) only
    // makes sense for a panel that stays a sane size in the first place.
    <section className="panel max-h-[28rem]">
      <header className="panel-head">
        <span className="label">{t.commandBar}</span>
        <button
          type="button"
          onClick={() => setReference((open) => !open)}
          aria-expanded={reference}
          className="btn-quiet px-2 py-1"
        >
          {reference ? t.hideReference : `${t.reference} · ${SUPPORTED_COMMANDS.length}`}
        </button>
      </header>

      {reference ? (
        <div className="max-h-56 overflow-y-auto border-b border-ink/10 bg-shelf/30 px-3 py-2.5">
          <p className="mb-2 max-w-prose text-label leading-relaxed text-muted">
            {t.referenceIntro}
          </p>
          <dl className="grid gap-x-3 gap-y-1.5 sm:grid-cols-[7rem_minmax(0,1fr)]">
            {['write', ...SUPPORTED_COMMANDS].map((command) => (
              <div key={command} className="contents">
                <dt>
                  <button
                    type="button"
                    onClick={() => offer(`${command} `)}
                    className="font-mono text-label text-catalogue underline decoration-catalogue/30 underline-offset-2 hover:decoration-catalogue"
                  >
                    {command}
                  </button>
                </dt>
                <dd className="text-label leading-snug text-muted">{help[command]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="min-h-[10rem] flex-1 overflow-y-auto px-3 py-2.5">
        {output.length === 0 ? (
          <p className="text-note leading-relaxed text-muted">{t.commandHint}</p>
        ) : (
          output.map((line) => (
            <pre
              key={line.id}
              className={`whitespace-pre-wrap font-mono text-note leading-relaxed ${TONE[line.kind]}`}
            >
              {line.kind === 'input' ? (
                <>
                  <span className="text-catalogue">$ </span>
                  {line.text}
                </>
              ) : (
                line.text
              )}
            </pre>
          ))
        )}
        <div ref={bottom} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-ink/10 px-3 py-2">
        <span className="label mr-1">{t.suggestions}</span>
        {STARTER_LINES.map((line) => (
          <button
            key={line}
            type="button"
            onClick={() => offer(line)}
            className="border border-ink/20 bg-paper px-2 py-0.5 font-mono text-label text-muted transition-colors hover:border-catalogue hover:text-catalogue"
          >
            {line}
          </button>
        ))}
      </div>

      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-ink/10 bg-shelf/30 px-3 py-2.5"
      >
        <span className="font-mono text-body text-catalogue">$</span>
        <input
          ref={input}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          aria-label="git command"
          placeholder="rebase main"
          className="w-full bg-transparent font-mono text-note text-ink outline-none placeholder:text-muted/70"
        />
      </form>
    </section>
  )
}
