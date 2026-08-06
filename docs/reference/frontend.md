# Frontend contracts

[`www/app.js`](../../www/app.js) is a single IIFE, no dependencies, roughly 2,500 lines. It fetches
`databricks.features.json` at boot and renders everything client-side. This page documents the parts
you can break from outside the file.

Match the surrounding style when editing: small named helper functions, and **every data string
escaped** through the existing `escapeHtml` / `escapeAttr` helpers.

## The `NAV` rail

Near the top of `app.js`. An array of groups, each `{ label, items }`; an empty group label renders
the unlabelled top block.

| Item shape | Renders as | Behaviour |
|---|---|---|
| `{ label, icon, ids: [...] }` | rail item with a dot | filters the list to those entries |
| `{ label, icon }` | rail item, no dot | shows an honest empty state |
| `{ label, icon, home: true }` | Home | clears every filter, shows everything |
| `{ label, icon, href }` | an anchor | navigates away (the Learn item) |

`icon` keys into the `ICONS` map: the inner markup of a 24x24 SVG, paths only, stroke and fill from
CSS.

**This is a validated contract.** `validate.py` greps the `ids:` arrays out of `app.js` and fails if
an entry is in no section, or if `NAV` names an id that is not in the data. See
[how-to/add-a-sidebar-section.md](../how-to/add-a-sidebar-section.md).

`build_badges.py` keeps a **separate static copy** of `NAV` and `ICONS` for the generated pages,
which have no JS runtime. Keep them roughly in sync.

## What is derived, never stored

The data stores the minimum; the UI calculates the rest. Changing any of these means changing the
calculation, not adding a field.

| Derived | From |
|---|---|
| predecessors of a card | every card whose `successorId` points at it |
| the full lineage chain | walking `successorId` forward and predecessors backward |
| feature vs rename tip | `introducedAt` present vs `from` present |
| the status badge | `status.value` via `STATUS_BADGE_CLASS`; an `active` card shows **no** badge |
| the maturity pill | the **last** element of `releases` |
| the filter bucket | `bucketOf()` |
| the year timeline segments | `changedAt()` per entry, bucketed |
| "days since the last change" | the newest `changedAt()` in the dataset |

## The status filter

Three buttons at the top of the results, driven by `FILTERS`, orthogonal to search, chips, rail
section, and year. Keys come from `bucketOf()` and match the badge each card shows, **not** the raw
`status.value`:

| Key | Button label | Contains |
|---|---|---|
| `current` | **Latest** | everything in use now: standalone features *and* current rename tips |
| `deprecation` | **Legacy** | `deprecated`, `legacy`, `retired` |
| `renamed` | **Renamed** | superseded former names only |

The distinction that matters: unticking **Latest** hides both a feature that shipped last month and
the current name of a 2019 product that got renamed, because both are names you can use today. Home
and the roulette reset the filter to all three. `BUCKET_ORDER` sets both the button order and the
sort order within a year.

> The button labels in the code are **Latest / Legacy / Renamed**. Some prose elsewhere in the repo
> calls them Active / Deprecated / Renamed, after the underlying `status` values. The code is the
> truth.

## Routing

Deep links are read once at boot by `applyRoute()` and written back by `writeURL()`.

| Parameter | Effect |
|---|---|
| `#<entry-id>` | opens that single entry |
| `?id=<entry-id>` | the same, in the query string. **The crawler- and share-safe form**, because LinkedIn and most link previews drop the fragment |
| `?q=<term>` | fills the search box and clears the section |
| `?s=<section label>` | selects that rail section by its label |
| `?cat=<category>` | selects a category chip |
| `?kind=<a,b,c>` | comma-separated filter buckets; an empty value means none selected |
| `?year=<YYYY>` | selects a timeline year |
| `?quiz=<score>-<total>` | shows the "beat this score" challenge banner from a shared badge link |

An id that is not in the data is ignored rather than erroring, so a stale shared link degrades to the
home view.

## Cards

`what.note` is the description with a link glyph to `what.link`. Each `fact` entry is its own row.
Date fields render as the date plus a link glyph to their `link`. `limitations` renders as a
"Limitations" line. `prediction` values are always labelled as invented. Every card can copy its own
link or a paste-ready blurb.

The maturity pill sits in the top-right corner on a cool-hue ramp (violet -> indigo -> blue ->
green); an announced-but-unreached stage renders "<Stage> soon" with a dashed border; an entry with no
`releases` shows no pill. The full timeline is in the tooltip.

## The Home extras

- **Year timeline**, a stacked bar chart of changes per year, coloured by the same three buckets and
  synced live to the filter. Clicking a bar filters by year. A second lens (`tlView = "stage"`) shows
  current release maturity instead of changes over time.
- **"On this month" spotlight**, a **random-entry roulette** with brick confetti, and a deadpan "days
  since the last change" counter.
- **The quiz**, in two modes: *Associate* (guess the current name, 5 questions) and *Professional*
  (name the feature from its definition, 10 questions). Distractors are built from real former names
  in the same rename chain and from `prediction` values, which is what makes them hard. The result
  links to `/badges/<n>-of-5/` for sharing.

## Styling

[`www/styles.css`](../../www/styles.css) - CSS variables, light by default, `data-theme="dark"`
toggle. The sidebar rail is always dark. Status colours are three dedicated tokens, each with a dark
value: `--c-active` (green), `--c-renamed` (slate), `--c-deprecated` (amber). The brand red
(`--accent`) is chrome only, never a status.

## Conventions that are not negotiable

- **No runtime dependencies.** No framework, no bundler, no JS toolchain.
- **Escape everything** from the data through `escapeHtml` / `escapeAttr`.
- **Analytics can never throw into a user path.** New tracking goes behind the guarded `track()`
  helper; see [analytics-events.md](analytics-events.md).
