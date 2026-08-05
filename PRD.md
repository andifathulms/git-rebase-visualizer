# PRD — Cangkok

**A git history simulator with real content-addressed hashes, so you can see that rebase does not move commits — it creates new ones, and leaves the originals on the shelf.**

> *cangkok* / *mencangkok* (Indonesian) — to graft; the horticultural technique of rooting a branch onto a different base.
> Literally what rebase does: detach a branch, root it somewhere else. Slug used throughout as `cangkok`.

| | |
|---|---|
| **Status** | Draft — pre-implementation |
| **Owner** | Andi Fathul Mukminin Salahuddin |
| **Type** | Personal portfolio project, open source, educational |
| **Deployment** | GitHub Pages (static export, no server) |
| **Language** | Indonesian-first UI; English secondary. Git terms stay in English. |
| **Normative source** | The git documentation, in particular `gitrevisions`, `git-rebase`, `git-reset`, and the object-model chapter of *Pro Git*. |

---

## 1. Prior art

**Learn Git Branching (learngitbranching.js.org) is the incumbent and it is excellent.** It accepts real git commands, animates the DAG, and has a well-built tutorial progression. There is also Visualizing Git and a family of D3 explainers, plus `git-sim` on the CLI.

Any pitch claiming this space is empty is wrong. Link to Learn Git Branching prominently; it is the better tutorial and saying so costs nothing.

## 2. What the incumbents don't do

**They use fake commit ids.** `C1`, `C2`, `C3`. This is the critical omission, because the single most important fact about rebase is that **the resulting commits are different objects with different hashes**. With sequential labels, a rebased `C3` still looks like `C3` — the lesson is erased by the notation. Real content-addressed hashes make it unmissable.

**They don't show what was left behind.** After a rebase or a hard reset, the original commits still exist; they are simply unreferenced. This is the source of nearly all git panic — "I lost my work" — and of its cure, the reflog. No visualiser shows the unreachable objects sitting there, still recoverable.

**They have no file content, so no real conflicts.** Conflicts are where rebase actually hurts, and they are absent from every visual tool.

**They are tutorials, not sandboxes.** There is no "set up this shape, run these two approaches, compare the outcomes" mode.

## 3. Product thesis

**Model git's object store honestly, and the lessons emerge for free.**

Commits are immutable objects addressed by a hash over their content, tree, parents, and metadata. Branches are movable pointers. `HEAD` is a pointer to a pointer. Once that model is real in the simulator rather than approximated:

- Rebase produces new hashes automatically, because the parent changed. No special explanation needed — the user watches the ids change.
- Orphaned commits appear automatically, because nothing points to them any more.
- The reflog is meaningful, because it is the only remaining reference.
- Force-push danger becomes obvious, because you can see the two divergent object sets.

**The design metaphor carries the same structure.** The archive: commits are boxes on a shelf with accession numbers, refs are catalogue cards with a string running to a box, and an orphaned commit is a box no card points to — still in the vault, invisible to the catalogue, swept only at `gc`. The mapping is exact, which is why it teaches rather than decorates.

## 4. Non-goals

- **Not a git client.** No filesystem access, no real repositories, no cloning anything.
- **Not a full git implementation.** Submodules, worktrees, sparse checkout, bisect, notes, hooks, LFS, and packfiles are all out.
- **No network.** Remotes are simulated as a second ref namespace in the same in-memory store (M7), never real fetch or push.
- **No tutorial progression or levels in v1.** Learn Git Branching does that well; this is a sandbox. A scenario library is not the same thing.
- **No merge strategies beyond three-way.** No `ours`, `theirs`, `octopus`, `subtree`.
- **No real SHA-1 collision behaviour, no packfiles, no delta compression.** Hashes are real in the sense of being content-derived and stable, not in the sense of matching what `git` would produce on your machine.
- **No accounts, no server.** Repository state shares by URL hash.
- **No ML.**

## 5. The model

**Object store, append-only.** Four kinds:

| Object | Contents | Addressed by |
|---|---|---|
| **blob** | file content (an array of lines) | hash of content |
| **tree** | path → blob or subtree | hash of entries |
| **commit** | tree, parents, author, committer, message | hash of all of it |
| **tag** | target, message | hash |

**Hashing is real and synchronous.** A compact SHA-1 implemented in the engine, over a canonical serialization mirroring git's own object format. Displayed as a seven-character prefix, exactly as git does. Two consequences that carry the whole product:

- **Identical content deduplicates.** Two commits with the same tree share the tree object. Users discover that git stores snapshots, not diffs, by seeing the hash repeat.
- **Changing a parent changes the hash.** This is why rebase creates new commits, and the user sees it happen rather than being told.

Note honestly in the UI: real git also folds in the committer timestamp, so even an unchanged commit gets a new hash on rebase. The simulator uses a deterministic virtual clock so runs are reproducible, and says so.

**Refs are mutable pointers, stored separately from objects.** Branches, tags, `HEAD` (symbolic or detached), and remote-tracking refs. Moving a ref never touches an object.

**The reflog records every ref movement**, with the operation that caused it. It is the only thing keeping orphaned commits addressable, which is precisely its role in real git.

**Revision expressions get a real parser.** `HEAD`, `HEAD~3`, `HEAD^2`, `branch`, `tag`, short hashes, `ref@{n}`. Following `gitrevisions`. This is a well-specified deterministic sub-problem with its own fixtures, and it makes the command bar feel like git rather than like a toy.

## 6. Features

### 6.1 The graph
Commits as boxes carrying their accession number, laid out in lanes as `git log --graph` does. Refs as catalogue cards attached by a visible string to the commit they point at. `HEAD` distinguished, and visibly attached to a branch card rather than to a commit when not detached — because that indirection is what `checkout` changes and what confuses people.

**Unreachable commits stay on the shelf**, greyed and unstrung, until swept. This is the view no other tool offers.

### 6.2 The command bar
Real git syntax: `commit`, `branch`, `checkout`/`switch`, `merge`, `rebase`, `rebase -i`, `cherry-pick`, `reset --soft|--mixed|--hard`, `revert`, `tag`, `log`, `reflog`, `status`. Unsupported commands fail with a clear message naming what is unsupported, never with a silent no-op or a plausible wrong result.

### 6.3 The reflog panel
Every ref movement, the operation that caused it, and the commit it left behind. One click to recover an orphaned commit by creating a branch at it — the real-world recovery move, performed exactly as it would be in git.

### 6.4 Interactive rebase
The todo list, editable: `pick`, `reword`, `squash`, `fixup`, `drop`, and reordering. Applied step by step with each new commit's hash appearing as it is created. The before-and-after object sets shown together, so what was replaced and what remains are both visible.

### 6.5 Comparison mode
Same starting state, two integrations side by side — merge versus rebase, or rebase versus cherry-pick. Shows the differing history shapes alongside a fact worth internalising: **the resulting working tree content is identical; only the history differs.** That is a testable property (§8) and a teachable one.

### 6.6 Conflicts
File content is real, so a rebase or merge that cannot apply cleanly produces a genuine conflict, with the three-way merge shown: base, ours, theirs. Resolution is manual, and the resulting commit's hash reflects the resolution. This is the milestone where rebase stops being abstract.

### 6.7 Remotes and force-push
A second ref namespace with explicit `push` and `fetch`. After rewriting history, pushing requires `--force`, and the simulator shows what a collaborator's clone would look like afterwards. The most consequential git lesson there is, and it needs the object model to be honest to land.

### 6.8 Scenario library and sharing
Curated starting states: a feature branch behind main, a messy history to clean up, a published branch that should not be rebased, a conflicting rebase, an accidental hard reset to recover from. Repository state encodes into the URL hash.

## 7. Architecture

Static Next.js 14 App Router export. No backend, no runtime fetches.

```
command string
  → parse           → Command AST (with revision expressions resolved)
  → execute (pure)  → { store, refs, reflog, events }
                    → graph | reflog panel | conflict view | comparison
```

**`lib/git` is pure.** `(state, command) → { state, events }`. No React, no DOM, no clock, no `Math.random`, no module-level mutable state. Timestamps come from a virtual clock in state.

**The object store is append-only. This is the central invariant.** Objects are created, never mutated and never deleted except by an explicit `gc` operation. Every git operation is expressible as "create objects, move refs" — if an implementation wants to mutate a commit, the implementation is wrong and, worse, it teaches the opposite of the truth.

**Hashing is synchronous and self-contained.** No `SubtleCrypto` — it is async and browser-only, which would poison the purity of the engine. A compact SHA-1 in the engine keeps everything deterministic and testable in Node.

**Reachability is computed independently**, by traversal from refs, never tracked incrementally. Incremental refcounting would drift, and the orphan view is only trustworthy if the traversal is authoritative.

**Layout is separate and pure.** `lib/layout` assigns lanes and positions from the DAG, deterministically. SVG rendering is fine here — commit graphs in a teaching sandbox are small, unlike Pangkas's search trees.

## 8. Testing

**Real git as the oracle.** A development script runs actual `git` through a set of scripted scenarios and records the resulting structure: parent relationships, ref positions, which commits are new versus reused, tree equality across branches. Committed as fixtures. The simulator must match structurally. Exact hashes will differ — real git folds in timestamps and author identity — so **assert on structure and on identity relationships, never on literal hash values against real git.**

**Append-only store.** After every command, every object present before must still be present and byte-identical. Asserted globally, on every test. A mutation is the one bug that would make the whole project dishonest.

**Content addressing.** Identical content yields an identical hash; any change to content, tree, parents, or metadata yields a different one. Asserted both directions.

**Merge/rebase tree equality — the teaching property.** For a conflict-free integration, merging and rebasing produce **different history shapes but identical final trees**. Assert it across the scenario corpus. It is simultaneously a correctness test and the thing the comparison view exists to show.

**Reflog completeness.** Every ref movement produces a reflog entry, and every unreachable commit is reachable from some reflog entry until `gc`. This is what makes the recovery feature real rather than decorative.

**Revision parser fixtures.** A table of expressions from `gitrevisions` with their expected resolution, including the ones people get wrong — `HEAD^2` versus `HEAD~2`.

**Determinism.** Same starting state and same command sequence produce a byte-identical store, refs, and reflog.

## 9. Design direction

The archive, and specifically a records room: boxes on shelves with accession numbers, a card catalogue whose cards carry a string to the box they describe, a `SUPERSEDED` stamp, and a sweep list for material pending disposal.

The mapping is structural, not decorative. A commit is a box. A branch is a card. `HEAD` is the card marked *in use*. An orphaned commit is a box no card points to — still in the vault, invisible to the catalogue, swept only when someone runs the disposal. Explaining git this way is the product.

**Palette.** Archive board `#E4E0D5` as ground. Kraft `#C4A97D` for commit boxes. Ink `#23211C` for text and rules. Catalogue blue `#2E5A7A` for refs, cards, and the strings connecting them — pointers are always blue, so "what points at what" is readable at a glance. Faded grey `#8A8779` for unreachable objects, which should look present but inactive, not deleted. **Stamp red `#A8322B` reserved for exactly two things: a changed hash and a destructive operation.** Nothing else is red.

**Type.** Accession numbers are the content, so **Azeret Mono** for hashes, file content, and command input — boxy, with strong figures, and distinctive against the softer surroundings. **Archivo** for headings and catalogue labels, uppercase with wide tracking, in the register of shelf labelling. **Source Sans 3** for body and controls.

**Structure.** Commit boxes on a visible shelf line per lane. Ref cards float above with a drawn string to their target — a real line, so re-pointing a ref is a visible physical act. The reflog is a bound register in a side panel, chronological, append-only in appearance as well as in fact.

**Motion.** One orchestrated moment: during rebase, each replayed commit is created as a new box with a new number, drawn beside its original, while the branch card's string swings from the old chain to the new one and the originals fade to grey. That single animation *is* the lesson — commits are copied, not moved — and it should be the thing people screenshot.

**Copy.** Indonesian first for interface and explanation; git terms stay in English — *commit*, *rebase*, *HEAD*, *detached*, *reflog* — so the vocabulary transfers to real git and real documentation. Destructive operations are described plainly, including what remains recoverable and how.

## 10. Milestones

| | | |
|---|---|---|
| **M0** | Scaffold | Static export deploying; synchronous SHA-1 with test vectors; DAG lane-layout spike. |
| **M1** | Object model | Blobs, trees, commits, refs, `HEAD`, virtual clock. `commit`, `branch`, `checkout`, `log`. Append-only and content-addressing tests green. Console only. |
| **M2** | Graph | Lane layout, commit boxes, ref cards with strings, `HEAD` indirection made visible. |
| **M3** | Core operations | `merge`, `rebase`, `cherry-pick`, `reset`, `revert`, reflog panel, orphan view, recovery. **Ship publicly here** — this alone teaches the central lesson. |
| **M4** | Interactive rebase | Todo list with `pick`/`reword`/`squash`/`fixup`/`drop`/reorder. |
| **M5** | Comparison + scenarios | Side-by-side integrations, tree-equality display, curated scenario library. |
| **M6** | Content and conflicts | Real file content, three-way merge, conflict resolution UI. |
| **M7** | Remotes | Second ref namespace, `push`, `fetch`, force-push and the collaborator's view. |

M3 is the honest ship point: real hashes, real orphans, real recovery. Everything after is additive.

## 11. Success criteria

- The object store is append-only across every command in every test — no exceptions.
- Simulator structure matches real git across the recorded fixture scenarios.
- Merge and rebase produce identical final trees and different history shapes, across the corpus.
- Every unreachable commit is recoverable via the reflog until `gc`.
- Revision parser matches its `gitrevisions` fixture table exactly.
- Same command sequence produces a byte-identical store on any machine.
- A user can rebase, see the hashes change, find the originals, and recover one — in under five commands.
- Fully offline after first load. JS ≤ 250 KB gzipped.

## 12. Deployment

`output: 'export'`, `basePath` matching the repository name, `images.unoptimized`, `trailingSlash: true`, `.nojekyll` in the output root. Verify under the production `basePath` with `pnpm preview` before pushing.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **Learn Git Branching is strong and well-known.** | Differentiators are real hashes, the orphan/reflog view, and conflicts. Link to LGB warmly as the better tutorial; this is a sandbox. |
| **Teaching wrong git.** | Real git as a structural oracle from M1. Unsupported commands fail loudly rather than approximating. Never guess at semantics — check the documentation and cite it in the comment. |
| **Implying hash parity with real git.** | State plainly in the UI that hashes are content-derived and internally consistent, not identical to what `git` would produce. |
| **DAG lane layout is fiddlier than it looks.** | Layout is pure and separately tested with snapshot fixtures. Build the crossing-heavy case first, not last. |
| **Conflicts are a large scope jump.** | Sequenced at M6, after the project has already shipped. Three-way merge over line arrays only. |
| **Scope creep toward a git implementation.** | §4 is binding. Packfiles, submodules, and bisect are not coming. |
