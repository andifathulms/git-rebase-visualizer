<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/brand/lockup-vertical-tagline-dark.png">
  <img src="./public/brand/lockup-vertical-tagline.png" alt="Git Rebase Simulator — commits don't move" width="360">
</picture>

### A git history sandbox with real content-addressed hashes

**Rebase does not move your commits. It writes new ones — with new hashes — and leaves the originals on the shelf, unreferenced but not gone.**<br>
This is a sandbox for watching that happen.

[**Open the simulator →**](https://andifathulms.github.io/git-rebase-visualizer/en/)

[![Deploy](https://github.com/andifathulms/git-rebase-visualizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/andifathulms/git-rebase-visualizer/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2C4C6E)](LICENSE)
[![Static export](https://img.shields.io/badge/next.js-static%20export-1E1D19)](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
[![No backend](https://img.shields.io/badge/backend-none-B5865A)](#deliberately-out-of-scope)

</div>

---

## Why this exists

[Learn Git Branching](https://learngitbranching.js.org) is the better and more complete tutorial, and you should probably use it first. This is not a tutorial — it is a sandbox, and it shows three things no other visualiser does.

**Real hashes, not `C1` `C2` `C3`.**
The single most important fact about rebase is that the result is a *different object with a different id*. Sequential labels erase that lesson in the notation: a rebased `C3` still looks like `C3`. Here the number changes in front of you, because the parent is part of the hash.

**What gets left behind.**
After a rebase or a `reset --hard` the old commits still exist — nothing points at them any more. That is the source of nearly all git panic ("I lost my work") and of its cure. No other visualiser draws the unreachable objects still sitting there, still recoverable from the reflog.

**Real file content, so real conflicts.**
Conflicts are where rebase actually hurts, and they are absent from every visual tool. Here they come out of a genuine three-way merge, with git's own markers.

## Try it in thirty seconds

Open the [scenario library](https://andifathulms.github.io/git-rebase-visualizer/en/skenario/), or type this into the command bar:

```sh
write notes.txt "one"      # not a git command — editing a file never is
add notes.txt
commit -m "first"
branch feature
checkout feature
write feature.txt "mine"
add feature.txt
commit -m "start the feature"
rebase main                # watch the hash change, and the original stay
reflog                     # the only route back to what was left behind
```

A session is a list of command lines, not a state snapshot. The engine is deterministic, so replaying the lines rebuilds the repository byte for byte — which is why a shared link can never disagree with what the commands actually do.

## Honest about the hashes

Hashes here are real in the sense of being **content-derived and internally consistent** — not identical to what `git` would produce on your machine. Git also folds in the committer timestamp and the author identity; this simulator uses a virtual clock so every session replays exactly.

What **is** byte-identical to git: **blob and tree oids**, because the serialization matches git's own and neither object carries a timestamp. That is asserted against oids recorded from `git ls-tree`.

## How it is tested

**Real git as a structural oracle.** [`scripts/record-fixtures.mjs`](scripts/record-fixtures.mjs) runs nine scenarios through the actual `git` binary and records the *structure*: parent relationships, ref positions, which commits share a tree, and whether a marked commit survives as an unreachable object. Two scenarios use a real bare repository as the peer, so `push` is checked against git's own fast-forward rule.

The fixtures contain no hashes at all. Commit ids legitimately differ, so asserting equality would be asserting the wrong thing.

This means the project's central claim comes from git, not from the simulator's own reasoning: it is git's own recording that reports the pre-rebase branch tip as *present but unreachable* — and the same for the commits a `push --force` strands on the peer.

**Append-only, every time.** Every command in every test asserts that all objects present beforehand are still present and byte-identical afterwards. Not a separate suite — a shared assertion after each command.

**The property being taught.** For a conflict-free integration, merge and rebase must produce **identical final trees and different history shapes**. That is simultaneously a correctness test and the entire content of comparison mode.

**Determinism.** The same script produces a byte-identical store, refs and reflog on any machine.

## Run it

```bash
pnpm install
pnpm dev
```

| Command | |
|---|---|
| `pnpm build` | static export to `./out` |
| `pnpm preview` | serves `./out` under the production basePath |
| `pnpm test:run` | the whole suite |
| `pnpm test:store` | append-only and content-addressing invariants |
| `pnpm test:oracle` | structural agreement with real-git fixtures |
| `pnpm test:determinism` | same script → byte-identical store |
| `pnpm fixtures:record` | **development only** — shells out to real `git` to re-record fixtures |
| `pnpm typecheck` · `pnpm lint` | |

No git library, no hashing library, no graph-layout library. Writing those is the project.

## Deliberately out of scope

Not a git client: no filesystem, no network, no real repositories. Submodules, worktrees, bisect, notes, LFS, packfiles and every merge strategy beyond three-way are out (PRD §4).

Unsupported commands **fail by name** — never a silent no-op, never a plausible-but-wrong result. A confident wrong answer is the worst thing a teaching tool can produce.

`push` and `fetch` work against one simulated peer called `origin` — a second ref namespace over the same object store, not a network. **`pull` is refused on purpose**: it hides half of its job, and that half is the half that rewrites your history. Run `fetch`, then `merge origin/main` or `rebase origin/main`.

## Structure

```
lib/hash/     synchronous SHA-1 + canonical object serialization
lib/git/      the engine. Pure: (state, command) → { state, events }
lib/layout/   DAG lane assignment. Pure, snapshot-tested
components/   render state and events; compute nothing
data/         curated scenarios
tests/        store, oracle, revparse, determinism, layout, integration
```

[PRD.md](PRD.md) fixes the scope. [CLAUDE.md](CLAUDE.md) describes how to work in the repo — the invariants there are not style preferences. A simulator that mutates a commit teaches the opposite of the truth it exists to convey.

## Brand

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/brand/lockup-horizontal-dark.png">
  <img src="./public/brand/lockup-horizontal.png" alt="Git Rebase Simulator lockup" width="520">
</picture>
</div>

The mark is the lesson at icon scale: a **dashed box** — the commit that still exists and is no longer reachable — beside the **solid new commit**, with a **ref chip** pointing at it. Tan is always a commit, blue is always a ref. Below 40px the chip is dropped; the two boxes never are.

The full kit lives outside the repository. The sizes the site and this page actually use are committed under [`public/brand/`](public/brand), [`public/icons/`](public/icons) and `app/`.

## Bahasa Indonesia

Antarmukanya dwibahasa. **Inggris adalah rute default** (`/en/`), Indonesia ada di [`/id/`](https://andifathulms.github.io/git-rebase-visualizer/id/). Teks penjelasannya ditulis Indonesia-first sesuai PRD §9, sementara kosakata git sendiri — *commit*, *rebase*, *HEAD*, *detached*, *reflog* — tetap Inggris di keduanya, supaya yang dipelajari di sini langsung terpakai di git sungguhan dan di dokumentasinya.

> Sebelumnya bernama *Cangkok* — teknik hortikultura mengakarkan cabang ke batang lain, persis yang dilakukan rebase. Namanya diganti supaya orang yang belum kenal proyek ini langsung tahu isinya.

## Credits

[Learn Git Branching](https://learngitbranching.js.org) is the incumbent and it is excellent; any pitch claiming this space was empty would be wrong. The normative source for every semantic implemented here is the git documentation itself — `gitrevisions`, `git-rebase`, `git-reset`, and the object-model chapter of *Pro Git*.

Designed and built by [Andi Fathul Mukminin](https://andifathulms.github.io/en/) · [GitHub](https://github.com/andifathulms) · [LinkedIn](https://www.linkedin.com/in/andifathulmukminin/)

## License

[MIT](LICENSE)
