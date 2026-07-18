# Changelog

All notable changes to **rebricked**, grouped by day.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

## 2026-07-18 (the "New" button gag — name predictions)

### Added
- **`prediction` field** on every rename and feature entry (29 of them) — a deliberately
  fictional *next* name for the product ("Genie Two", "Solid Clustering", "Workspaceless
  servers"…). It's the one made-up field in the schema; the validator allows it only as a
  non-empty string, warns if a deprecation carries one, and the UI always labels it as
  invented. Documented in CONTRIBUTING.md and AGENTS.md.
- **The "New" button now does the honest thing** — instead of creating anything, it opens
  an overlay explaining that around here products aren't created, they're renamed, and
  suggests a random product plus its predicted next name ("Suggest another" re-rolls,
  "see the entry" deep-links). Focus-trapped like the quiz; Escape/scrim close it.
- **Clickable logo** — the Rebricked brand in the rail is now a button that returns Home
  (and closes the mobile rail).

### Changed
- The odds badge now names its made-up future: "N% chance of becoming “<prediction>” by
  <year>" when the entry has one.

## 2026-07-18 (validation pass — fact-check fixes, CI gate restored, mobile nav)

Every entry was fact-checked against live official docs (36/42 confirmed as written,
6 corrected below), and the app/infra findings from the same audit were applied.

### Fixed (data — each verified against the cited source)
- **repos**: the Repos → Git folders rename happened **March 21, 2024**, not 2023
  (`renamedAt` and lineage now `2024-03`, per the March 2024 platform release notes).
- **vector-search**: the note claimed "renamed at GA on 2026-06-25" — the rename release
  note is dated June 1, 2026 and the service had been GA since May 2024.
- **uc-volumes**: GA was **February 22, 2024**, not "late 2023".
- **legacy-cli**: status → `legacy` — docs explicitly state no deprecation date or
  timeline has been established. Also fixed the "does no support" typo.
- **workspace-model-registry**: status → `legacy` — disabled for new UC-default accounts
  since April 2024, but docs describe deprecation as a future event.
- **hive-metastore**: the per-workspace re-enable applies only to accounts created before
  the December 2025 cutoff; new accounts have no restore path.
- Freshness: new SQL alerts GA'd May 2026; OAuth token federation GA'd Aug 26, 2025;
  ABAC GRANT policies entered Beta June 2026; bundles rename dated `2026-03`;
  legacy-dashboards upgrade-tool window is now past tense.

### Added
- **Mobile navigation** — a hamburger button and scrim; the rail was previously
  unreachable on narrow screens (nothing ever toggled `.sidebar.open`).
- **`legacy` deprecation status** (badge + "legacy since" wording) for things Databricks
  calls legacy without a formal deprecation.
- **Successor links** — deprecation cards link to the replacement's entry via
  `replacementId` (added the missing links: dbfs-mounts and dbfs-init-scripts →
  uc-volumes, pat → oauth-token-federation, no-isolation-shared → access-modes).
- **Shareable filter URLs** — rail section, category, lifecycle filter, and timeline year
  now serialize to `?s=` / `?cat=` / `?kind=` / `?year=` and restore on load.
- **CI validation restored** — `static.yml` runs `scripts/validate.py` before deploy
  (the step existed once and was lost in a workflow rework; docs claimed it still ran).
- **Validator hardening** — real month ranges, `removedAt ≥ deprecatedAt`, lineage
  chronology, category allow-list, future-`verified` rejection, `replacementId`
  integrity, and a NAV coverage cross-check against `app.js` (every entry must be
  reachable from the rail; every rail id must exist).

### Changed
- Five previously unreachable entries joined the rail: delta-lake, liquid-clustering,
  dbfs-mounts (Catalog), legacy-cli (Workspace), genie-code (Genie Agents).
- The footer "accurate as of" line is now driven by the newest `verified` date in the
  data instead of hardcoded prose.
- Mixed-precision dates ("2025" vs "2025-06") now sort correctly (bare years compare as
  mid-year); search highlighting no longer corrupts HTML entities; the quiz draws
  distractors from the whole dataset so questions always have 4 options; the roulette no
  longer writes an entry hash it isn't showing; the quiz dialog traps focus and restores
  it on close; `#search` gained a proper label; low-contrast metadata text was darkened
  to meet WCAG AA.
- Hardened `init()` — missing DOM elements and entries without `lineage` degrade
  gracefully instead of crashing the whole render.

## 2026-07-18 (fun pass — quiz, timeline, deep links)

A round of playful, no-dependency additions on top of the same data. No schema changes;
`databricks.json` and the validator are untouched.

### Added
- **Quiz mode** — an advertised "Take the quiz" call-to-action in the top bar opens an
  overlay that shows an old name and four current-name choices, tracks score + streak, and
  links straight to the matching entry. Draws its questions from renames (old → current) and
  deprecations that name a replacement.
- **Share on LinkedIn** — once you've answered a question the quiz shows a LinkedIn button
  that copies a ready-to-paste score brag and opens LinkedIn's share composer for the site.
- **Deep links / shareable URLs** — `#<entry-id>` opens a single entry on its own; `?q=<term>`
  reflects the search box. Each card gains a **link** action (copies the deep link) and a
  **copy card** action (a tidy 🧱 blurb for pasting into Slack/chat).
- **Year timeline** on Home — a small bar chart of changes per year; click a bar to filter,
  click again to clear.
- **"On this month" spotlight** on Home — surfaces a change from the current month (or the
  most recent one) with a "see it →" jump.
- **Brick confetti** 🧱 rains down when the roulette lands (respects
  `prefers-reduced-motion`).
- **Made-up odds gag** — each rename/feature card carries a deadpan, entirely-fictional
  "N% chance of another name by <year>" badge (deterministic per entry).
- **Rotating empty-state lines** so a no-results screen isn't the same joke every time.

## 2026-07-18 (auth, compute & editor entries)

Follow-up pass adding smaller-but-recognizable entries and refining one existing entry (33 → 42).
Every item fact-checked against a live doc; unverifiable candidates were deliberately left out.

### Added
- Deprecations (7): **Personal access tokens (PATs)** → OAuth (docs now title the page
  "(legacy)"); **Legacy SQL editor** → new SQL editor (retirement scheduled late July 2026);
  **Legacy SQL alerts** → new alerts; **Init scripts on DBFS** → UC volumes / workspace files
  (EOL 2023); **No isolation shared access mode** → Standard/Dedicated; **Legacy Databricks
  Connect** (≤12.2 LTS) → Spark-Connect-based Databricks Connect (13.3 LTS+).
- Renames (1): **Standard / Dedicated access modes** (formerly **Shared / Single user**),
  renamed March 2025, plus the new **Auto** mode.
- Features (2): **OAuth token federation** (the "kill the secret" replacement behind the PAT
  deprecation, Jan 2025) and **Databricks Clean Rooms** (GA on AWS/Azure, Feb 2025).
- Sidebar dots: **Workspace** → PATs + OAuth token federation + legacy Databricks Connect;
  **Compute** → access modes + no-isolation-shared + DBFS init scripts; **Catalog** → Clean
  Rooms; **SQL Editor** → legacy SQL editor; **Alerts** → legacy SQL alerts.

### Changed
- **Genie One** (formerly Databricks One) corrected: the rename happened in two steps
  (Databricks One → Genie in April 2026 → Genie One in June 2026), and the source now points at
  the docs page that explicitly states "Genie One was previously known as Databricks One" (the
  old source URL contained no rename wording).

### Notes
- Left out for lack of a firsthand-verifiable live doc: **Databricks-managed passwords / basic
  auth EOL** (both the AWS docs and Microsoft Learn pages failed to render actual content — the
  July 10, 2024 date is widely cited but I won't add what I couldn't read), and the **Partner
  Connect → Marketplace** sidebar consolidation (Partner Connect still ships as its own product,
  so it isn't a clean rename or deprecation).

## 2026-07-18 (platform release-notes sweep)

Swept every monthly platform release-notes page from July 2025 through July 2026 and added
nine verified entries (24 → 33). Each was fact-checked against its live source doc.

### Added
- Three renames:
  - **OpenSharing** (formerly **Delta Sharing**) — "Delta Sharing is now OpenSharing" (June 2026),
    a rebrand tied to open-sourcing the OpenSharing standard.
  - **Databricks ODBC Driver** (formerly **Simba Spark ODBC Driver**) — renamed February 2026;
    existing DSNs keep working while the legacy driver is installed.
  - **Lakeflow Pipelines Editor** (previously the **multi-file editor**) — Public Preview
    September 2025, GA May 2026; the doc URL still ends in `/multi-file-editor`.
- One deprecation: **Hive metastore** → Unity Catalog. Positioned as a legacy feature; accounts
  created after December 18, 2025 have no Hive metastore access by default.
- Five features: **Lakebase** (managed serverless Postgres/OLTP, GA Jan 2026), **Lakeflow
  Designer** (no-code visual ETL, GA Jun 2026), **Attribute-based access control (ABAC)** in
  Unity Catalog (GA Apr 2026), **Unity Catalog managed Iceberg tables** (GA May 2026), and
  **Serverless workspaces** (GA Jan 2026).
- Sidebar dots for the new entries: **Workspace** → Serverless workspaces; **Catalog** →
  OpenSharing + Hive metastore + ABAC + managed Iceberg; **Jobs & Pipelines** → Pipelines
  Editor; **Compute** → Lakebase; **SQL Warehouses** → ODBC Driver; **Visual Data Prep** →
  Lakeflow Designer.

### Notes
- Confirmed the existing **Databricks AI Search** entry against the June 2026 "Vector Search is
  now AI Search" rename — already correct, no change.
- Deliberately excluded from the sweep, to hold the catalog's bar: routine model-catalog
  retirements (e.g. Gemini 2.5 Flash, Claude Sonnet 4), UI-label-only tweaks (SQL section →
  Lakehouse), and niche schema/log-table deprecations. The "Lakeflow Declarative Pipelines →
  Lakeflow Spark Declarative Pipelines" (Nov 2025) claim was left out: the live `/ldp/` docs use
  fluid naming that contradicts a clean rename, and being confidently wrong is the one thing this
  project won't do.

## 2026-07-18 (features & lifecycle filter)

### Added
- **New features are now first-class — a third `kind`.** Alongside renames and deprecations,
  entries can be `kind: "feature"`: a genuinely new capability worth tracking on the timeline,
  with `introducedAt` and a `status` of `ga`/`preview`. Rendered in green with a `new`/`preview`
  badge. Seeded with three verified features: **Liquid Clustering** (GA on DBR 15.4 LTS),
  **Unity Catalog Volumes** (the replacement for DBFS mounts), and **Lakehouse Federation**.
- **Lifecycle filter** above the results: **All / Renamed / Deprecated & removed / New
  features**, each with a live count. Orthogonal to search, category chips, and rail sections;
  Home and the roulette reset it to All.
- Two verified deprecations, resolving items from the prior "pending" list:
  **Workspace Model Registry** → Models in Unity Catalog (stages replaced by aliases), and
  **Workspace Feature Store** → Feature Engineering in Unity Catalog (workspaces created
  before Aug 19, 2024 only).
- One verified rename: **Model Serving** (formerly **Serverless Real-Time Inference**) — the
  March 2023 release notes state "Model Serving, formerly Serverless Real-Time Inference, is
  now generally available" (March 7, 2023).
- Sidebar dots for the new entries: **Catalog** → UC Volumes + Lakehouse Federation,
  **AI/ML › Models** → Workspace Model Registry, **AI/ML › Features** → Workspace Feature
  Store, **AI/ML › Serving** → Model Serving.

### Changed
- `validate.py` gained a `feature` kind (required `name`/`introducedAt`, optional
  `ga`/`preview` status; warns on stray rename/deprecation fields) and validates `introducedAt`.
- `app.js` renders features (green accent, `featureTrail`, click-to-copy "yes, that's real"),
  adds the `kindOf` bucket + the lifecycle filter, and folds `introducedAt` into `changedAt`
  and the day-counter. `CONTRIBUTING.md` / `AGENTS.md` document the feature kind and filter.

### Notes
- **Validated an AI-generated "Databricks feature lifecycle" report and integrated only the
  verifiable parts.** Confirmed against live docs before adding: Workspace Model Registry,
  Workspace Feature Store, Liquid Clustering, UC Volumes, Lakehouse Federation, and the
  Serverless Real-Time Inference → Model Serving rename.
- **Deliberately excluded as unverifiable / fabricated:** the entire GenAI model-retirement
  table — it lists models that don't exist ("GPT-5.6 Sol", "GPT-5.5", "Gemini 3.5 Flash",
  "Claude Sonnet 4.6", "Gemini 3.1 Pro") with invented retirement dates. Also skipped for now:
  Jobs API 2.0/2.1 "deprecated" (the 2.2 doc documents behavior changes but does **not** call
  2.0/2.1 deprecated), Z-Order "deprecated" (still supported — captured instead as the Liquid
  Clustering feature it's recommended against), and the many governance/runtime claims (Hive
  metastore, no-isolation compute, SCIM, DBFS root, JDK/library removals, "Cluster → Compute",
  "DLT → Lakeflow Pipelines" wording) that are plausible but weren't each fact-checked to this
  repo's bar. They can be added later, one sourced entry at a time.

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
