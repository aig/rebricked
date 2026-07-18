# AGENTS.md

Guidance for AI agents (and humans) working in the **rebricked** repo.

## What this project is

A single static page that answers one question: *"What happened to the thing Databricks
used to call X?"* It lists Databricks product/feature **renames and deprecations** —
sourced, dated, searchable — dressed as the Databricks console. There is no build step,
no framework, no backend. (rebricked = **re**named or de**pre**cated.)

## The one rule

**Real, sourced changes only. Never be confidently wrong.**

Three kinds of entry, all held to the same bar:
- A **rename** (`kind` absent or `"rename"`) is Databricks giving a new name to *the same
  thing*. Not a new product, not a nickname.
- A **deprecation** (`kind: "deprecation"`) is a feature Databricks retired or replaced —
  it points at the successor (or says there's none). This is the *opposite* of a rename:
  a different thing takes over, usually with a different API/format.
- A **feature** (`kind: "feature"`) is a genuinely new capability worth tracking on the
  timeline — not renamed, not deprecated. It records `introducedAt` and a `status` of
  `ga`/`preview`. The UI shows it in green; the lifecycle filter can isolate features.

Every entry needs an official source (Databricks or Microsoft Learn docs) and a `verified`
date. If you cannot verify a claim against a live doc, do not add it — flag it instead.
See [CONTRIBUTING.md](CONTRIBUTING.md) for the field rules.

When asked to "validate" the list, that means fact-check each entry against its cited
source and current Databricks naming — not just run the schema check.

## Layout

| File | What it is |
|------|------------|
| [`databricks.json`](databricks.json) | **The data. Source of truth.** An array of rename, deprecation, and feature objects. |
| [`index.html`](index.html) | The app shell: Databricks-style sidebar rail + content area. |
| [`app.js`](app.js) | Vanilla JS (IIFE, no deps). Fetches `databricks.json`, renders sidebar + result cards, wires search/chips/roulette/theme. |
| [`styles.css`](styles.css) | All styling. CSS variables; light default, `data-theme="dark"` toggle. Sidebar rail is always dark. Renames use the red accent; deprecations use amber. |
| [`scripts/validate.py`](scripts/validate.py) | Schema/format gate for `databricks.json`. Branches on `kind`. |
| [`scripts/build_badges.py`](scripts/build_badges.py) | Regenerates `badges/<n>-of-5/` — one shareable quiz-result page per score, plus its `og.png`. Run after editing badge copy. Rendering `og.png` needs Edge/Chrome installed; the pages themselves are plain static files. |
| [`badges/`](badges/) | Generated. One folder per quiz result (0–5 of 5): an OG-tagged `index.html` (with an absolute `og:image`) plus a 1200×630 `og.png`. The quiz's LinkedIn share links here. Don't hand-edit; run the generator. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | The entry schema and field rules. |
| [`.github/workflows/`](.github/workflows/) | GitHub Pages CI: validate, then deploy. |

## Data shape (`databricks.json`)

Each entry is one object with a `kind`. Absent `kind` means `"rename"` (back-compat).
`id` is kebab-case and unique across the whole file; dates are `YYYY` or `YYYY-MM`;
`verified` is `YYYY-MM-DD`; `source` is required on every entry.

**Rename** (`kind` absent or `"rename"`) — required: `id`, `current`, `category`, `what`,
`lineage`, `renamedAt`, `source`, `verified`. Optional: `aliases`, `occasion`, `note`,
`prediction`.
- `current` **must equal** the last `lineage` step (the one with `"to": null`).
- `prediction` is the one deliberately fictional field: a made-up *next* name that powers
  the "New" button gag and the odds badge. Renames/features only; the UI always labels it
  as invented. Everything else stays sourced and real.

**Deprecation** (`kind: "deprecation"`) — required: `id`, `name`, `category`, `what`,
`deprecatedAt`, `status`, `source`, `verified`. Optional: `aliases`, `replacement`,
`replacementId` (id of the successor's entry), `removedAt`, `occasion`, `note`.
- `status` is `"deprecated"` (still around, discouraged), `"retired"` (access ended), or
  `"legacy"` (docs call it legacy/unsupported but no formal deprecation date exists).
- Omit `replacement` when nothing directly replaces it — the UI shows "retired".

**Feature** (`kind: "feature"`) — required: `id`, `name`, `category`, `what`,
`introducedAt`, `source`, `verified`. Optional: `aliases`, `status` (`ga`/`preview`,
defaults `ga`), `occasion`, `note`, `prediction`.
- No `lineage`/`renamedAt`/`deprecatedAt`/`replacement` — the validator warns and the UI
  ignores them. Once a feature gets renamed or retired, convert it to that kind.

The content area has a **lifecycle filter** (All / Renamed / Deprecated & removed / New
features) that narrows whatever's showing by `kind`. It's orthogonal to search, chips, and
rail sections; Home and the roulette reset it to All.

## Before you commit

1. Run the schema gate — it must pass (CI runs the same one):
   ```
   python scripts/validate.py
   ```
2. Preview the site (it fetches `databricks.json`, so serve over http — `file://` is blocked):
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
