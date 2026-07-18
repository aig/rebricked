# Changelog

All notable changes to **rebricked**, grouped by day.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

## 2026-07-18

### Added
- **Deprecations are now first-class.** Entries carry a `kind`: `"rename"` (default) or
  `"deprecation"`. A deprecation names the retired feature, its `replacement` (or none),
  `deprecatedAt`/`removedAt`, and a `status` of `deprecated`/`retired` — the opposite of a
  rename (a different thing takes over). Seeded with four sourced deprecations: **dbx** →
  Declarative Automation Bundles, **Legacy (Redash) dashboards** → AI/BI Dashboards (access
  ended Jan 12, 2026), **Legacy Databricks CLI** → the new Go-based CLI, and **DBFS mounts**
  → Unity Catalog volumes & external locations. This is a curated, sourced seed, not an
  exhaustive list — deprecations grow one sourced entry at a time, same as renames.
- Four rename entries, each fact-checked against its cited source before adding:
  - **Databricks SQL** (formerly **SQL Analytics**) — the May 26, 2021 SQL release notes
    state the rename outright, including the `sql-analytics-access` → `databricks-sql-access`
    entitlement migration.
  - **Delta Lake** (formerly **Databricks Delta**) — the proprietary feature was
    open-sourced under the new name at Spark + AI Summit, April 24, 2019.
  - **Supervisor Agent** (formerly **Agent Bricks: Multi-Agent Supervisor**) — docs read
    "Supervisor Agent (formerly Multi-Agent Supervisor, MAS)"; GA February 2026.
  - **Genie Code** (formerly **Databricks Assistant**) — the Assistant docs now live at the
    same `/notebooks/code-assistant` page retitled to Genie Code (March 2026). The `note`
    flags that the launch blog frames this as a new Genie-family member, not an explicit rename.
- Sidebar dots for the new entries where they belong: **SQL Editor** → Databricks SQL,
  **AI/ML › Agents** → Supervisor Agent. Delta Lake and Genie Code stay reachable via Home,
  category chips, and search.

### Changed
- Renamed the data file `renames.json` → **`databricks.json`** (it now holds renames *and*
  deprecations); updated the fetch in `app.js`, the path in `validate.py`, and all docs.
- `validate.py` branches on `kind` with per-kind required fields (rename vs deprecation) and
  validates `deprecatedAt`/`removedAt`/`status`.
- `app.js` renders deprecations with an amber accent, a `deprecated`/`retired` badge, and an
  "old → replacement" (or "retired — no direct replacement") trail; search, sort, the
  day-counter, and the copy-correction toast now span both kinds. Sidebar dots added for
  dbx (Jobs & Pipelines) and Legacy dashboards (Dashboards).
- Site copy reframed to "renamed **or** deprecated" (rebricked = **re**named or de**pre**cated).

### Notes
- Triaged a large community/LinkedIn-sourced rename list. Deliberately **excluded**:
  Lakehouse Platform → Data Intelligence Platform (a 2023 repositioning that added the
  DatabricksIQ engine, per Databricks' own framing — not a same-thing rename); global init
  scripts → base environments (a deprecation/replacement); UniForm compatibility modes and
  MLflow trace storage wording (archival/positioning, not renames). Skipped as already
  covered: Jobs → Lakeflow Jobs, DLT, Databricks Asset Bundles → DABs, SQL Endpoint → SQL
  Warehouse, Databricks One → Genie One, Genie → Genie Spaces.
- Resolved from the prior "pending verification" list: SQL Analytics → Databricks SQL and
  Databricks Assistant → Genie Code (both now added). Still pending: Feature Store → Feature
  Engineering in Unity Catalog, OLTP Database → Lakebase Postgres.

## 2026-07-18 (earlier)

### Added
- Initial project: static site (`index.html`, `app.js`, `styles.css`), `renames.json`
  dataset, `CONTRIBUTING.md`, and `LICENSE`.
- Schema/format validator [`scripts/validate.py`](scripts/validate.py) — the CI gate that
  blocks malformed or unsourced entries.
- GitHub Pages CI: validate `renames.json`, then deploy.
- `.gitignore` to exclude the `.claude` directory.
- Six new rename entries, each verified against Databricks / Microsoft Learn docs:
  Catalog Explorer (Data Explorer), AI/BI Dashboards (Lakeview), Declarative Automation
  Bundles (Databricks Asset Bundles), Genie Agents (Genie Spaces), Genie One
  (Databricks One), and Databricks AI Search (Mosaic AI Vector Search).
- **Databricks-console UI redesign**: dark sidebar rail with the brick logo and grouped
  nav sections (Home/SQL/Data Engineering/AI/ML) mirroring the real console, a light
  content area, and a sticky top search bar. Sidebar items whose rename is in the dataset
  carry a red dot and filter to that history on click.
- `AGENTS.md` (contributor/agent guide) and this `CHANGELOG.md`.

### Changed
- Validated the existing dataset against current sources; clarified the DLT entry's `note`
  to reflect that Databricks docs increasingly shorthand it to "Lakeflow pipelines".
- Updated the `workflows` entry to note the sidebar now groups it as "Jobs & Pipelines".
- Reworked `styles.css` around CSS variables: light default with a `data-theme="dark"`
  toggle; the sidebar rail stays dark in both themes.
- `app.js` now generates the sidebar from a `NAV` config and links renamed items to search.

### Notes
- Deliberately excluded from the dataset: `dbx` (a deprecation, not a rename) and
  MosaicML → Mosaic AI / Redash (an acquisition and an absorption, not product renames).
- Still pending verification before adding: Databricks Assistant → Genie Code,
  Feature Store → Feature Engineering in Unity Catalog, OLTP Database → Lakebase Postgres,
  SQL Analytics → Databricks SQL. _(Genie Code and Databricks SQL were verified and added
  later the same day — see the section above.)_

<!--
Template for the next day:

## YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
-->
