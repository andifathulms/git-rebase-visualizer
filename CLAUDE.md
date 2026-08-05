# CLAUDE.md — Git Rebase Simulator

Git history simulator with real content-addressed hashes, an honest append-only object store, orphan and reflog views, and a real command bar. Static site, GitHub Pages, no backend.

Read `PRD.md` before starting any task. It fixes scope; this file describes how to work in the repo.

**Three things shape everything:**

1. **The object store is append-only.** Objects are created, never mutated, never deleted except by explicit `gc`. Every git operation is "create objects, move refs". Code that mutates a commit doesn't just have a bug — it teaches the opposite of the truth this project exists to convey.
2. **Hashes are real and content-derived.** Changing a parent changes the hash. That is not a display convention to fake; it must fall out of the hashing. It is the whole lesson.
3. **This teaches, so wrongness is expensive.** A plausible-but-wrong git simulator produces developers who confidently misunderstand rebase. When unsure of a semantic, read the git documentation and cite it — do not infer from memory.

---

## Stack

- Next.js 14, App Router, `output: 'export'` — static only
- TypeScript, `strict: true`
- Tailwind CSS
- Vitest
- pnpm
- No git library, no hashing library, no graph-layout library. Writing these is the project.

## Commands

```bash
pnpm dev
pnpm build                 # static export to ./out
pnpm preview               # serve ./out under the production basePath
pnpm test                  # vitest watch
pnpm test:run              # vitest once — before every commit
pnpm test:store            # append-only + content-addressing invariants
pnpm test:oracle           # structural agreement with recorded real-git fixtures
pnpm test:determinism
pnpm fixtures:record       # runs REAL git locally to regenerate oracle fixtures
pnpm typecheck
pnpm lint
```

`pnpm fixtures:record` shells out to the real `git` binary and is a **development-only** script. It never runs in CI or in the browser build.

## Layout

```
app/
  [locale]/                # id (default), en
    repo/                  # graph + command bar + reflog
    banding/               # comparison mode
    skenario/              # scenario library
components/
  graph/                   # commit boxes, lanes, ref cards, strings
  command/                 # command bar, output
  reflog/                  # the register
  conflict/                # three-way merge UI
  compare/
lib/
  hash/                    # synchronous SHA-1 + canonical object serialization
  git/                     # THE CORE. Pure. No React, no DOM, no clock, no network.
    objects.ts             # blob, tree, commit, tag
    store.ts               # append-only object store
    refs.ts                # branches, tags, HEAD, remote-tracking
    reflog.ts
    revparse.ts            # gitrevisions expressions
    commands/              # one file per command
    reachable.ts           # traversal from refs — authoritative, never incremental
    merge3.ts              # three-way merge over line arrays
  layout/                  # DAG lane assignment. Pure.
data/
  scenarios/               # curated starting states + documented lesson
tests/
  store/
  oracle/                  # fixtures recorded from real git
  revparse/                # gitrevisions expression table
  determinism/
```

## Invariants

1. **The object store is append-only.** No command mutates or removes an existing object. Only `gc` removes, and only unreachable objects. Every test asserts that all objects present before a command are still present and byte-identical after it.

2. **Hashes are computed, never assigned.** A hash is always the hash of the object's canonical serialization. Never generate an id, never increment a counter, never let a caller pass one in.

3. **A commit's hash covers its parents.** This is what makes rebase produce new objects. Do not "optimise" parents out of the hash input.

4. **Hashing is synchronous.** No `SubtleCrypto`, no async, no browser APIs. `lib/hash` must run identically in Node and in the browser, or the engine is neither pure nor testable.

5. **`lib/git` is pure and deterministic.** `(state, command) → { state, events }`. No clock reads, no `Date`, no `Math.random`, no DOM, no React, no module-level mutable state. Timestamps come from a virtual clock carried in state.

6. **Never iterate an unordered collection in engine code.** No `Set` iteration, no `Object.keys` where order affects output — tree entry ordering in particular must be explicit and sorted, because it feeds the hash.

7. **Reachability is computed by traversal from refs, every time.** Never track it incrementally, never cache it across commands. The orphan view is only trustworthy if the traversal is authoritative.

8. **Refs and objects are separate stores.** Moving a ref touches no object. If a command implementation reaches into an object to record where a branch is, the model is wrong.

9. **Every ref movement writes a reflog entry**, with the operation that caused it. No exceptions — this is what makes orphaned commits recoverable, and a missing entry silently destroys work.

10. **Unsupported commands fail loudly.** Name what is unsupported. Never silently no-op, never approximate a semantic, never produce a plausible wrong result. A confident wrong answer is the worst output this project can give.

11. **Never assert literal hash equality against real git.** Real git folds in timestamps and author identity. The oracle asserts *structure*: parent relationships, ref positions, which objects are new versus reused, tree equality across branches.

12. **Layout is pure and deterministic.** Same DAG in, same lane assignment out. Snapshot-tested.

13. **Nothing is computed in a component.** Components render state and events.

14. **`stamp` red is reserved for changed hashes and destructive operations.** Unreachable objects are `faded` grey — present but inactive, never red, never styled as deleted. See PRD §9.

15. **Pointers are always `catalogue` blue**, including the drawn strings from ref cards to commits. Colour is how "what points at what" stays readable.

## Working style

- **Read the git documentation before implementing a command.** `git-rebase`, `git-reset`, `gitrevisions`. Cite the relevant line in a comment. Do not reconstruct semantics from memory — `reset --soft` versus `--mixed` versus `--hard`, and `HEAD^2` versus `HEAD~2`, are exactly the places memory fails.
- **Record the oracle fixture before implementing.** Run the scenario through real git with `pnpm fixtures:record`, commit the fixture, then implement until it matches.
- **Hash and store before anything else.** M0 and M1 exist because every later feature rests on the object model being honest.
- **When a store assertion fails, stop.** A mutation is not a small bug here; it invalidates the project's premise.
- **Small increments.** One command, fully verified, with its oracle fixture.
- **Ask before adding a command.** Each one needs documented semantics, an oracle fixture, and a reason to exist in a teaching sandbox.
- **Don't touch `next.config.js`, the Actions workflow, or `fixtures:record` without saying so explicitly.**
- **Don't add dependencies** for hashing, git semantics, or graph layout.
- **Never weaken a test to make something pass**, especially in `tests/store/`.

## Conventions

- Named exports; defaults only where Next requires them.
- Discriminated unions for objects, commands, and events, keyed on `type`. Exhaustive `switch` with a `never` default — this is how adding an object type surfaces every site that must handle it.
- No `any`. No non-null `!` in `lib/git` or `lib/hash`.
- Git's own vocabulary in identifiers: `tree`, `blob`, `parents`, `HEAD`, `refname`, `oid`. Use `oid` for object ids, as git does — not `id`, not `hash`.
- Display hashes as a seven-character prefix, as git does. Store them in full.
- Comments cite the documentation for any semantic they implement.
- Git terms stay in English in code and UI; interface copy is Indonesian.
- Scenario ids stable and readable: `feature-behind-main`, `messy-history`, `published-branch`, `accidental-hard-reset`. They appear in shared URLs.
- Tailwind utilities inline; semantic tokens in `tailwind.config.ts` — `board`, `kraft`, `ink`, `catalogue`, `faded`, `stamp`. Never raw hex in components.
- The PRD's six colours are joined by four working tokens, none of them a new colour: `paper` and `shelf` are surfaces on the board, `muted` is the text grey (`faded` fails contrast as text and means *unreachable object*, nothing else), and the `-deep` variants are for a token drawn on another token — `stamp-deep` on kraft, `catalogue-deep` on hover.
- Repeated chrome is a class in `globals.css`, not a copied string: `.panel`/`.panel-head`/`.panel-body`, `.btn-*`, `.chip`, `.field`, `.tab`, `.label`. `.label` is for naming a region — never for prose.
- **12px is the floor for anything a reader has to read.** A teaching tool that sets its explanations in 10px has lost the reader it was written for.
- A *suggested* command is offered, never run. The starter chips, the command reference, and a scenario's `next` all put the line in the command bar and stop; the user presses enter. (The panel controls — push, fetch, run-todo, rescue — do run, and each shows the line it ran. The difference is that those are the panel's own gesture, not a hint about what to learn next: a scenario that presses its own button teaches the button.)

## Testing rules

- `pnpm test:run` before every commit; `pnpm test:store` and `pnpm test:oracle` before any commit touching `lib/git` or `lib/hash`.
- **Every test asserts the append-only property.** Not a separate suite — a shared assertion run after every command in every test.
- New command → an oracle fixture recorded from real git, plus reflog-completeness and store assertions.
- New revision syntax → an entry in the `gitrevisions` fixture table.
- Conflict-free integration scenarios → assert merge and rebase yield identical final trees and different history shapes. This is both a correctness test and the teaching property.
- Layout change → snapshot diffs read by eye, never accepted blind.
- Bug fix → failing test first.

## Deployment

`main` builds and deploys via Actions. `basePath` must match the repository name; `.nojekyll` must exist in `out/`. Verify with `pnpm preview` before pushing.

## Framing

Learn Git Branching is linked prominently as the better tutorial — accurate, generous, deliberate. The UI states plainly that hashes are content-derived and internally consistent, not identical to what real git would produce on the user's machine. No claim of parity.

## Current state

**M0–M7 landed. Every milestone in PRD §10 is implemented.**

- Synchronous SHA-1 against the RFC 3174 vectors; blob and tree oids match real git exactly, verified against oids recorded from `git ls-tree`.
- Append-only store, content addressing, refs/HEAD/reflog, virtual clock, `gitrevisions` parser with its fixture table.
- Commands: `add`, `commit`, `branch`, `checkout`/`switch`, `merge`, `rebase` (including `-i` via `--todo=`), `cherry-pick`, `reset`, `revert`, `tag`, `log`, `status`, `reflog`, `gc`.
- Real conflicts with git's own markers, and `--continue`/`--abort`/`--skip`.
- Graph, command bar, reflog register with orphan recovery, working-tree editor, scenario library, comparison mode, interactive rebase panel, remote panel.
- `diff` between two commits, a commit and the working tree, or `--staged` against HEAD.
- The graft animation from PRD §9 "Motion": each replayed commit is drawn travelling out from its original while the originals fade and the ref string runs out to the new chain.
- Remotes: one simulated peer (`origin`) as a second ref namespace over the same store, with `push`, `push --force`, `fetch`, and the collaborator's-view panel.
- Oracle fixtures recorded from real git across nine scenarios — two of them against a real bare repository, so `push` is checked against git's own fast-forward rule; determinism, layout snapshot, and scenario suites green.

Notes for whoever picks this up:

- **A session is a list of command lines, not a state snapshot.** The engine is deterministic, so replaying the lines rebuilds the repository byte-for-byte. That is what URL sharing encodes, and it is why a shared link can never disagree with what the commands actually do.
- **`write <path> "a|b"` is the one non-git line**, deliberately spelled unlike a git command. Editing a file is not a git operation and is not dressed up as one.
- **`rebase -i` takes its todo list as `--todo=pick:<oid>,squash:<oid>,…`**, because a command bar has no editor to open and the line still has to be replayable.
- **`pull` is refused on purpose**, not for lack of machinery. It hides the half of its job that rewrites your history, and PRD §6.7 asks for explicit push and fetch. The error names `fetch` + `merge`/`rebase`.
- **The peer's refs are reachability roots.** Without that, pushing a branch and then resetting locally would report the pushed commits as orphans — the opposite of the truth.
- Not implemented on purpose, and refused by name: `--rebase-merges`, criss-cross merge bases, dropping commits already upstream by patch-id, reverting a merge without `-m`, more than one remote.

**Locales.** English is the default route; Indonesian is at `/id/`. Engine messages carry both languages at the site that raises them (`lib/i18n/localized.ts`) rather than behind a key registry — with exactly two locales, a key table only adds a way for the identifier and the text to drift apart, and these messages explain git semantics. `lib/git` never chooses between the two; the UI does. `GitError.message` is the English one so stack traces and test failures read directly.

**The graft animation** is driven by the `commits-replaced` event, which rebase and cherry-pick emit with old→new oid pairs. Do not infer it from the graph shape: the engine knows what it copied, and the animation is only honest if it uses that.

Ideas beyond the PRD, in rough order of value: a conflict resolution UI showing base/ours/theirs side by side rather than raw markers in the editor (PRD §6.6 describes the three-way view; today the working-tree panel shows git's markers instead); scenario deep-links that pre-run the interesting command; and a way to step backwards through the session, which the script-as-state model already makes possible.
