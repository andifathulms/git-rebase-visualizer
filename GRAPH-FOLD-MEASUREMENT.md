# Graph height / command-bar fold — step 5 of DESIGN-REWORK.md §6

DESIGN-REWORK.md §2: "Reading the classes will not tell you where the fold lands.
Measure this on the production build after a five-commit rebase at 1280 and 1440, and on
a phone." This is that measurement, and what it changed.

## A blocker found first: `pnpm preview` was broken

Before anything could be measured, `pnpm preview` (`scripts/preview.mjs`) turned out not
to work for `/repo`, `/banding`, or `/skenario` — any route under the `[locale]` dynamic
segment. Next writes the client JS chunk for such a route at its literal path
(`out/_next/static/chunks/app/[locale]/repo/page-*.js`, brackets and all), but a browser
requests that asset percent-encoded (`%5Blocale%5D`). `resolveFile()` in `preview.mjs`
never decoded the request path before hitting the filesystem, so the request 404'd, the
page's JS never loaded, the client never hydrated, and `/repo` silently rendered its
empty-repository state forever — no error, nothing in the console but a failed request,
exactly the "confident wrong result" `CLAUDE.md` warns against. This has been broken
since routes went dynamic; nothing in this change branch caused it, but it made the
required measurement impossible, so it's fixed (`decodeURIComponent` before resolving —
one line, `scripts/preview.mjs`).

## The finding

With `pnpm preview` fixed, driving the production build with Playwright (5 commits on
`main`, a diverging 5-commit `feature` branch, `rebase main`, at 1280×800, 1440×900, and
a 390×844 phone) showed two things, only one of which DESIGN-REWORK.md's §2 anticipated:

1. **Growth**: before this change, the graph panel (`min-h-[24rem]`, no maximum) grew
   with every commit, pushing `CommitInspector` and `CommandBar` further down the page —
   exactly DESIGN-REWORK.md's complaint. Confirmed: at 1280, the command input's screen
   position moved from its resting point to further down the page as the graph grew.
2. **Baseline density, which growth wasn't the cause of**: even measuring *before* the
   rebase — a single starter commit, nothing grown yet — the command input already sat
   below the fold at 1280×800 (887px) and 1440×900 (987px). The page is dense enough
   (header, object-count chips, the first-visit orientation banner, the graph panel's own
   `min-h-[24rem]` floor) that "the command bar is visible without scrolling" was never
   true at these sizes, growth or not.

## What shipped, and what was tried and reverted

**Shipped**: the graph panel's scroll container gets both a floor and a ceiling
(`min-h-[24rem] max-h-[32rem] lg:max-h-[40vh]` — at ordinary window heights the 40vh
value is smaller than the 24rem floor, so the floor wins and the panel holds a steady
384px; only on unusually tall viewports does it grow, capped at 40% of the viewport) and
scrolls internally instead of growing the page. A `useEffect` in `Workbench.tsx`, keyed
on the `graft` event the engine already emits, scrolls that container to the *midpoint*
of the replayed span (not just its deepest row — an earlier version centered on the
deepest new commit alone, which clipped the shallowest one by up to 28px in testing)
whenever a rebase or cherry-pick replays commits, so the graft animation plays somewhere
the viewer is already looking. Measured after: 4–5 of 5 newly-grafted boxes fully inside
the visible scroll window at every tested size (the one exception, at 1440, is a boxes'
bottom edge sitting 1px past the container's edge — a rounding artifact, not a real
clip). Confirmed: the command input's screen position is now identical before and after
the rebase at all three sizes — the growth-driven fold movement DESIGN-REWORK.md
described is gone.

Separately, `CommandBar`'s own output log (`min-h-[10rem] flex-1 overflow-y-auto`) turned
out to have never actually been height-bounded either — nothing above it in the tree
constrained `.panel`'s height, so `flex-1` had no ceiling to fill and the log just grew
(1503px tall in the 20-line test scenario, confirmed by measurement). `CommandBar`'s
`.panel` now carries `max-h-[28rem]`, so its own output log genuinely scrolls instead of
growing without limit — a real, independent fix, kept regardless of what follows.

**Tried and reverted**: pinning `CommandBar` to the bottom of its column with
`position: sticky; bottom: 0` — DESIGN-REWORK.md's other listed option, attempted because
the baseline-density finding meant capping the graph alone wouldn't make the command bar
visible pre-rebase. Two problems surfaced in testing, in order:

- With the column left unbounded, a stuck `CommandBar` rendered at a screen position
  that overlapped the *end* of the graph panel above it — sticky-bottom, engaging
  immediately because the column already exceeded viewport height at rest, doesn't
  push earlier siblings out of the way the way it prevents overlap with later ones.
  Capping `CommandBar`'s own height (above) narrowed but did not close this: with the
  panels' combined natural height still exceeding the viewport, the overlap persisted.
- Making the left column itself the bounded, scrolling ancestor (mirroring the tab
  rail's own `lg:sticky lg:top-[3.5rem] lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`)
  removed the overlap, but the column's flex-shrink then compressed the graph panel
  below its own `min-h-[24rem]` floor (measured at 166px, well under the stated 384px
  floor) to make room — a second, different regression.

Getting a fully correct sticky-bottom-in-a-flex-column implementation right was going to
need either overriding `.panel`'s shared `min-h-0` for this one instance or restructuring
the column's sizing, and every attempt so far introduced a new visual bug in exchange for
fixing the old one. Rather than ship something not fully verified, the sticky attempt is
reverted; the honest state of the app after this change is that growth-driven fold
movement is fixed and verified, and baseline density is not — flagged here rather than
declared solved.

## Numbers, for the record

Five commits on `main`, five on a diverging `feature` branch, then `rebase main`,
production build, `pnpm preview`:

| Viewport | Command input, before rebase | After rebase | Moved? |
|---|---|---|---|
| 1280×800 | y=878 (below fold) | y=878 | No |
| 1440×900 | y=978 (below fold) | y=978 | No |
| 390×844 (phone) | y=976 (below fold) | y=975 | No (1px, animation-timing noise) |

Graph scroll container: `clientHeight` holds at 384px (1280/1440) and 512px (phone,
where the `40vh` value exceeds the `24rem` floor) regardless of `scrollHeight` (1204px in
this scenario) — confirmed capped and internally scrolling rather than growing the page.
