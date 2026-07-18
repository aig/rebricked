# AGENTS.md

Guidance for AI agents (and humans) working in the **rebricked** repo.

## What this project is

A single static page that answers one question: *"What does Databricks call it now?"*
It lists Databricks product/feature **renames** — sourced, dated, searchable — dressed
as the Databricks console. There is no build step, no framework, no backend.

## The one rule

**Real, sourced renames only. Never be confidently wrong.**

A rename is Databricks giving a new name to *the same thing*. Not a new product, not a
nickname, not a deprecation. Every entry needs an official source (Databricks or Microsoft
Learn docs) and a `verified` date. If you cannot verify a claim against a live doc, do not
add it — flag it instead. See [CONTRIBUTING.md](CONTRIBUTING.md) for the field rules.

When asked to "validate" the list, that means fact-check each entry against its cited
source and current Databricks naming — not just run the schema check.

## Layout

| File | What it is |
|------|------------|
| [`renames.json`](renames.json) | **The data. Source of truth.** An array of rename objects. |
| [`index.html`](index.html) | The app shell: Databricks-style sidebar rail + content area. |
| [`app.js`](app.js) | Vanilla JS (IIFE, no deps). Fetches `renames.json`, renders sidebar + result cards, wires search/chips/roulette/theme. |
| [`styles.css`](styles.css) | All styling. CSS variables; light default, `data-theme="dark"` toggle. Sidebar rail is always dark. |
| [`scripts/validate.py`](scripts/validate.py) | Schema/format gate for `renames.json`. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | The entry schema and field rules. |
| [`.github/workflows/`](.github/workflows/) | GitHub Pages CI: validate, then deploy. |

## Data shape (`renames.json`)

Each entry is one object. Required: `id`, `current`, `category`, `what`, `lineage`,
`renamedAt`, `source`, `verified`. Optional: `aliases`, `occasion`, `note`.

- `current` **must equal** the last `lineage` step (the one with `"to": null`).
- Dates are `YYYY` or `YYYY-MM`; `verified` is `YYYY-MM-DD`.
- `id` is kebab-case and unique.

## Before you commit

1. Run the schema gate — it must pass (CI runs the same one):
   ```
   python scripts/validate.py
   ```
2. Preview the site (it fetches `renames.json`, so serve over http — `file://` is blocked):
   ```
   python -m http.server 8777
   ```
   then open `http://localhost:8777/`.
3. If you changed the sidebar, keep [`app.js`](app.js)'s `NAV` config in sync: items whose
   rename exists in `renames.json` carry a `q` (and get the red "renamed" dot). Don't add a
   `q` pointing at something not in the data.

## Conventions

- **No dependencies, no build.** Keep it a static site. Vanilla JS only.
- Match the surrounding style: `app.js` is a single IIFE with small helper functions;
  escape all user/data strings via the existing `escapeHtml` / `escapeAttr` helpers.
- Not affiliated with Databricks. The console chrome is an homage; keep the disclaimer.
- Update [`CHANGELOG.md`](CHANGELOG.md) (grouped per day) with any notable change.
