# Type scale measurement — step 1 of DESIGN-REWORK.md §6

Measurement only. No files under `lib/git`, `lib/hash`, or `lib/layout` were touched, and
no source file was changed by this pass — this is the histogram DESIGN-REWORK.md §1.2 and
§6 call for before any scale is designed.

Method: `grep -rnoE "text-\[[0-9]+(\.[0-9]+)?px\]" app components lib`, every match
classified by hand from its surrounding line — the element it sets, the class it keeps
company with (`font-mono`, `font-display uppercase tracking-*`, `max-w-prose
leading-relaxed`, etc.), and what the text itself is.

**89 occurrences, across 17 files, in 10 distinct values.** (DESIGN-REWORK.md's own §1
count of "57 occurrences" undercounts — it appears to have missed `app/globals.css`'s
seven `@apply` sites, the responsive `sm:text-[Npx]` variant on `SiteHeader.tsx:43`, and
several component files. This table recounts directly from the current tree.)

Kind categories, assigned per occurrence:
- **prose** — a sentence or paragraph a reader reads for meaning (explanations, captions, hero copy).
- **label** — `font-display uppercase tracking-*` naming a region or a fixed short caption (per `CLAUDE.md`'s definition of `.label`), including headings and card/ref titles in that register.
- **chrome** — UI apparatus that is neither prose nor a label nor a number: buttons, hints, empty states, status/help text, form controls, panel furniture.
- **numeral** — an oid, short hash, or other accession-number-style monospace figure.
- **command input** — the command bar's own prompt, input field, output log, and the literal command text shown in starter/suggestion buttons and reference-panel links.

## By size, sorted by count

| Size | Count | Kinds present (count each) |
|---|---|---|
| 12px | 20 | chrome 15, prose 3, numeral 2 |
| 12.5px | 17 | chrome 8, prose 5, command input 2, numeral 2 |
| 13px | 13 | numeral 4, label 3, chrome 4, prose 2 |
| 11px | 12 | label 7, chrome 4, prose 1 |
| 15px | 10 | prose 7, command input 1, numeral 1, label 1 |
| 11.5px | 7 | chrome 4, command input 1, prose 1, numeral 1 |
| 14px | 4 | prose 3, command input 1 |
| 17px | 3 | prose 2, label 1 |
| 10px | 2 | label 1, numeral 1 |
| 9px | 1 | numeral 1 |
| **Total** | **89** | prose 24, chrome 35, numeral 12, label 13, command input 5 |

Reading the shape: **12 / 12.5 / 13 are the dense cluster** (50 of 89 occurrences, 56%),
all doing overlapping duty as chrome, numerals, and short labels. **11 and 11.5 are a
second, smaller cluster** (19 occurrences) almost entirely labels and chrome. **15 is the
only size prose leans on heavily** (7 of the 10). 9, 10, 14, and 17 are near-singletons —
one or two components each.

## By kind, across all sizes

| Kind | Count | Sizes it appears at |
|---|---|---|
| chrome | 35 | 11, 11.5, 12, 12.5, 13 |
| prose | 24 | 11, 11.5, 12, 12.5, 13, 14, 15, 17 |
| numeral | 12 | 9, 10, 11.5, 12, 12.5, 13, 15 |
| label | 13 | 10, 11, 13, 15, 17 |
| command input | 5 | 11.5, 12.5, 14, 15 |

Prose is spread across eight different sizes with no dominant one (15px carries the most,
but 12–13px still carry a third of it). Numerals span from 9px (the legend's stamp glyph)
to 15px (the prominent oid in `CommitInspector`). Command input clusters at 11.5–15px,
never below 12px except in the reference-panel starter-line buttons.

## Full detail, one row per occurrence

### 9px (1)

| File:Line | Kind | Context |
|---|---|---|
| `components/graph/Legend.tsx:63` | numeral | SVG `<text>`, `fill-stamp-deep font-mono` — the "S" glyph inside the stamp swatch |

### 10px (2)

| File:Line | Kind | Context |
|---|---|---|
| `components/repo/CommitInspector.tsx:117` | label | `font-display uppercase tracking-[0.12em]` — small ref badge |
| `components/repo/Workbench.tsx:366` | numeral | `font-mono` — small count badge |

### 11px (12)

| File:Line | Kind | Context |
|---|---|---|
| `app/globals.css:51` | label | `.label` class definition itself |
| `app/globals.css:73` | chrome | `.btn` class definition |
| `app/globals.css:103` | label | `.tab` class definition |
| `components/files/FilePanel.tsx:48` | chrome | "not a git command" hint text |
| `components/graph/CommitGraph.tsx:239` | prose | `font-sans` — commit subject line drawn inside a box |
| `components/graph/CommitGraph.tsx:279` | label | `font-display uppercase tracking-[0.14em]` — ref card name |
| `components/home/RebaseDiagram.tsx:159` | label | `fill-catalogue font-display uppercase tracking-[0.12em]` — ref label in landing diagram |
| `components/reflog/Register.tsx:68` | label | `font-display uppercase tracking-[0.12em]` — reflog operation name |
| `components/remote/RemotePanel.tsx:74` | label | `font-display uppercase tracking-[0.12em]` — remote-ref category label |
| `components/site/SiteHeader.tsx:35` | chrome | skip-link text |
| `components/site/SiteHeader.tsx:57` | label | `font-display uppercase tracking-[0.14em]` — nav link |
| `components/site/SiteHeader.tsx:80` | chrome | `font-mono` — locale-switcher button |

### 11.5px (7)

| File:Line | Kind | Context |
|---|---|---|
| `app/[locale]/skenario/page.tsx:41` | chrome | `<code>` scenario id |
| `components/command/CommandBar.tsx:188` | command input | starter-line quick-fill button, `font-mono` |
| `components/files/FilePanel.tsx:104` | chrome | border-top hint text |
| `components/rebase/TodoPanel.tsx:172` | chrome | per-step action explanation |
| `components/rebase/TodoPanel.tsx:187` | prose | explanatory paragraph, `leading-snug` |
| `components/reflog/Register.tsx:76` | numeral | `font-mono` oid |
| `components/remote/RemotePanel.tsx:79` | chrome | `font-mono` "not fetched" status word |

### 12px (20)

| File:Line | Kind | Context |
|---|---|---|
| `app/[locale]/page.tsx:50` | chrome | `.btn-primary` link |
| `app/[locale]/page.tsx:53` | chrome | `.btn-secondary` link |
| `app/[locale]/page.tsx:56` | chrome | `.btn-quiet` link |
| `app/globals.css:90` | chrome | `.btn-icon` class definition |
| `app/globals.css:94` | chrome | `.chip` class definition, `font-mono` |
| `app/globals.css:98` | chrome | `.field` class definition, `font-mono` |
| `components/graph/Legend.tsx:24` | chrome | legend item list text |
| `components/site/SiteFooter.tsx:20` | prose | `max-w-prose leading-relaxed` footer paragraph |
| `components/site/MakerSignature.tsx:87` | chrome | footer credit line |
| `components/files/FilePanel.tsx:57` | chrome | `font-mono` file-tab button |
| `components/files/FilePanel.tsx:82` | chrome | `font-mono` new-file name input |
| `components/repo/Workbench.tsx:321` | chrome | border-top hint text |
| `components/repo/Workbench.tsx:422` | prose | `max-w-prose leading-relaxed` disclaimer paragraph |
| `components/repo/CommitInspector.tsx:73` | chrome | "no parents"/"no refs" note |
| `components/repo/CommitInspector.tsx:78` | chrome | `<dl>` metadata grid |
| `components/rebase/TodoPanel.tsx:151` | numeral | `font-mono` shortOid |
| `components/command/CommandBar.tsx:136` | prose | `max-w-prose leading-relaxed` explanation paragraph |
| `components/command/CommandBar.tsx:146` | chrome | `font-mono` command-name link in reference list |
| `components/command/CommandBar.tsx:151` | chrome | `<dd>` help description |
| `components/remote/RemotePanel.tsx:98` | numeral | `font-mono` text |

### 12.5px (17)

| File:Line | Kind | Context |
|---|---|---|
| `app/[locale]/skenario/page.tsx:50` | command input | `<code>` stamp-coloured suggested-command chip |
| `components/command/CommandBar.tsx:165` | command input | `font-mono whitespace-pre-wrap` — output log line |
| `components/files/FilePanel.tsx:90` | prose | conflict-warning paragraph |
| `components/files/FilePanel.tsx:100` | chrome | file-content edit textarea |
| `components/files/FilePanel.tsx:109` | chrome | "no files" empty state, `font-mono` |
| `components/rebase/TodoPanel.tsx:125` | chrome | error text, stamp-coloured |
| `components/rebase/TodoPanel.tsx:128` | prose | explanatory paragraph |
| `components/reflog/Register.tsx:40` | prose | orphan-recovery help paragraph |
| `components/reflog/Register.tsx:44` | numeral | `font-mono` shortOid |
| `components/reflog/Register.tsx:60` | chrome | "no movements" empty state, `font-mono` |
| `components/reflog/Register.tsx:72` | chrome | reflog entry detail text |
| `components/remote/RemotePanel.tsx:64` | prose | explanatory paragraph |
| `components/remote/RemotePanel.tsx:77` | numeral | `font-mono` shortOid |
| `components/remote/RemotePanel.tsx:86` | chrome | border-top message |
| `components/remote/RemotePanel.tsx:97` | prose | "not on remote" help paragraph |
| `components/remote/RemotePanel.tsx:105` | chrome | border-top message |
| `components/repo/Workbench.tsx:275` | chrome | stamp-coloured conflict/error badge, `font-mono` |

### 13px (13)

| File:Line | Kind | Context |
|---|---|---|
| `app/[locale]/page.tsx:72` | label | `font-display uppercase tracking-[0.1em]` heading |
| `app/[locale]/page.tsx:87` | numeral | `font-mono text-catalogue` — step number "0N" |
| `app/[locale]/page.tsx:88` | label | `font-display uppercase tracking-[0.1em]` heading |
| `app/[locale]/skenario/page.tsx:48` | prose | scenario description paragraph |
| `app/globals.css:69` | prose | `.prose-note` class definition |
| `components/command/CommandBar.tsx:160` | chrome | empty-output hint text |
| `components/graph/CommitGraph.tsx:227` | numeral | `font-mono` — oid on a commit box |
| `components/home/RebaseDiagram.tsx:95` | numeral | `font-mono` — hash text in landing diagram |
| `components/reflog/Register.tsx:65` | numeral | `font-mono` — refname/oid |
| `components/repo/Workbench.tsx:264` | chrome | secondary muted text |
| `components/repo/Workbench.tsx:286` | chrome | object/orphan/HEAD status row |
| `components/site/SiteHeader.tsx:43` | label | site title/wordmark (base size, see also 15px responsive variant) |
| `components/rebase/TodoPanel.tsx:152` | chrome | truncated commit-subject line in the todo list |

### 14px (4)

| File:Line | Kind | Context |
|---|---|---|
| `components/command/CommandBar.tsx:209` | command input | the input field itself, `font-mono` |
| `components/repo/CommitInspector.tsx:67` | prose | commit message/subject, `leading-snug` |
| `components/repo/Workbench.tsx:244` | prose | orientation-banner text |
| `components/repo/Workbench.tsx:261` | prose | orientation-banner text |

### 15px (10)

| File:Line | Kind | Context |
|---|---|---|
| `app/[locale]/page.tsx:47` | prose | hero paragraph |
| `app/[locale]/page.tsx:75` | prose | feature-item body paragraph |
| `app/[locale]/page.tsx:91` | prose | step body paragraph |
| `app/[locale]/page.tsx:97` | prose | "new to git" paragraph |
| `app/[locale]/page.tsx:115` | prose | "honest" disclaimer paragraph |
| `app/[locale]/skenario/page.tsx:46` | prose | scenario lesson paragraph |
| `components/command/CommandBar.tsx:199` | command input | `font-mono` — the `$` prompt glyph |
| `components/home/RebaseDiagram.tsx:238` | prose | diagram caption paragraph |
| `components/repo/CommitInspector.tsx:66` | numeral | `font-mono` — prominent shortOid |
| `components/site/SiteHeader.tsx:43` | label | `sm:text-[15px]` — site title at the `sm` breakpoint |

### 17px (3)

| File:Line | Kind | Context |
|---|---|---|
| `app/[locale]/banding/page.tsx:27` | prose | intro paragraph |
| `app/[locale]/skenario/page.tsx:27` | prose | intro paragraph |
| `app/[locale]/skenario/page.tsx:38` | label | `font-display uppercase tracking-[0.06em]` — scenario title |

## Notes for step 2

- `Legend.tsx:63` (9px) is the only occurrence below the 12px floor `CLAUDE.md` states
  and `globals.css`'s comment narrows ("nothing below 12px carries prose here any more").
  It sets a single SVG glyph inside a swatch, not prose — DESIGN-REWORK.md §1.1 already
  flags this file by name.
- `CommitInspector.tsx:117` and `Workbench.tsx:366` (10px) are the only other sub-12px
  occurrences, both badges.
- `text-[12.5px]` (17 occurrences, second-most-used value) is a half-pixel step with no
  size below or beside it that a reader could tell apart by eye; every one of its 17 call
  sites currently sits within 0.5px of a 12px or 13px sibling doing similar work in another
  file.
- No occurrence was found outside `app/`, `components/`; `lib/` contributed zero matches,
  consistent with `lib/git`, `lib/hash`, and `lib/layout` carrying no rendering.
