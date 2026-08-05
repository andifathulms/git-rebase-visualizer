'use client'

/**
 * The `rebase -i` todo list. git-rebase(1), "Interactive Mode".
 *
 * Editing here writes a single `rebase -i <upstream> --todo=…` line back into
 * the session, so an interactive rebase is as replayable and as shareable as
 * any other command — and the user can see the line that did it.
 *
 * The order shown is the order git shows: oldest first, top to bottom.
 */
import { useMemo, useState } from 'react'
import { shortOid } from '@/lib/hash'
import { planRebase } from '@/lib/git/commands/rebase'
import { GitError } from '@/lib/git/errors'
import { requireCommit } from '@/lib/git/store'
import type { RebaseStep, Repository } from '@/lib/git/state'
import type { Locale } from '@/lib/i18n/locales'
import { TODO_HELP, UI } from '@/lib/i18n/ui'

const ACTIONS: RebaseStep['action'][] = ['pick', 'reword', 'squash', 'fixup', 'drop']

export function TodoPanel({
  repo,
  onRun,
  locale,
}: {
  repo: Repository
  onRun: (line: string) => void
  locale: Locale
}) {
  const t = UI[locale]
  const explain = TODO_HELP[locale]
  const [upstream, setUpstream] = useState('main')
  const [steps, setSteps] = useState<RebaseStep[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const subject = (oid: string) => {
    try {
      return requireCommit(repo.store, oid).message.split('\n')[0]
    } catch {
      return '?'
    }
  }

  const planned = useMemo(() => {
    try {
      return planRebase(repo, { upstream }).steps
    } catch (cause) {
      return cause instanceof GitError ? cause : null
    }
  }, [repo, upstream])

  function load() {
    if (planned instanceof GitError || planned === null) {
      setError(
        planned instanceof GitError
          ? planned.text[locale]
          : locale === 'en'
            ? 'cannot build a plan'
            : 'tidak bisa menyusun rencana',
      )
      setSteps(null)
      return
    }
    setError(null)
    setSteps([...planned])
  }

  function update(index: number, patch: Partial<RebaseStep>) {
    setSteps((current) =>
      current === null
        ? current
        : current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    )
  }

  function move(index: number, delta: number) {
    setSteps((current) => {
      if (current === null) return current
      const target = index + delta
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  function run() {
    if (!steps || steps.length === 0) return
    const todo = steps
      .map((step) =>
        step.message === undefined
          ? `${step.action}:${step.oid}`
          : `${step.action}:${step.oid}:${encodeURIComponent(step.message)}`,
      )
      .join(',')
    onRun(`rebase -i ${upstream} --todo=${todo}`)
    setSteps(null)
  }

  return (
    <section className="border border-ink/20">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/20 px-3 py-2">
        <span className="label">{t.interactiveRebase}</span>
        <div className="flex items-center gap-2">
          <input
            value={upstream}
            onChange={(event) => setUpstream(event.target.value)}
            aria-label={t.upstream}
            spellCheck={false}
            className="w-24 border border-ink/25 bg-transparent px-2 py-0.5 font-mono text-[11px] outline-none"
          />
          <button
            type="button"
            onClick={load}
            className="border border-catalogue px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.14em] text-catalogue"
          >
            {t.buildTodo}
          </button>
        </div>
      </header>

      {error ? <p className="px-3 py-2 font-mono text-[11px] text-stamp">{error}</p> : null}

      {steps === null ? (
        <p className="px-3 py-2 text-[11px] leading-relaxed text-ink/70">
          {t.todoIntro}
        </p>
      ) : (
        <>
          <ol className="divide-y divide-ink/10">
            {steps.map((step, index) => (
              <li key={`${step.oid}-${index}`} className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={step.action}
                    onChange={(event) =>
                      update(index, { action: event.target.value as RebaseStep['action'] })
                    }
                    aria-label={shortOid(step.oid)}
                    className="border border-ink/25 bg-transparent px-1 py-0.5 font-mono text-[11px]"
                  >
                    {ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                  <span className="font-mono text-[11px] text-faded">{shortOid(step.oid)}</span>
                  <span className="flex-1 truncate text-[12px] text-ink/80">
                    {subject(step.oid)}
                  </span>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    aria-label="↑"
                    className="border border-ink/25 px-1.5 text-[11px]"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    aria-label="↓"
                    className="border border-ink/25 px-1.5 text-[11px]"
                  >
                    ↓
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-faded">{explain[step.action]}</p>
                {step.action === 'reword' || step.action === 'squash' ? (
                  <input
                    value={step.message ?? ''}
                    onChange={(event) => update(index, { message: event.target.value })}
                    placeholder={t.newMessage}
                    aria-label={t.newMessage}
                    className="mt-1 w-full border border-ink/25 bg-transparent px-2 py-0.5 font-mono text-[11px] outline-none placeholder:text-faded"
                  />
                ) : null}
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between gap-2 border-t border-ink/20 px-3 py-2">
            <p className="text-[10px] leading-snug text-faded">
              {steps.filter((step) => step.action !== 'drop').length} {t.willBeRewritten}
            </p>
            <button
              type="button"
              onClick={run}
              className="border border-catalogue bg-catalogue px-3 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-board"
            >
              {t.run}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
