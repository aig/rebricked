# Changelog

All notable changes to **rebricked**, grouped by day.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

## 2026-07-23 (Maturity "By stage" chart lens + AI Gateway / AI Runtime entries)

### Added
- **"By stage" lens on the Home chart.** The "Changes by year" card gained a "By year /
  By stage" tab switch. The stage lens shows current release maturity (Private Preview ->
  Beta -> Public Preview -> GA) as ordered horizontal bars - the ordered, GA-heavy funnel
  reads far better as bars than a pie. Display-only: it reads the whole dataset and doesn't
  touch the status filter or the list. It counts only **live** entries (`bucketOf === "current"`)
  - renamed and deprecated names are excluded, since maturity is moot for a former or retiring
  name - and hides zero-count stages. New: `tlView` state, `tlTabsHTML`/`wireTlTabs`,
  `stageData`, `renderStageTimeline` in `app.js`; `.tl-tabs`/`.tl-tab` and `.tl-stage` styles
  in `styles.css`; a `timeline-view` analytics event.
- **Two feature entries: AI Gateway and AI Runtime (GPU serverless).** AI Gateway (Mosaic AI
  Gateway) - `AI / ML`, active/GA (Public Preview 2024-09 -> GA 2025-06). AI Runtime (GPU
  serverless) - `Compute / BI`, active/Public Preview (Beta 2025-06 as "Serverless GPU
  compute" -> Public Preview 2026-03; the distributed multi-GPU training API remains Beta).
  Both wired into `app.js` `NAV` (`ai-runtime` under Compute, `ai-gateway` into the existing
  AI Gateway rail item). `python scripts/validate.py`: 80 entries valid.
- **Feature entry: Secrets in Unity Catalog.** `Data governance`, active/Public Preview
  (2026-07). Secrets as governed securables in the three-level namespace
  (`catalog.schema.secret`), distinct from the older workspace-scoped Secrets API. Wired into
  `app.js` `NAV` under Catalog. `python scripts/validate.py`: 81 entries valid.
- **Eight more Preview/Beta feature entries** (found by scanning the 2026 release notes for
  marquee, standalone products not yet tracked; connectors and `[adjacent]` sub-features
  excluded). Public Preview: **Mission Critical** (DR + ESC workspace add-on, 2026-06,
  Data governance), **SecureConnect** (OpenSharing behind a firewall, 2026-06, Data
  governance), **Managed Iceberg materialized views** (2026-07, Data engineering). Beta:
  **Discover** (UC discovery page + business domains, 2026-02, Data governance),
  **Lakebridge Agentic Converter** (legacy-SQL-to-ANSI migration agent, 2026-07, Developer
  experience), **Lakehouse Replay** (runtime regression testing, 2026-06, Developer
  experience), **Standalone pipelines** (serverless general-compute pipelines, ex "DBSQL
  pipelines", 2026-05, Data engineering), **Declarative Feature Engineering** (Feature Views,
  2026-03, AI / ML). Wired into `app.js` `NAV` (Workspace, Catalog, Compute, Discover, Jobs &
  Pipelines, AI/ML Features). `python scripts/validate.py`: 89 entries valid.

### Added
- **`limitations` field: a sourced `{ note, link, date }`** on any entry - a short summary of a
  feature's officially documented limitations, the docs page it came from, and the date fetched.
  Plumbing: `validate.py` validates the shape (note non-empty, link an http(s) URL, date a real
  non-future `YYYY-MM-DD`); `app.js` renders a "Limitations" line on the card (`limitationsHTML`,
  `.row-limitations` styles, amber-keyed); documented in `AGENTS.md` and the add-entry skill.
- **Populated limitations for 12 features** (subset), each looked up on its official Databricks
  docs page and fetched 2026-07-23: AI Runtime, Secrets in Unity Catalog, Lakehouse Replay,
  Lakebridge Agentic Converter, Mission Critical, SecureConnect, Discover, Standalone pipelines,
  Databricks Apps, Managed Iceberg materialized views, Declarative Feature Engineering, and Genie
  Agents. AI Gateway and Lakebase were checked but their docs list no limitations, so the field
  was omitted rather than invented.

## 2026-07-22 (Agent Bricks + status/release model rework)

### Changed
- **Renamed the data file `databricks.json` → `databricks.features.json`** (first step of a
  data-file refactor). Updated every reference: the `fetch()` and error message in `app.js`,
  the `DATA` path in `scripts/validate.py` and `scripts/build_entries.py`, plus docs
  (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, the add-entry skill), `.gitignore`, the CI
  workflow labels, and `COVERAGE-GAPS.md`. `git mv` preserved history.
- **The `active` status badge is no longer shown on cards.** `active` is the default state,
  so its badge was noise; only the noteworthy lifecycle states (renamed / deprecated / legacy
  / retired) now render a status badge. The release pill still shows on active cards, so an
  active card reads as just its release pill (+ lineage chain). `statusBadge()` (app.js) and
  `badge_html()` (build_entries.py) return no status badge for `active`.
- **Release stages can be announced-but-unreached (`is_announced: true`); dropped `pre-ga`.**
  A `releases` stage is now either reached - `{type, date}` - or merely announced -
  `{type, is_announced: true}` (no date, only allowed as the last stage). That removes the
  need for a `pre-ga` type: "GA approaching soon" is just `{type: "ga", is_announced: true}`.
  Valid `type`s are now `private-preview` / `beta` / `public-preview` / `ga`. The pill renders
  an announced stage as "<Stage> soon" with a dashed border (`badge-rel-soon`); the teal
  `--rel-pre-ga` token/class were removed. `validate.py` enforces date-XOR-is_announced and
  announced-only-last. (No data used `pre-ga` or an announced stage yet, so no entries changed.)
- **`release` (single value) became `releases` (a `{type, date}` timeline).** Each entry now
  records the ordered stages it passed through with the date it entered each - e.g.
  `information-extraction` is `[{beta, 2025-06}, {public-preview, 2026-03}]`. The last stage
  is the current maturity, so the pill shows it and the tooltip lists the whole history
  ("Beta 2025-06 -> Public Preview 2026-03"). Populated for all 42 entries that had a
  `release`, drawing each stage date from the entry's own sourced note; foundational GA
  products with no documented preview history get a single `{ga, <date>}`. `validate.py`
  checks each `{type, date}` (valid stage type, `YYYY`/`YYYY-MM`, chronological order);
  `releasePill`/`release_pill` read the last stage; docs updated.
- **Badges now show the real `status` value, with the `release` badge on the right.** Dropped
  the `"latest"`/`"new"` aliases - the lifecycle badge reads the literal status
  (`active`, `renamed`, `deprecated`, `legacy`, `retired`) as the top-left bookmark, and the
  release-stage pill (Beta / Public Preview / ...) mirrors it on the card's top-right corner.
  `statusBadge()`/`releasePill()` in `app.js`, `badge_html()`/`badge_label()` in
  `build_entries.py`, and the `.row-eyebrow` bookmark positioning in `styles.css` were updated
  together.
- **Dropped the `kind` field; `status` is now the sole discriminator.** `kind`
  (`rename`/`deprecation`/`feature`) was fully derivable from `status`, so it was removed
  from all 78 entries. `kindOf()` (app.js) and `kind_of()` (build_entries.py) now derive the
  logical family from `status` instead of reading a field, so no downstream rendering changed.
  Updated `validate.py` (status-keyed required fields, new `status_group()` helper) and the
  schema docs in `AGENTS.md`, `CONTRIBUTING.md`, and `agents/add-databricks-entry.md`.
- **Dropped the `current` status; every live name is now `active`.** `current` (the tip of a
  rename chain) was itself derivable, so it's gone too. Whether an `active` card is a
  standalone feature or a current rename tip is now **calculated** - a feature carries its own
  `introducedAt`, a rename tip carries `from` (and has a `renamed` card pointing at it) - so
  the redundant status value isn't stored. The status set is now
  `active` / `renamed` / `deprecated` / `legacy` / `retired` (42 active, 22 renamed, 14
  deprecation). The validator requires an `active` card to carry exactly one of
  `introducedAt`/`from` and no `to`; `kindOf`/`kind_of` derive feature-vs-tip from that.


### Added
- **Populated `release` on every active entry, verified against docs.** Set explicit
  `release: "ga"` on all 39 GA `active` entries (from each entry's own sourced GA date, or -
  for four 2026 items past easy reach: Genie One, Genie Agents, Classification, Databricks
  OpenSharing - confirmed GA against live docs). The two pre-GA entries keep their stage
  (`information-extraction` public-preview, `lakehouse-real-time` beta), and `agent-bricks`
  is intentionally left unset (its own note records there was no single "Agent Bricks GA"
  event - capabilities GA'd individually). `release` is only carried on live (`active`)
  names plus the still-in-Beta legacy `custom-llm`; superseded/retired cards omit it (their
  maturity is historical). Every set `release` renders a right-side pill on its own cool-hue
  ramp - violet (private preview) -> indigo (beta) -> blue (public preview) -> teal (GA soon)
  -> solid green (GA); pre-GA dashed, GA solid. The ramp stays clear of the warm renamed/
  deprecated and slate legacy lifecycle colors. New `--rel-*` tokens (light + dark) in
  `styles.css`; only entries with no `release` show no pill.
- **Five Agent Bricks entries.** The umbrella brand and its capabilities, each sourced
  against live Databricks docs: `agent-bricks` (umbrella, feature), `information-extraction`
  (feature, Public Preview), `knowledge-assistant` (feature, GA Jan 2026), `classification`
  (feature), and `custom-llm` (deprecation, `legacy`). All wired into the AI/ML → Agents
  rail. The launch capabilities all shipped 2025-06 at Data + AI Summit (not the earlier
  dates the gap report guessed), and "Knowledge Assurance" was confirmed a non-name -
  it is Knowledge Assistant.

### Changed
- **Split `status` into two orthogonal axes: `status` (lifecycle) + `release` (maturity).**
  `status` previously overloaded lifecycle and release maturity - features used it for
  `ga`/`preview` while renames/deprecations used it for lifecycle. Now `status` is purely
  lifecycle (live names `active`; superseded names `renamed`; deprecations
  `deprecated`/`legacy`/`retired`), and a new optional `release` axis carries Databricks'
  own maturity stages: `private-preview` → `beta` → `public-preview` → `pre-ga` → `ga`
  (omit when GA). This lets a card be `active`-but-`public-preview` or `legacy`-but-`beta` -
  e.g. Agent Bricks Custom LLM, which shipped as Beta and was later marked legacy without
  ever reaching GA. Migrated all 19 pre-existing feature entries (`ga`→`active`; the two
  preview features gained a `release`). Updated `scripts/validate.py`, `scripts/build_entries.py`,
  `app.js` (new `releasePill()` + amber maturity pill), `styles.css`, and the schema docs
  in `AGENTS.md`/`CONTRIBUTING.md`.

## 2026-07-21 (lineage navigation)

### Changed
- **Clicking a lineage chain node now scrolls to that card instead of collapsing to a
  single card.** Focusing an entry (`#id` deep link, or a chain hop) renders the entry's
  whole lineage family - every predecessor, the entry itself, and every successor - as one
  stacked list, sorted like the main list. Clicking any chain node scrolls to the target
  sibling card in place (with the existing flash highlight) rather than rebuilding the view
  around just that card. New `lineageFamily()` helper, extracted `byRecency()` comparator,
  and `rowEl()` / `scrollRowIntoView()` helpers; chain-node clicks are intercepted in
  `wireRows()` and fall through to the normal `#id` route when the target isn't on screen.

## 2026-07-20 (legacy dashboards lineage)

### Added
- **Origin card for "Databricks SQL dashboards".** The dashboards shipped with SQL Analytics
  (public preview Nov 18, 2020), built on the Redash tech Databricks acquired that June, and
  were only relabeled "legacy dashboards" in 2023 when Lakeview arrived. Added the
  `databricks-sql-dashboards` rename card (`successorId` -> `legacy-dashboards`) so that first
  name is its own hop, moved the naming aliases (`DBSQL dashboards`, `Redash dashboards`) and
  the Redash-acquisition links onto it, and wired it into the Dashboards rail. Full chain is
  now Databricks SQL dashboards -> Legacy dashboards -> Lakeview dashboards -> AI/BI Dashboards.

### Changed
- **Lineage arrows now carry the color of each hop's change, not the viewed card's.**
  Every `→` in the chain took the current card's `--state`, so a mixed lineage rendered
  in one flat color. Each arrow is now colored by its left node - the thing that changed:
  amber for a deprecation hop, orange for a rename, green at the live tip. New
  `.flow-*` modifier classes on `.chain-flow`, keyed off the source node's status.

### Fixed
- **`no-isolation-shared-access-mode` now chains through Shared / Single user.** Its
  `successorId` pointed straight at `standard-and-dedicated-access-modes`, skipping the
  intermediate hop. Rerouted it to `shared-single-user-access-modes` (which already succeeds
  to Standard/Dedicated) and updated `replacement` to match, so the chain is contiguous:
  No isolation shared -> Shared / Single user -> Standard and Dedicated.
- **`databricks-apps` was unreachable from the rail, failing the CI validate gate.** The Apps
  entry had no NAV section, so `validate.py` errored and the deploy blocked. Added an "Apps"
  rail item (new app-launcher icon) wired to `databricks-apps`.

### Docs
- **Folded this session's lessons into the `add-databricks-entry` skill and pointed AGENTS.md
  at it.** The skill now covers prepending an origin card (vs. inserting a middle rename), the
  retronym case (a "legacy X" deprecation label deserving its own origin `rename` card), the
  one-card-owns-its-own-aliases/links rule, and re-verifying + bumping `verified` when editing
  an existing card; its trigger now includes correcting/re-chaining, not just adding. AGENTS.md
  now directs readers to follow the skill for any add **or** edit instead of hand-rolling the flow.

### Changed
- **Rerouted the legacy dashboards successor through Lakeview.** `legacy-dashboards`
  pointed straight at `ai-bi-dashboards`, skipping the intermediate `lakeview-dashboards`
  card (which itself chains to `ai-bi-dashboards`). Repointed `successorId` to
  `lakeview-dashboards` (and `replacement` to "Lakeview dashboards") so the rename chain is
  continuous: Legacy dashboards -> Lakeview dashboards -> AI/BI Dashboards.
- **Verified the `legacy-dashboards` timeline against Databricks docs.** Rewrote the `note`
  from the archived legacy-dashboards doc and the clone-to-AI/BI migration guide: new legacy
  dashboards already disabled, dismissable warning dialog Nov 3 2025, direct access + APIs
  ended Jan 12 2026, migration page/upgrade tool available until Mar 2 2026 (when remaining
  legacy dashboards were deleted). Repointed `source` at the archived doc, added the
  clone-to-AI/BI guide as a link, and bumped `verified` to 2026-07-20.
- **Verified the `lakeview-dashboards` entry against Databricks docs.** Pinned the public
  preview to September 28, 2023 (AWS/Azure first, GCP in H1 2024) with `from` now `2023-09`;
  rewrote the `fact` (new visualization engine, larger charts up to 10x faster, draft/publish,
  Unity Catalog lineage, Databricks Assistant), added an `occasion` and a `note` on the
  "Lakeview" codename and the retitled announcement blog, repointed `source` at that blog,
  swapped in the 2023 Databricks SQL release notes as a link, and bumped `verified` to
  2026-07-20.
- **Trimmed `legacy-dashboards` to just the deprecation story.** With the original name now
  its own card, dropped the naming aliases and the Redash-acquisition links from this card
  (moved to `databricks-sql-dashboards`), rewrote `what`/`fact` to focus on the retirement, and
  reframed the `note` as the deprecation-era relabel plus the EOL timeline.

## 2026-07-19 (Genie rename lineage)

### Added
- **Intermediate "Genie" rename card.** The Databricks One lineage was a single hop
  (`databricks-one` -> `genie-one`); it actually went Databricks One -> **Genie**
  (Apr 27, 2026) -> Genie One (Jun 9, 2026). Added the `genie` card, repointed
  `databricks-one` at it, updated `genie-one` (aliases/occasion/note), and wired `genie` into
  the "Genie Agents" rail section. Sourced from the AI/BI 2026 release notes.

### Changed
- **Documented inserting an intermediate rename.** [AGENTS.md](AGENTS.md) and
  [agents/add-databricks-entry.md](agents/add-databricks-entry.md) now spell out repointing the
  predecessor's `successorId`/`to` when a new name lands between two already-chained cards.

## 2026-07-19 (home quiz banner)

### Added
- **Responsive quiz badge banner.** The home-page introduction now includes a badge-themed
  quiz invitation: it sits beside the copy and the monthly spotlight on desktop, and spans the
  full width beneath them on phones. It opens the existing in-app quiz and records its own
  anonymous CTA source. Its larger certificate emblem sits on a matching dark badge tile, with
  the reward and sharing flow explained in the CTA itself.

## 2026-07-19 (named quiz badges)

### Added
- **Named quiz badges.** After completing the quiz, players enter a first and last name before
  opening their badge. The values live only in its URL (`first` and `last` query parameters),
  and the static badge page reads them client-side - no backend or account needed.
  Social preview images remain score-based because static Open Graph metadata cannot vary per URL.
  Badge pages also include a LinkedIn share button that keeps those query parameters in the
  shared link.

## 2026-07-19 (status-based filter, palette, colour-coded timeline, analytics)

### Changed
- **Ids now follow the name, and the gate enforces it.** Every card's `id` is the kebab
  slug of its own `name` (parenthetical qualifiers dropped), so a deep link always lands on
  the card for the product named in the link - and when that product was renamed, the card
  shows it. 31 ids were normalised (e.g. `workflows` → `lakeflow-jobs` with the former name
  reclaiming `workflows`; `dlt` → `lakeflow-declarative-pipelines`; `abac` →
  `attribute-based-access-control`), with all `successorId` pointers and the `app.js` NAV
  updated to match. `validate.py` gained a hard check that `id == name_slug(name)`. **Ids are
  permanent from here on:** a rename adds a new card, it never re-slugs an existing id. Old
  deep links to the retired ids no longer resolve (no redirects). Contributor/agent docs
  updated to match.
- **Merged `state` into `status` - one lifecycle field per card.** Renames previously used
  `state` (`current`/`renamed`) while deprecations/features used `status` and redundantly
  copied it into `state` (they were always equal). Now every card carries a single `status`
  whose vocabulary depends on kind: `current`/`renamed` (rename), `deprecated`/`legacy`/
  `retired` (deprecation), `ga`/`preview` (feature). Rename cards' `state` migrated to
  `status`; the mirror copies were dropped. `validate.py`, `app.js`, and the contributor/agent
  docs updated to match. No visible behaviour change - badges render identically.
- **PAT reclassified `deprecated` → `legacy`.** Personal access tokens have no formal
  deprecation date (the docs page is titled "…(legacy)"), so they now match the same
  convention as the legacy CLI and Workspace Model Registry.
- **The filter is now status-based, not kind-based.** Buckets are **Active / Renamed /
  Deprecated**, keyed on the badge a card shows (`bucketOf`) rather than raw `kind`. A
  new feature, a preview, and the current-name side of a rename all count as **Active**;
  only superseded former names are **Renamed**. Unchecking **Active** now hides current
  names too (previously they stayed, filed under the old rename bucket). The empty-state,
  URL `kind=` param, and filter tooltips follow the new keys.
- **New status palette via dedicated tokens.** `--c-active` (emerald), `--c-renamed`
  (slate), `--c-deprecated` (amber), each with a light **and** dark value - the old green
  never adapted to dark mode. Badges, card left-stripes, and timeline segments all read
  from these tokens; the Databricks brand red (`--accent`) is now chrome-only. The solid
  "retired" badge uses a theme-aware `--c-deprecated-ink` so its text stays legible on the
  light-in-dark-mode amber.
- **Badge wording.** `former name` → `renamed`; the current-name badge `current` → `latest`.
- **Logo relaid out as a one-height lockup.** The emblem (unchanged), the inverted **RE**
  chip, and a stacked **bricked** / **latest edition** block now sit in a single row, all
  sized to the same height, matching the wordmark. Previously "REbricked" was one small text
  line with the edition tag beneath the whole word.
- **Year timeline is dynamic.** Each year's bar is now a stacked, colour-coded column
  (Active / Renamed / Deprecated) with a legend, and it re-renders live as the filter
  toggles - hiding a bucket rescales the plot instead of blanking it. Title is now
  "Changes by year".
- **Home extras persist across filtering.** The timeline and the "on this month" spotlight
  no longer key off `allKindsSelected()`, so toggling a filter (or, for the spotlight,
  selecting a year) keeps them visible instead of hiding the whole panel.

### Added
- **Cookieless analytics (Umami).** No cookies, no personal data, no consent banner. A
  guarded `track(name, data)` helper records anonymous custom events (filter toggles, nav,
  debounced searches, quiz opens, roulette, shares, timeline-year, theme). Every call is
  wrapped so a blocked or absent script can't affect the app.
- **UTM-tagged share links.** `withUTM(url, params)` appends UTM params (kept before any
  `#fragment`) to the card and quiz LinkedIn share URLs, so shared traffic attributes in
  Umami. Card shares carry the entry id as `utm_content`.

### Fixed
- **Card header on phones.** The wide "✨ Guess a new name using AI" pill was pinned in a
  `flex-shrink:0` group top-right, so on a narrow card it held its full width, wrapped the
  title to two lines, and pushed the status badge and category onto rows of their own. On
  `≤640px` the right-hand group now collapses into the card flow (`display:contents`): the
  compact action icons stay pinned beside the title and the pill drops to its own full-width
  row underneath. `.row-head-left` grows from `flex-basis:0` so a wide title never bumps the
  icons onto a separate line (regression seen on badge-only cards like deprecations). The
  override lives at the end of the stylesheet so it wins the cascade over the base
  `.row-head-right` rule - media queries add no specificity.

## 2026-07-19 (card header reflow; click-to-copy correction fix)

### Fixed
- **Clicking a card title no longer mislabels an old name as the current one.** A *former*
  name (a `"renamed"` card) or a *deprecated* name used to copy "Actually, it's called
  '<that name>' now" - presenting the superseded name as current. A former-name title now
  copies the name it actually became (`Actually, "X" is the old name - it's "Y" now.`), and
  deprecated titles - previously not clickable at all - now copy `Actually, "X" is
  deprecated - use "Y" now.` (or just "…is deprecated." when nothing replaced it). Current
  names and features are unchanged. Each former/deprecated card carries its resolved current
  name (`data-current`, via `currentNameOf`) so the correction points forward; `.dep-name`
  gained a pointer cursor now that it's clickable.

### Changed
- **Card header reflowed.** The title now leads the card (moved above the metadata row). Its
  first row groups the name with its status badge (`current` / `former name`) and category
  tag on the left, and pins the **✨ AI-guess** pill together with the copy-link and
  share-on-LinkedIn icons to the top-right. The date / rename-history line ("current since …
  · Renamed to …") drops to its own row beneath. Previously the meta row led and the action
  icons sat bottom-right.
- Rendering split into `.row-head-left` / `.row-head-right`; `.cat` was un-scoped from
  `.row-meta` so the category tag keeps its chip styling in the header; the mobile rule that
  stacked the odds pill under the title is gone - the pill now wraps within the header's left
  group as the card narrows.

## 2026-07-18 (one card per name - the rename-split)

### Changed
- **Every historical name is now its own card.** The `lineage` array is gone; a rename
  creates a new `"current"` card and "freezes" the old one as a `"renamed"` card, linked by
  a single **`successorId`**. Predecessors are derived (any card whose `successorId` points
  here), so a card shows its whole history in both directions as linked, jump-to cards.
  50 entries → **71 cards**.
- **Unified link model**: `successorId` replaces both `lineage` and the deprecation
  `replacementId`. New per-card fields: `name`, `from`, `to`, `state` (`current`/`renamed`).
- **Cards** now show a state badge (`current` / `former name`), a **Successor** and
  **Predecessors** section of linked cards, and self-contained facts. Every one of the 21
  new frozen cards got its own researched, verified fun-fact and community/internet links.
- Validator, card rendering, NAV, filters (Renamed 19→40), timeline (each name counts at
  its own year), search, and the quiz were all migrated to the new model.

### Reference links (earlier the same day)
- **Every entry carries verified reference links** - `official` (docs), plus researched
  `community` and `internet` links, rendered as classified chips. Nothing fabricated; each
  URL was fetch-checked.

## 2026-07-18 (facts over pricing; icon card actions)

### Changed
- **`price` → `fact`.** The per-entry line is now a real-but-fun fact *about the feature*
  (what it does, how it works, its rename history, a documented quirk or codename) instead
  of a tongue-in-cheek pricing quip. All 43 entries rewritten; rendered as a `.row-fact`
  line (💡) and carried into the share blurb. `fact` is the new required field - validator,
  [`CONTRIBUTING.md`](CONTRIBUTING.md), [`AGENTS.md`](AGENTS.md), and the
  `add-databricks-entry` agent guide updated to match.
- **Card actions are now an icon toolbar** in each card's **bottom-right** corner (the
  conventional spot). "copy card" is replaced by **share on LinkedIn**; the copy-link and
  source links became icon buttons alongside it.

### Mobile
- On phones the top search bar now takes its own full-width row so it's no longer squeezed
  by the menu and action buttons.

## 2026-07-18 (new field - funny-but-accurate pricing)

### Added
- **Every entry now carries a `price`** - a deadpan one-liner on what the thing costs,
  rendered as a `.row-price` line on each card and appended to the "copy card" blurb. The
  jokes are ours; the billing facts underneath are real and sourced (DBUs, SKU tiers like
  DLT Core/Pro/Advanced and SQL Warehouse Classic/Pro/Serverless, the ~$0.70/DBU serverless
  premium, egress, "included at no additional cost", etc.). Fact-checked against official
  Databricks / Microsoft Learn docs and the pricing pages.
- `price` is now a **required** field (validator enforces a non-empty string); documented in
  [`CONTRIBUTING.md`](CONTRIBUTING.md), [`AGENTS.md`](AGENTS.md), and the
  `add-databricks-entry` agent guide.

### Changed
- **Genie Code** pricing corrected: reflects the July 8, 2026 move of Genie products to
  pay-as-you-go (per-user free monthly LLM allowance, then DBUs) - it is no longer "no
  additional cost."
- **Lakehouse//RT** pricing corrected: it has a *public* serverless-DBU rate (30% intro
  discount through Jan 2027), not "contact your account team."
- **Clean Rooms** pricing corrected: there is a per-collaborator platform fee on top of the
  in-room compute - the room is not free.
- **No isolation shared** pricing corrected: no discounted DBU rate; the DBUs cost the same.

## 2026-07-18 (new feature - Lakehouse//RT)

### Added
- **Lakehouse Real-Time (Lakehouse//RT)** - a `feature` entry for Databricks' new serverless
  real-time analytics engine (powered by *Reyden*), delivering sub-second SQL reads on Unity
  Catalog tables. Announced June 16, 2026; currently in Beta (`status: preview`). Filed under
  **Compute / BI** and wired into the **SQL Warehouses** rail section.

## 2026-07-18 (harder quiz - multiple funny predictions)

### Changed
- **`prediction` is now an array** of funny-but-plausible next names (2–3 per entry, e.g.
  `dlt` → "Genie Pipelines", "Lakeflow Agentic Pipelines", "Unity Pipelines") instead of a
  single string. Validator now requires a non-empty array of non-empty strings.
- **The quiz is harder**: each question seeds its wrong answers with the asked product's
  *own* fake future names - the most tempting distractors - before filling from every other
  real and predicted name in the dataset.
- **Cards show "AI guesses"**: the "✨ AI guess" button now reveals the whole shortlist
  ("AI guesses: A, B, or C") drawn from the same `prediction` array.
- The "New" button suggestion picks a random name from the array each time.

## 2026-07-18 (shareable quiz badges)

### Added
- **A badge page per quiz result** - `badges/<n>-of-5/` for every score 0–5. Each shows a
  stylized Databricks-style **certification crest** (hexagon medallion + ribbon, "REBRICKED
  CERTIFIED") with a **5-star rating** (n filled) and a funny achievement (e.g. 5/5 =
  "Keeper of the Renames", 0/5 = "Rip Van Rebrand"), rendered as a screen inside the app
  chrome (sidebar rail + top bar) with Open Graph tags. The crest, stars, score, and card
  border follow one ascending tier ladder - Stone → Bronze → Silver → Gold → Platinum →
  Diamond (0→5) - so the colour reads the rank. Generated by
  [`scripts/build_badges.py`](scripts/build_badges.py) (rerun after editing the copy); the
  folders are committed so there's still no deploy-time build.
- **A 1200×630 `og.png` per badge** rendered from an inline card (via headless Edge/Chrome
  at build time), so the LinkedIn/Twitter preview shows the actual badge image, not just
  text. `og:image`/`og:url` are absolute (base `https://rebricked.org`).
- The **stacked-brick Rebricked logo** now serves as the favicon everywhere (replacing the
  🧱 emoji tab icon) and appears as the wordmark on the badge pages and the og image.
- The **wordmark** now sets "RE" in an inverted chip - **RE**bricked - in the sidebar,
  the badge pages, and the og image (the "re-" of re-named/de-pre-cated).
- The quiz results screen gains a **"See your badge ↗"** link, and each badge page's
  "Take the quiz" button carries the score back as a `?quiz=` challenge.

### Changed
- **The LinkedIn share now links to the badge page** instead of a bare `?quiz=` URL, so the
  shared post previews the badge. The share button is now shown **only once a round is
  finished** (it used to appear after the first answer, which had no badge page to link to).

## 2026-07-18 (the "New" button gag - name predictions)

### Added
- **`prediction` field** on every rename and feature entry (29 of them) - a deliberately
  fictional *next* name for the product ("Genie Two", "Solid Clustering", "Workspaceless
  servers"…). It's the one made-up field in the schema; the validator allows it only as a
  non-empty string, warns if a deprecation carries one, and the UI always labels it as
  invented. Documented in CONTRIBUTING.md and AGENTS.md.
- **The "New" button now does the honest thing** - instead of creating anything, it opens
  an overlay explaining that around here products aren't created, they're renamed, and
  suggests a random product plus its predicted next name ("Suggest another" re-rolls,
  "see the entry" deep-links, "suggest yours" first asks you to type a name, then - via a
  rotating deadpan refusal - explains that naming is done to you, not by you).
  Focus-trapped like the quiz; Escape/scrim close it.
- **Clickable logo** - the Rebricked brand in the rail is now a button that returns Home
  (and closes the mobile rail).

### Changed
- Each rename/feature card shows a static **"~N% chance of another rename by <year>"**
  probability, plus an **"✨ AI prediction" button** that "thinks" for a beat and then
  reveals the made-up next name - "AI predicts: <prediction>" (respects
  `prefers-reduced-motion` by skipping the delay).

## 2026-07-18 (validation pass - fact-check fixes, CI gate restored, mobile nav)

Every entry was fact-checked against live official docs (36/42 confirmed as written,
6 corrected below), and the app/infra findings from the same audit were applied.

### Fixed (data - each verified against the cited source)
- **repos**: the Repos → Git folders rename happened **March 21, 2024**, not 2023
  (`renamedAt` and lineage now `2024-03`, per the March 2024 platform release notes).
- **vector-search**: the note claimed "renamed at GA on 2026-06-25" - the rename release
  note is dated June 1, 2026 and the service had been GA since May 2024.
- **uc-volumes**: GA was **February 22, 2024**, not "late 2023".
- **legacy-cli**: status → `legacy` - docs explicitly state no deprecation date or
  timeline has been established. Also fixed the "does no support" typo.
- **workspace-model-registry**: status → `legacy` - disabled for new UC-default accounts
  since April 2024, but docs describe deprecation as a future event.
- **hive-metastore**: the per-workspace re-enable applies only to accounts created before
  the December 2025 cutoff; new accounts have no restore path.
- Freshness: new SQL alerts GA'd May 2026; OAuth token federation GA'd Aug 26, 2025;
  ABAC GRANT policies entered Beta June 2026; bundles rename dated `2026-03`;
  legacy-dashboards upgrade-tool window is now past tense.

### Added
- **Mobile navigation** - a hamburger button and scrim; the rail was previously
  unreachable on narrow screens (nothing ever toggled `.sidebar.open`).
- **`legacy` deprecation status** (badge + "legacy since" wording) for things Databricks
  calls legacy without a formal deprecation.
- **Successor links** - deprecation cards link to the replacement's entry via
  `replacementId` (added the missing links: dbfs-mounts and dbfs-init-scripts →
  uc-volumes, pat → oauth-token-federation, no-isolation-shared → access-modes).
- **Shareable filter URLs** - rail section, category, lifecycle filter, and timeline year
  now serialize to `?s=` / `?cat=` / `?kind=` / `?year=` and restore on load.
- **CI validation restored** - `static.yml` runs `scripts/validate.py` before deploy
  (the step existed once and was lost in a workflow rework; docs claimed it still ran).
- **Validator hardening** - real month ranges, `removedAt ≥ deprecatedAt`, lineage
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
- Hardened `init()` - missing DOM elements and entries without `lineage` degrade
  gracefully instead of crashing the whole render.

## 2026-07-18 (fun pass - quiz, timeline, deep links)

A round of playful, no-dependency additions on top of the same data. No schema changes;
`databricks.json` and the validator are untouched.

### Added
- **Quiz mode** - an advertised "Take the quiz" call-to-action in the top bar opens an
  overlay that shows an old name and four current-name choices, tracks score + streak, and
  links straight to the matching entry. Draws its questions from renames (old → current) and
  deprecations that name a replacement.
- **Share on LinkedIn** - once you've answered a question the quiz shows a LinkedIn button
  that copies a ready-to-paste score brag and opens LinkedIn's share composer for the site.
- **Deep links / shareable URLs** - `#<entry-id>` opens a single entry on its own; `?q=<term>`
  reflects the search box. Each card gains a **link** action (copies the deep link) and a
  **copy card** action (a tidy 🧱 blurb for pasting into Slack/chat).
- **Year timeline** on Home - a small bar chart of changes per year; click a bar to filter,
  click again to clear.
- **"On this month" spotlight** on Home - surfaces a change from the current month (or the
  most recent one) with a "see it →" jump.
- **Brick confetti** 🧱 rains down when the roulette lands (respects
  `prefers-reduced-motion`).
- **Made-up odds gag** - each rename/feature card carries a deadpan, entirely-fictional
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
  auth EOL** (both the AWS docs and Microsoft Learn pages failed to render actual content - the
  July 10, 2024 date is widely cited but I won't add what I couldn't read), and the **Partner
  Connect → Marketplace** sidebar consolidation (Partner Connect still ships as its own product,
  so it isn't a clean rename or deprecation).

## 2026-07-18 (platform release-notes sweep)

Swept every monthly platform release-notes page from July 2025 through July 2026 and added
nine verified entries (24 → 33). Each was fact-checked against its live source doc.

### Added
- Three renames:
  - **OpenSharing** (formerly **Delta Sharing**) - "Delta Sharing is now OpenSharing" (June 2026),
    a rebrand tied to open-sourcing the OpenSharing standard.
  - **Databricks ODBC Driver** (formerly **Simba Spark ODBC Driver**) - renamed February 2026;
    existing DSNs keep working while the legacy driver is installed.
  - **Lakeflow Pipelines Editor** (previously the **multi-file editor**) - Public Preview
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
  now AI Search" rename - already correct, no change.
- Deliberately excluded from the sweep, to hold the catalog's bar: routine model-catalog
  retirements (e.g. Gemini 2.5 Flash, Claude Sonnet 4), UI-label-only tweaks (SQL section →
  Lakehouse), and niche schema/log-table deprecations. The "Lakeflow Declarative Pipelines →
  Lakeflow Spark Declarative Pipelines" (Nov 2025) claim was left out: the live `/ldp/` docs use
  fluid naming that contradicts a clean rename, and being confidently wrong is the one thing this
  project won't do.

## 2026-07-18 (features & lifecycle filter)

### Added
- **New features are now first-class - a third `kind`.** Alongside renames and deprecations,
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
- One verified rename: **Model Serving** (formerly **Serverless Real-Time Inference**) - the
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
  table - it lists models that don't exist ("GPT-5.6 Sol", "GPT-5.5", "Gemini 3.5 Flash",
  "Claude Sonnet 4.6", "Gemini 3.1 Pro") with invented retirement dates. Also skipped for now:
  Jobs API 2.0/2.1 "deprecated" (the 2.2 doc documents behavior changes but does **not** call
  2.0/2.1 deprecated), Z-Order "deprecated" (still supported - captured instead as the Liquid
  Clustering feature it's recommended against), and the many governance/runtime claims (Hive
  metastore, no-isolation compute, SCIM, DBFS root, JDK/library removals, "Cluster → Compute",
  "DLT → Lakeflow Pipelines" wording) that are plausible but weren't each fact-checked to this
  repo's bar. They can be added later, one sourced entry at a time.

## 2026-07-18

### Added
- **Deprecations are now first-class.** Entries carry a `kind`: `"rename"` (default) or
  `"deprecation"`. A deprecation names the retired feature, its `replacement` (or none),
  `deprecatedAt`/`removedAt`, and a `status` of `deprecated`/`retired` - the opposite of a
  rename (a different thing takes over). Seeded with four sourced deprecations: **dbx** →
  Declarative Automation Bundles, **Legacy (Redash) dashboards** → AI/BI Dashboards (access
  ended Jan 12, 2026), **Legacy Databricks CLI** → the new Go-based CLI, and **DBFS mounts**
  → Unity Catalog volumes & external locations. This is a curated, sourced seed, not an
  exhaustive list - deprecations grow one sourced entry at a time, same as renames.
- Four rename entries, each fact-checked against its cited source before adding:
  - **Databricks SQL** (formerly **SQL Analytics**) - the May 26, 2021 SQL release notes
    state the rename outright, including the `sql-analytics-access` → `databricks-sql-access`
    entitlement migration.
  - **Delta Lake** (formerly **Databricks Delta**) - the proprietary feature was
    open-sourced under the new name at Spark + AI Summit, April 24, 2019.
  - **Supervisor Agent** (formerly **Agent Bricks: Multi-Agent Supervisor**) - docs read
    "Supervisor Agent (formerly Multi-Agent Supervisor, MAS)"; GA February 2026.
  - **Genie Code** (formerly **Databricks Assistant**) - the Assistant docs now live at the
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
  "old → replacement" (or "retired - no direct replacement") trail; search, sort, the
  day-counter, and the copy-correction toast now span both kinds. Sidebar dots added for
  dbx (Jobs & Pipelines) and Legacy dashboards (Dashboards).
- Site copy reframed to "renamed **or** deprecated" (rebricked = **re**named or de**pre**cated).

### Notes
- Triaged a large community/LinkedIn-sourced rename list. Deliberately **excluded**:
  Lakehouse Platform → Data Intelligence Platform (a 2023 repositioning that added the
  DatabricksIQ engine, per Databricks' own framing - not a same-thing rename); global init
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
- Schema/format validator [`scripts/validate.py`](scripts/validate.py) - the CI gate that
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
  later the same day - see the section above.)_

<!--
Template for the next day:

## YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
-->
