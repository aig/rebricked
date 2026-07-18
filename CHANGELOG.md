# Changelog

All notable changes to **rebricked**, grouped by day.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

## 2026-07-18

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
  SQL Analytics → Databricks SQL.

<!--
Template for the next day:

## YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
-->
