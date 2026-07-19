# AGENTS.md

Guidance for AI agents (and humans) working in the **rebricked** repo.

## What this project is

A single static page that answers one question: *"What happened to the thing Databricks
used to call X?"* It lists Databricks product/feature **renames and deprecations** -
sourced, dated, searchable - dressed as the Databricks console. There is no build step,
no framework, no backend. (rebricked = **re**named or de**pre**cated.)

## The one rule

**Real, sourced changes only. Never be confidently wrong.**

Three kinds of entry, all held to the same bar:
- A **rename** (`kind` absent or `"rename"`) is Databricks giving a new name to *the same
  thing*. Not a new product, not a nickname.
- A **deprecation** (`kind: "deprecation"`) is a feature Databricks retired or replaced -
  it points at the successor (or says there's none). This is the *opposite* of a rename:
  a different thing takes over, usually with a different API/format.
- A **feature** (`kind: "feature"`) is a genuinely new capability worth tracking on the
  timeline - not renamed, not deprecated. It records `introducedAt` and a `status` of
  `ga`/`preview`. The UI shows it in green, grouped with current names under the **Active**
  status filter.

Every entry needs an official source (Databricks or Microsoft Learn docs) and a `verified`
date. If you cannot verify a claim against a live doc, do not add it - flag it instead.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the field rules.

When asked to "validate" the list, that means fact-check each entry against its cited
source and current Databricks naming - not just run the schema check.

## Layout

| File | What it is |
|------|------------|
| [`databricks.json`](databricks.json) | **The data. Source of truth.** An array of rename, deprecation, and feature objects. |
| [`index.html`](index.html) | The app shell: Databricks-style sidebar rail + content area. |
| [`app.js`](app.js) | Vanilla JS (IIFE, no deps). Fetches `databricks.json`, renders sidebar + result cards, wires search/chips/roulette/theme. |
| [`styles.css`](styles.css) | All styling. CSS variables; light default, `data-theme="dark"` toggle. Sidebar rail is always dark. Status colors are three dedicated tokens - `--c-active` (green), `--c-renamed` (slate), `--c-deprecated` (amber), each with a dark value; the brand red (`--accent`) is chrome only. |
| [`scripts/validate.py`](scripts/validate.py) | Schema/format gate for `databricks.json`. Branches on `kind`. |
| [`scripts/build_badges.py`](scripts/build_badges.py) | Regenerates `badges/<n>-of-5/` - one shareable quiz-result page per score, plus its `og.png`. Run after editing badge copy. Rendering `og.png` needs Edge/Chrome installed; the pages themselves are plain static files. |
| [`badges/`](badges/) | Generated. One folder per quiz result (0–5 of 5): an OG-tagged `index.html` (with an absolute `og:image`) plus a 1200×630 `og.png`. The quiz's LinkedIn share links here. Don't hand-edit; run the generator. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | The entry schema and field rules. |
| [`agents/`](agents/) | Task-scoped agent instructions. [`add-databricks-entry.md`](agents/add-databricks-entry.md): investigate a Databricks thing's history + status, then add the right-kind entry. Tool-agnostic; sibling of this file. |
| [`.github/workflows/`](.github/workflows/) | GitHub Pages CI: validate, then deploy. |

## Data shape (`databricks.json`)

**One card per name.** Each name a product ever had is its own card, linked to the next
by `successorId` - there is no `lineage` array. A rename creates a new card and "freezes"
the old one. Predecessors are *derived* (any card whose `successorId` points here), so you
only ever store the forward link.

Each entry is one object with a `kind`. Absent `kind` means `"rename"` (back-compat).
`id` is the kebab-case slug of the entry's own `name` (parenthetical qualifiers dropped) and
unique across the whole file - e.g. `"Unity Catalog Volumes"` → `unity-catalog-volumes`,
`"Databricks CLI (v0.205+)"` → `databricks-cli`; the validator enforces it. **Ids are
permanent:** once set, an id never changes - a rename adds a new card with the new name's
slug and repoints the old card's `successorId`; the old card keeps its id, never re-slugged.
Dates are `YYYY` or `YYYY-MM`; `verified` is `YYYY-MM-DD`; `source` and `fact` are required
on every entry.
- `fact` is a real-but-fun one-liner about **this card's** thing - **funny but accurate**,
  true and sourceable, and **self-contained** (don't mention the successor/predecessor -
  those are their own linked cards). Only the tone is ours. Not fiction; required on every kind.
- `links` (optional, any kind): extra classified references - an **array** of
  `{ "url", "kind": "official" | "community" | "internet", "label" }`. `source` stays the
  canonical official link; these are additional and every URL must be real and verified.
- `successorId` (optional, any kind): id of the card this became / was replaced by.
- `prediction` is the one deliberately fictional field: an **array** of made-up *next*
  names (funny but plausible). Renames/features only; the UI always labels them invented.

**Rename** (`kind` absent or `"rename"`) - required: `id`, `name`, `category`, `what`,
`fact`, `status`, `source`, `verified`. Optional: `abbr`, `aliases`, `from`, `to`,
`successorId`, `occasion`, `note`, `prediction`, `links`.
- `status` is `"current"` (the name in use now - no `to`) or `"renamed"` (a superseded name
  - needs both a `to` date and a `successorId` pointing at the next name).
- `from`/`to` are when this name took effect / stopped being current.

**Deprecation** (`kind: "deprecation"`) - required: `id`, `name`, `category`, `what`,
`fact`, `deprecatedAt`, `status`, `source`, `verified`. Optional: `aliases`, `replacement`,
`successorId` (id of the successor's card), `removedAt`, `occasion`, `note`, `links`.
- `status` is `"deprecated"` (still around, discouraged), `"retired"` (access ended), or
  `"legacy"` (docs call it legacy/unsupported but no formal deprecation date exists).
- Omit `successorId`/`replacement` when nothing directly replaces it - the UI shows "retired".

**Feature** (`kind: "feature"`) - required: `id`, `name`, `category`, `what`, `fact`,
`introducedAt`, `source`, `verified`. Optional: `aliases`, `status` (`ga`/`preview`,
defaults `ga`), `occasion`, `note`, `prediction`, `links`.
- No `from`/`to` needed, and `status` defaults to `ga`. Once a feature gets renamed, add a
  new card for the new name and set this one's `successorId` to it (and convert as needed).

The content area has a **status filter** (Active / Renamed / Deprecated) that narrows
whatever's showing by the badge each card shows - via `bucketOf`, not raw `kind`, so
unchecking **Active** hides both new features and current-name renames (everything in use),
while **Renamed** is only superseded former names. It's orthogonal to search, chips, and
rail sections; Home and the roulette reset it to all three. The year timeline mirrors the
same buckets as stacked, colour-coded segments and follows the filter live.

**Analytics.** Umami (cookieless, in `index.html`) plus a guarded `track(name, data)` helper
in `app.js` for custom events - every call is wrapped so a blocked/absent script can't affect
the app. LinkedIn share links get UTM tags via `withUTM(url, params)`. Keep new tracking
behind `track()`; never let analytics throw into a user path.

## Before you commit

1. Run the schema gate - it must pass (CI runs the same one):
   ```
   python scripts/validate.py
   ```
2. Preview the site (it fetches `databricks.json`, so serve over http - `file://` is blocked):
   ```
   python -m http.server 8777
   ```
   then open `http://localhost:8777/`.
3. If you changed the sidebar, keep [`app.js`](app.js)'s `NAV` config in sync: each rail
   item maps to the entries it covers via an `ids` array (entry `id`s from `databricks.json`,
   renames or deprecations), and those items get the dot. Clicking a section filters to its
   entries; sections with no `ids` show an honest empty state. Every `id` you list must exist
   in the data, and every entry should be reachable from at least one section (Home shows all).

## Conventions

- **No dependencies, no build.** Keep it a static site. Vanilla JS only.
- Match the surrounding style: `app.js` is a single IIFE with small helper functions;
  escape all user/data strings via the existing `escapeHtml` / `escapeAttr` helpers.
- Not affiliated with Databricks. The console chrome is an homage; keep the disclaimer.
- Update [`CHANGELOG.md`](CHANGELOG.md) (grouped per day) with any notable change.
