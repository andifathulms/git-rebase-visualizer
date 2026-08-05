'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SUPPORTED_COMMANDS } from '@/lib/git/execute'

export interface OutputLine {
  readonly id: number
  readonly kind: 'input' | 'info' | 'warn' | 'destructive' | 'error'
  readonly text: string
}

export function CommandBar({
  output,
  history,
  onSubmit,
}: {
  output: readonly OutputLine[]
  history: readonly string[]
  onSubmit: (line: string) => void
}) {
  const [value, setValue] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [output])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (value.trim() === '') return
    onSubmit(value.trim())
    setValue('')
    setCursor(null)
  }

  /** Up and down walk the entered lines, as a shell does. */
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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
    <section className="flex min-h-0 flex-col border border-ink/20 bg-board">
      <header className="flex items-baseline justify-between border-b border-ink/20 px-3 py-2">
        <span className="label">Command bar</span>
        <span className="font-mono text-[11px] text-faded">
          {SUPPORTED_COMMANDS.length} perintah didukung
        </span>
      </header>

      <div className="min-h-[9rem] flex-1 overflow-y-auto px-3 py-2">
        {output.length === 0 ? (
          <p className="font-mono text-xs text-faded">
            Coba: <span className="text-ink">write a.txt &quot;satu&quot;</span> lalu{' '}
            <span className="text-ink">add a.txt</span> lalu{' '}
            <span className="text-ink">commit -m &quot;awal&quot;</span>
          </p>
        ) : (
          output.map((line) => (
            <pre
              key={line.id}
              className={`whitespace-pre-wrap font-mono text-xs leading-relaxed ${
                line.kind === 'input'
                  ? 'text-ink'
                  : line.kind === 'error' || line.kind === 'destructive'
                    ? 'text-stamp'
                    : line.kind === 'warn'
                      ? 'text-catalogue'
                      : 'text-ink/75'
              }`}
            >
              {line.kind === 'input' ? `$ ${line.text}` : line.text}
            </pre>
          ))
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-ink/20 px-3 py-2">
        <span className="font-mono text-sm text-catalogue">$</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          aria-label="Perintah git"
          placeholder="rebase main"
          className="w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:text-faded"
        />
      </form>
    </section>
  )
}
