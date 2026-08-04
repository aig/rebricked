# Changelog

All notable changes to **rebricked**, grouped by day.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

**How entries are written.** Each entry is a bold one-line summary, then **`Why:`** (the problem
being solved), then **`What:`** (what changed). The why comes first, because the diff already
shows the what. Plain, simple English: short sentences, common words, no jargon beyond the field
and product names themselves. Some older entries have no `Why:` line - the reason was never
recorded, and a made-up reason is worse than none.

## 2026-08-04

### Changed
- **The data moved from one JSON array to one YAML file per entry: `kb/databricks/<id>.yaml`.**

  **Why:** you could not read a change to one entry in git. Editing one card meant a change
  buried in the middle of a 2,500-line file. All 105 entries shared one file's history, so
  `git log` could not tell you anything about a single card. Two pull requests touching
  completely different cards clashed on the same lines. Now the diff is just the change: a new
  entry is one new file, and a rename is that file plus a one-line edit on the card before it.
  `git log kb/databricks/delta-live-tables.yaml` now shows that one entry's whole history.

  **What:** all 105 entries became `kb/databricks/<id>.yaml`, where the filename is the `id`.
  `www/databricks.features.json` is now build output. The new
  [`scripts/build_features.py`](scripts/build_features.py) builds it, git ignores it, and CI
  rebuilds it before the validate gate and before deploy. No field changed and the site serves
  the same data. To prove that, the built file was compared entry by entry against the last
  committed one: all 105 matched exactly. If you edit entries, write YAML and never the JSON,
  because an edit to the JSON is thrown away on the next build. Run
  `python scripts/build_features.py` before `validate.py`, `check_anchors.py`, or a local
  preview, because all three read the built file. The builder fails if the YAML is broken or if
  an `id` does not match its filename, and `--check` tells you the built file is out of date.
  PyYAML is now needed to run `scripts/` (`pip install pyyaml`), but the site itself still has no
  dependencies and no JavaScript build. `CONTRIBUTING.md` and the `add-databricks-entry` skill
  now show YAML examples, and `README.md`, `AGENTS.md`, `CLAUDE.md`, and the CI workflow match.
- **Tightened the LTAP entry from [#7](https://github.com/aig/rebricked/pull/7).**

  **Why:** the card read as if LTAP had shipped. Every claim on it came from the launch press
  release, and the Availability section of that same press release says only "LTAP is coming soon
  as a part of Lakebase". Two of its facts were really about Lakebase, not LTAP, and one of those
  (the git-style branching) was already a fact on the `lakebase` card.

  **What:** added a `limitations` note saying it is still rolling out, and said the same in
  `what.note`, both sourced to Reynold Xin's engineering deep dive. The limits: it dual-writes a
  row copy and a columnar copy to check itself, it leaves tiny tables unconverted, and it hides
  MVCC row versions from Iceberg and Delta readers. Added no `releases` timeline, because the
  announcement names no preview stage and inventing one would be a guess. Replaced the two
  Lakebase facts with the deliberate HTAP pun and the dual-write detail, and rewrote the "world's
  first LTAP platform" fact around the point that Databricks coined the category the same day.
  Added text fragments to the bare `status` and `occasion` links, added the engineering blog and
  a Register write-up to `links`, and re-checked every citation with `check_anchors.py`.

## 2026-08-03

### Added
- **Lakehouse Monitoring -> Data profiling, plus Anomaly detection.**

  **Why:** a rename had happened and the list did not cover it. The Databricks docs now say it
  outright: "Data profiling was formerly known as Lakehouse Monitoring". The old
  `/lakehouse-monitoring/` docs URL redirects to the data-profiling page under Unity Catalog.

  **What:** three new cards. `lakehouse-monitoring` (`renamed`, Public Preview August 2023, GA
  June 2024, `successorId` -> `data-profiling`), `data-profiling` (`active`, GA, with the
  Delta-only, 30-day, and 4TB limits), and `anomaly-detection` (`active`, Public Preview February
  2026) as its own feature. The docs treat Data Quality Monitoring as the umbrella over both, so
  the rename chain points at data profiling and not at the umbrella. All three wired into the
  Catalog rail. One caveat: Databricks never published a dated rename announcement, so the
  `to`/`from` date of `2026-02` is the earliest release note that uses the new name, not a rename
  notice.
- **[`scripts/check_anchors.py`](scripts/check_anchors.py) - a citation rot check.**

  **Why:** the failure that matters most was invisible. `validate.py` only checks that a link
  looks like a URL, and it never fetches the page. So when Databricks edits a doc page, the
  `#:~:text=` fragment stops matching, and the card still looks sourced. Nothing tells you: a
  broken text fragment fails silently, and the browser just loads the page without highlighting
  anything.

  **What:** the script fetches every URL in the data file and checks each quote is still on its
  page. It matches the way a browser resolves a text fragment - ignoring case, and across inline
  markup - because strict matching reports breakage that is not real. It reports `DEAD` (page
  gone, or the page loads but the quote is not there) separately from `BLOCKED` (the host refuses
  scripted requests, which tells you nothing, so it never fails the run). For the one or two
  blocked links, check them with a web-fetch tool, which reads them normally. It needs the
  network, so it is a local or scheduled audit and on purpose **not** part of the deploy gate.
  Its first run over 100 entries found 7 real broken citations that the schema gate had been
  passing (fixed below). After those repairs: 913 URLs across 316 pages, **912 OK, 0 DEAD, 1
  BLOCKED**. The blocked one is techzine.eu, checked by hand with a web-fetch tool and confirmed
  live and on topic.

### Fixed
- **Repaired 7 broken citations.**

  **Why:** Databricks had reworded the quoted text on those pages, so the `#:~:text=` fragments
  quietly stopped highlighting anything. The cards still looked sourced.

  **What:** re-quoted each fragment from the live page and bumped `verified` on all six affected
  cards.
  - `lakeflow-connect` `what` - the docs now say "ingest**ing** data from SaaS
    applications and databases".
  - `databricks-vector-search` `what` and `ai-gateway` `fact[0]` - both dropped the word
    "generative" ("AI applications such as RAG systems"; "streamlines the usage and
    management of AI models within an organization"). The `ai-gateway` fact text was
    edited to match rather than keep asserting "generative-AI models".
  - `lakehouse-federation` `releases[1]` - the quote carried a trailing period the
    heading does not have.
  - `data-explorer` `fact[0]` - re-quoted to "view schema details, preview sample data"
    after the Catalog Explorer page was reorganised.
  - `databricks-free-edition` `fact[0]` and `limitations` - re-quoted to the current
    "unavailable for the rest of the day (and in extreme cases, the rest of the month)"
    and "Free Edition users only have access to serverless compute resources", replacing
    two fragments so short they were fragile anyway.
- **Role-based access control (RBAC)** (`role-based-access-control`, `active`, Public Preview
  July 2026). You assume a role - really just a Databricks group you hold the Assume permission
  on - and for that session you act with only that role's permissions instead of all the ones you
  have collected. Sourced limits: one role at a time; creating Agent Bricks agents, managing
  alerts, and Lakeflow pipelines do not work as a role; creating a Vector Search index fails; and
  the workspace SCIM API cannot manage groups.
- **Governance Hub** (`governance-hub`, `active`, Beta July 2026). Data, AI, and Cost pages in the
  account console for watching data health and coverage, AI usage and spend, and what drives
  cost. It adds no permissions of its own, and each page only shows what the viewer's admin role
  already covers.
- Both wired into the **Catalog** rail section next to `attribute-based-access-control`.
- **Agentic code converter** (`agentic-code-converter`, `active`, Beta July 2026) as the current
  name of the SQL migration converter, wired into the **Workspace** rail section.
- **Variant** (`variant`, `active`, Public Preview June 2024 -> GA July 2026).

  **Why:** this is a replacement, not just a new column type, so it belongs on the list.
  Databricks tells you to use it instead of storing semi-structured data in JSON strings, and
  that switch can quietly change your results. Variant paths are case-sensitive where JSON
  strings were not, `[*]` does not work, and `NULL` is stored differently.

  **What:** a card for the `VARIANT` column type, plus the shredding that makes it fast by
  storing often-used fields as real Parquet columns instead of one binary blob. Wired into the
  **Catalog** rail. Two live doc pages disagree on when the type arrived - one says Databricks
  Runtime 15.4, the other 15.3 - so this uses the DBR 15.3 release notes, which announce it in
  Public Preview and date that runtime to June 2024.
- **Custom URL** (`custom-url`, `active`, Public Preview July 2026). One branded address per
  account, for example `acme.databricks.com`, instead of a separate URL per workspace. Users move
  between workspaces and Genie One without signing in again. Wired into the **Workspace** rail
  section.
- **Zerobus Ingest** (`zerobus-ingest`, `active`, Public Preview October 2025). Push-based
  serverless ingestion straight into Unity Catalog Delta tables over gRPC, REST, or
  OpenTelemetry. No bus, no partitions, no brokers. Wired into the **Data Ingestion** rail
  section, which until now had no entries at all.
- **Transactions** (`transactions`, `active`, Public Preview March 2026 -> GA July 2026).
  Multi-statement, multi-table ACID transactions using `BEGIN ATOMIC ... END` or
  `BEGIN TRANSACTION ... COMMIT` on Unity Catalog managed tables with catalog commits turned on.
  Recorded as one card named after the current docs page. The Public Preview called it
  "Multi-table transactions", kept here as an alias rather than claimed as a rename.

### Changed
- **Added a July 2026 fact to ten existing cards.** Each fact is sourced to that month's release
  notes, and each card's `verified` was bumped: a Genie app for Microsoft Teams (`genie-agents`),
  scheduled tasks that leave a chat you can carry on (`genie-code`), the Enter Data spreadsheet
  operator from the Summer Release (`lakeflow-designer`), troubleshooting by chat using Unity
  Catalog telemetry (`lakebase`), high QPS now on by default but not for endpoints that already
  exist (`databricks-ai-search`), the sample datasets moving to the `samples` catalog over
  OpenSharing (`dbfs-mounts`), the old `Trigger.AvailableNow` dropping to a single micro-batch
  (`opensharing`), protobuf input only on endpoints deployed after July 9 (`model-serving`), the
  notes that explain why a warehouse stays awake (`sql-warehouse`), and pipeline unit tests in the
  editor by redirecting catalog tables (`lakeflow-pipelines-editor`). `git-folders` was skipped
  because it already has the maximum of three facts, so adding the Git CLI Public Preview would
  have meant dropping a sourced fact.
- **Re-chained the SQL migration converter.**

  **Why:** Databricks retitled the doc page, and its own July 16 release note, from "Lakebridge
  Agentic Converter" to "agentic code converter" on both AWS docs and Microsoft Learn. That left
  four citations on the existing card pointing at text that no longer exists.

  **What:** a card's `id` must match its name, and ids never change, so the card could not simply
  be renamed in place. Instead `lakebridge-agentic-converter` became `renamed` (`to` 2026-07,
  `successorId` -> `agentic-code-converter`) and kept its id, name, and page, while the new card
  carries the current name. Every citation on both cards was re-checked against the live doc text.
  The old `/migration/lakebridge-agentic-converter` URL still works, and it is cited as the proof
  of the retitle.
- Refreshed the mirrored reference docs (`scripts/fetch_reference.py`): 104 pages updated,
  including July 2026 release notes, which now cover items up to July 29.

## 2026-07-28

### Added
- **Lake Transactional/Analytical Processing (LTAP).** New `active` feature entry for the
  data processing architecture Databricks launched at Data + AI Summit 2026 (June 16, 2026),
  which unifies OLTP and OLAP on a single copy of data by combining Lakebase with the
  Lakehouse. Sourced to the official launch press release; wired into the Compute rail next
  to Lakebase.

## 2026-07-26

### Changed
- **One-click status filtering.**

  **Why:** all three buckets are on by default, so seeing only one of them took two clicks to
  turn the other two off. The most common thing you want was the slowest thing to do.

  **What:** the Latest / Legacy / Renamed buttons now behave like a chart legend. From the
  all-on state one click isolates that bucket, so a single click on Renamed shows only renamed
  cards. Clicking the one active bucket brings all three back. Any other click toggles as
  before, so multi-select combinations are still reachable. Tooltips updated to say so.
- **Moved the deployed site into `www/`.**

  **Why:** GitHub Pages published the whole repository. The repo docs, `scripts/`, `agents/`,
  and the `reference/` mirror were all shipped to the live site, even though none of them are
  part of it.

  **What:** everything Pages publishes now lives under `www/`: `index.html`, `app.js`,
  `styles.css`, `databricks.features.json`, `assets/`, `badges/`, `disclaimer/`, `subscribe/`,
  `CNAME`, `robots.txt`, `site.webmanifest`, and the generated `databricks/`, `sitemap.xml`,
  and `feed.xml`. Repo docs, `scripts/`, `agents/`, and `reference/` stay at the root and are
  no longer deployed. The Pages workflow uploads `www` instead of the whole repository.
  `validate.py`, `build_entries.py`, and `build_badges.py` read and write the new paths, and
  `.gitignore` and every doc link were updated. Local preview is now
  `python -m http.server 8777 -d www`. No URL on the published site changes.

## 2026-07-25

### Added
- Added a quiz difficulty picker. The existing five-question rename quiz is now **Associate**;
  **Professional** asks ten definition-to-feature multiple-choice questions using the sourced
  `what.note` descriptions of current entries.
- Both levels continue to use the existing five-tier badge set; Professional scores are
  mapped proportionally onto that scale.
- Preserved the original `/badges/<score>-of-5/` URLs as **Associate** badges for links
  already shared. Professional results use separate
  `/badges/<score>-of-5-professional/` URLs, so their certification level is explicit
  without breaking old links.
- Professional now always opens with the Genie One definition; its answer options prioritize
  the real rename lineage and fill remaining slots only with fictional predictions from that
  same card.

## 2026-07-24 (validation pass + doc sync)

### Changed
- **`COVERAGE-GAPS.md`**: reconciled the gap report with the three entries added today. Updated the
  header counts (71 -> 92 entries, 154 aliases), added an **Update log** section, marked the
  Databricks Marketplace (§15), Lakeflow Connect (§2), and Mosaic/AI Gateway (§13) rows **✓ now
  covered**, reclassified the AI Gateway sub-features as **[adjacent]**, added the three to the
  "Already covered" list, and trimmed them from the "genuinely absent marquee products" summary.
- **`ai-gateway` -> `unity-ai-gateway`** (rename chain).

  **Why:** re-verifying the AI Gateway card against live docs turned up a rename the list had
  missed. It is now **Unity AI Gateway**, announced at Data + AI Summit 2026 on June 16, 2026,
  and the docs page is titled "AI governance with Unity AI Gateway".

  **What:** modelled by the one-card-per-name rule. A new `active` **`unity-ai-gateway`** card
  holds the current name (`from` 2026-06) with the current governance description, the
  guardrail and fallback fact, the DAIS 2026 agents and tools Beta additions, and the maturity
  timeline Public Preview 2024-09 -> GA 2025-06. The existing **`ai-gateway`** card became
  `status: renamed` (`to` 2026-06, `successorId: unity-ai-gateway`) and kept "Mosaic AI Gateway"
  as an alias along with its September 2024 Public Preview history. The core gateway stays GA;
  only the 2026 agent and tool controls are Beta. Wired `unity-ai-gateway` into the
  `AI Gateway` rail section.

### Added
- **`databricks-free-edition`** (feature, `active`, Developer experience) + **`databricks-community-edition`**
  (deprecation, `retired`): the Databricks free-tier lineage. Free Edition is the no-cost, serverless-only
  workspace announced at Data + AI Summit 2025 (June 2025). It replaced Community Edition, the original 2016
  free tier (beta Feb 2016, GA June 7 2016), which was retired January 1, 2026. Modeled as a
  replacement (different offering, serverless re-signup), not a rename: `databricks-community-edition`
  carries `deprecatedAt` 2025, `removedAt` 2026-01, `replacement`, and `successorId: databricks-free-edition`.
  Free Edition carries documented `limitations` (single 2X-Small warehouse, 5 concurrent tasks, no GPUs by
  default, non-commercial use). Both wired into the `Workspace` rail section. Reconciled in `COVERAGE-GAPS.md`.
- **`lakeflow-connect`** (feature, `active`, Data engineering): Lakeflow Connect, the managed
  data-ingestion pillar of Lakeflow - point-and-click connectors (Salesforce, Workday,
  ServiceNow, SQL Server, PostgreSQL, ...) that land data in Unity Catalog on serverless compute
  with CDC. Sourced history: unveiled with Lakeflow at Data + AI Summit (June 12, 2024, "entering
  preview soon"), first connectors (Salesforce Platform + Workday Reports) GA April 2, 2025,
  Lakeflow overall GA June 12, 2025. `releases` `public-preview` (2024) -> `ga` (2025-04); a
  `fact` notes the 2023 Arcion acquisition that powers native database ingestion. Wired into the
  `Jobs & Pipelines` rail section. `python scripts/validate.py` -> `OK: 91 entries valid.`
- **`databricks-marketplace`** (feature, `active`, Data governance): Databricks Marketplace, the
  open marketplace for data sets, notebooks, ML models, dashboards, and AI assets, built on open
  sharing (Delta Sharing / OpenSharing). Sourced history: unveiled at the 2022 Data + AI Summit
  ("available in the coming months"), Public Preview April 27, 2023, GA June 28, 2023 at Data +
  AI Summit 2023. `releases` timeline `public-preview` (2023-04) -> `ga` (2023-06). Wired into
  the `Discover` rail section in `app.js`. `python scripts/validate.py` -> `OK: 90 entries valid.`

### Changed
- **Brought the `AGENTS.md` Layout table back in sync with the repo.**

  **Why:** the table is where anyone new looks to find out what a file is for, and it had
  fallen behind. Real files were missing from it, and the shapes it documented no longer
  matched the data.

  **What:** the `build_entries.py` row now says it also generates `feed.xml`, the RSS 2.0 feed,
  not just `sitemap.xml`. Added rows for `scripts/fetch_reference.py` (and
  `scripts/sources.json`), the generated `sitemap.xml` and `feed.xml`, and `COVERAGE-GAPS.md`.
  The "Data shape" section got the same object-shape treatment as `CONTRIBUTING.md`: the date
  fields (`from`, `to`, `introducedAt`, `deprecatedAt`, `removedAt`) and `occasion` are now
  documented as `{ date, link }` and `{ date, link, note }` objects instead of bare strings.
- **Brought the `CONTRIBUTING.md` schema back in line with the data and `app.js`.**

  **Why:** several fields had changed from a string to an object, and the doc still showed the
  old string form in every example. Anyone following it would write entries the validator
  rejects.

  **What:** three field rules brought up to date, plus a re-check that the rest still holds:
  - **Date fields** (`from`, `to`, `introducedAt`, `deprecatedAt`, `removedAt`) are each a
    `{ date, link }` object in 100% of the data (the date plus its confirmation doc, mirroring
    `status`); the examples showed bare strings (`"from": "2021"`). Converted all example
    occurrences and added a field rule describing the object shape.
  - **`occasion`** is a `{ date, link, note }` object (all 32 uses; `app.js` reads
    `occasion.note`/`.link` and the validator requires an object), but all three examples wrote
    it as a bare string. Fixed the examples and added the missing `occasion` field rule.
  - Documented the `category` field's closed allow-list - the validator hard-fails any category
    outside the seven-item `VALID_CATEGORIES` set, yet the doc only showed categories via
    scattered inline examples; added a field rule enumerating the set and how to extend it.
  - Verified every other claim still holds (the resource-limits mirror path, the
    `fetch_reference.py databricks-resource-limits` source id, and the `releases` stage list all
    match the code). The validator still tolerates the bare-string forms for legacy resilience,
    so this is a docs-only correction - no data change.

### Verified
- Schema gate green: `python scripts/validate.py` -> `OK: 89 entries valid.`
- Regenerated the SEO layer (`python scripts/build_entries.py`): 89 entry pages, 1 vendor hub,
  `sitemap.xml` 97 URLs, `feed.xml` 190 items - byte-for-byte identical to what was committed,
  confirming the generated docs are in sync with `databricks.features.json`.

## 2026-07-23 (fact-check dates flagged during deep-linking)

### Fixed
- **Corrected four wrong dates turned up by the deep-linking pass.**

  **Why:** adding a text fragment to a link means reading the cited page for the exact
  sentence that backs the claim. On seven entries that sentence was not on the page, so the
  date the card showed was not confirmed by the doc it pointed at.

  **What:** four of the seven had genuine errors, corrected against live docs:
  - **legacy-dashboards**: `deprecatedAt` `2024` -> `2025-04` (support ended April 10, 2025, per
    SQL release notes 2025); `removedAt` `2026-01` -> `2026-03` and `occasion` "End of life
    January 12, 2026" -> "End of life March 5, 2026" (per AI/BI release notes 2026). The
    "January 12, 2026" date exists only in stale search caches - no live official page states it.
  - **models-in-unity-catalog**: `introducedAt` `2024` -> `2023` (Public Preview June 28, 2023;
    GA October 17, 2023 - matching its own `releases` timeline).
  - **databricks-apps**: `introducedAt` `2024-11` -> `2024-10` (Public Preview October 8, 2024);
    `occasion.note` clarified that June 11, 2025 is the GA *blog announcement* while GA per release
    notes was May 13, 2025; `fact` "June 2025 GA" softened to "2025 GA".
  - **lakehouse-real-time**: `occasion` was mismatched - the note said "Announced June 16, 2026"
    but the link pointed at the release-notes page (which stages the Beta on June 30, 2026).
    Repointed `occasion` at the June 16, 2026 launch blog ("Introducing Lakehouse//RT"), which is
    the actual announcement; the June 30 release-notes date remains the source for
    `introducedAt`/`releases` (Beta).
  - Re-verified and left unchanged (flag was a text-fragment gap, not a data error):
    **legacy-databricks-cli** (`deprecatedAt 2023` is the house-convention legacy-onset marker -
    docs confirm no formal deprecation date exists), **databricks-cli** ("(v0.205+)" is the docs'
    own new-CLI boundary; GA May 21, 2026 confirmed), **databricks-connect** ("(13.3 LTS+)" is
    verbatim the current supported baseline). Bumped `verified` on the corrected entries.

## 2026-07-23 (deep-link date/status/release confirmation links)

### Changed
- **Deep-linked the date and lifecycle confirmation links too.**

  **Why:** the note links now landed the reader on the exact sentence, but the links that are
  supposed to *prove a date* still dropped you at the top of a long release-notes page. The
  claim most in need of evidence was the one hardest to check.

  **What:** extended the text-fragment treatment to `from`, `to`, `introducedAt`,
  `deprecatedAt`, `removedAt`, `occasion`, `status`, and each `releases[]` stage. 297 of 350
  such links now carry a `#:~:text=` fragment that lands on the sentence confirming that
  specific date, rename, GA, or deprecation: a `status: renamed` link highlights the rename
  sentence, a `releases` GA stage highlights the "now generally available" line. The other 53
  stay plain page links because the cited page does not state that date or event word for word.
  Many of those are legacy pages with no formal deprecation date, or release-notes pages so
  large they never name the product. Fragments are copied word for word from the live docs, and
  edits are scoped per entry, so a URL shared by several entries gets a different highlight on
  each. Only the link suffixes changed. No dates, ids, or formatting moved.

## 2026-07-23 (deep-link every note to its exact source passage)

### Changed
- **Deep-linked every note to the exact passage that backs it.**

  **Why:** a card's source link dropped you at the top of the page and left you to find the
  sentence yourself. On a long docs page that is real work, and it is work the reader has to
  do before they can tell whether the claim is actually sourced.

  **What:** upgraded 288 of 291 note links (`what`, `fact`, `limitations`) from whole-page URLs
  to scroll-to-highlight **text fragments** (`#:~:text=`). Each cited page was fetched and a
  short phrase from it, copied word for word, was appended so the link lands on the exact
  sentence or heading. The snippets come straight from the live Databricks or Microsoft Learn
  page, so the browser highlight matches. Commas and hyphens are percent-encoded, because they
  are structural in the `:~:text=` syntax. Three notes stay plain page links because their
  pages carry no supporting text to quote: both ODBC-driver `what` descriptions and one AI/BI
  dashboards fact. No entry content, ids, or formatting changed. Only the fragment suffix on
  link URLs.

### Fixed
- **Every renamed entry's static page had the wrong title.**

  **Why:** when `status` became a `{ value, link, date }` object, `meta_for` in
  `scripts/build_entries.py` kept comparing `d.get("status")`, now a dict, to the string
  `"renamed"`. That comparison never matched, so every renamed entry fell through to the
  "current name" branch. Databricks One's crawlable page presented it as the current name
  instead of "now Genie One" - the exact mistake this site exists to correct.

  **What:** switched the check to `status_value(d)`. All 22 renamed entries render correctly.

## 2026-07-23 (source fact-check: corrected wrong/unsupported claims)

### Fixed
- **Fact-checked every entry against the live docs it cites.**

  **Why:** the one rule here is never be confidently wrong, and nothing had ever tested it.
  The validator checks that a link is shaped like a URL and stops there, so a card could carry
  a wrong number, a wrong status, or a claim its own source does not make, and still pass.

  **What:** fetched every cited URL and read the statements against the page. Corrected the
  items that were wrong or pointing at the wrong doc:
  - **model-serving** `limitations`: the "up to 200 provisioned concurrency per endpoint and per
    model" figure was wrong - 200 is the non-route-optimized QPS cap. Rewritten to the documented
    limits: provisioned concurrency up to 1024 per model / 4096 per workspace (raisable), and QPS
    up to 300,000 with route optimization (200 without).
  - **hive-metastore** `status`: `deprecated` -> `legacy`. The cited doc calls it a "legacy
    feature" with no formal deprecation date, which is `legacy` per our own convention.
  - **delta-lake** `fact`: the Linux Foundation donation was cited to the April 2019 Apache
    open-sourcing blog, which doesn't cover it. Split into two facts - April 2019 open-sourcing
    (original blog) and the Oct 16 2019 Linux Foundation donation (its own announcement).
  - **data-explorer** `status.link`/`to.link`: repointed from the current Catalog Explorer docs
    page and the 2024 revamp blog (neither documents the rename) to the September 2023 release
    notes, which state "Data Explorer is renamed to Catalog Explorer." Revamp blog kept in `links`.
  - **mosaic-ai-vector-search** `status.link`: repointed to the June 2026 release notes, which
    state "Vector Search has been renamed to AI Search"; the old link (product docs page) didn't
    document the rename.
  - **databricks-sql-dashboards** `status.link`: repointed to the archived legacy-dashboards doc,
    which backs the superseded status; the Nov 2020 release notes didn't.
  - Bumped `verified` (and `status.date`) to 2026-07-23 on each corrected entry.
- **Re-sourced about 72 mis-cited `what`, `fact`, and `limitations` claims across about 50
  entries.**

  **Why:** each of these was true but mis-sourced - the `link` on the claim did not contain the
  statement it was supposed to back. A reader who clicks through and cannot find the sentence
  has no way to tell a sloppy citation from an invented fact, which costs the whole list its
  credibility.

  **What:** fetched the live docs and either repointed the claim at the official page, blog, or
  release note that does substantiate it, or trimmed the overreaching part back to what a real
  source supports. Highlights:
  - Repointed to the page that carries the claim: DLT/Lakeflow `what` -> `ldp/concepts`;
    DLT `fact` -> the 2021 launch blog; Workflows -> the 2022 Repair-and-Rerun blog; Databricks
    Delta -> the 2017 announcement blog (not the 2019 open-sourcing one); Git folders rename
    date -> the March 2024 platform release notes; Data Explorer/Catalog Explorer rename ->
    Sept 2023 release notes; legacy-sql-alerts -> the deprecated `alerts-legacy` CLI reference.
  - Corrected outright-wrong facts: Databricks CLI "went GA in 2024" was Asset Bundles' GA -
    the CLI itself hit 1.0.0/GA on May 21, 2026; removed the Feature Engineering "time travel"
    claim (Databricks explicitly says its point-in-time lookups are not Delta time travel);
    "SQL Analytics" is no longer called a "serverless data warehouse on the lakehouse" (both
    terms postdate its 2020 launch); "Standalone pipelines" prior name corrected to "Pipelines
    for Databricks SQL".
  - Trimmed clauses no single official page backs (kept each claim self-contained + single-
    sourced): dropped unverifiable specifics like the SQL warehouse "120 idle minutes" auto-off,
    the vector-search/knowledge-assistant marketing stats moved onto the blogs that state them,
    the "written in Go" CLI detail, and several "PP date -> GA date" arcs reduced to the sourced
    GA milestone.
  - Bumped `verified` to 2026-07-23 on every re-sourced entry. `python scripts/validate.py`
    passes (89 entries).

## 2026-07-23 (`what` becomes { note, link } + search UX polish)

### Removed
- **Card footer reference chips.**

  **Why:** `source`, `what`, every fact, `limitations`, and `status` now each carry their own
  inline link, which left the bottom-left "Doc / Blog / Other" chips repeating what the card
  already showed. On all 89 cards the Doc chip pointed at the same place as the description 🔗.

  **What:** removed `refsSection` and its helpers (`refLinks`, `hostOf`, `REF_ORDER`,
  `REF_KINDS`) from `app.js`, and the `.row-refs` and `.ref-*` CSS. The footer now holds only
  the copy and share actions. The `links` array stays in the data and still renders on the
  generated SEO entry pages.

### Changed
- **`status` is now a `{ value, link, date }` object, not a bare string.**

  **Why:** calling something deprecated or renamed is the strongest claim a card makes, and as
  a bare string it was the one claim with nothing behind it. The card could not say which doc
  backed the call, or how long ago anyone had checked.

  **What:** `status.value` keeps the sole-discriminator role (`active`, `renamed`,
  `deprecated`, `legacy`, `retired`), `link` is the official doc backing the call, and `date`
  (`YYYY-MM-DD`, never in the future) is when it was confirmed. All 89 entries migrated:
  `value` from the old string, `link` seeded from each entry's `source`, `date` from its
  `verified`, both to be refined per entry over time. The validator enforces the shape - value
  in the allowed set, `link` a URL, `date` a real non-future date, no extra keys - and branches
  on `status.value`. `app.js` reads it through new `statusValue`, `statusLink`, and `statusDate`
  accessors, every `d.status` read was updated, and the status badge shows the confirmed date
  in its tooltip. `build_entries.py` reads it through a new `status_value`. Docs updated
  (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `agents/add-databricks-entry.md`).
- **`fact` is now an array of 1-3 `{ note, link }` objects, and the top-level `note` field is
  removed.**

  **Why:** a card had exactly one sourced fun fact and, beside it, a free-text `note` that
  carried no link at all. Anything interesting beyond the first fact had nowhere to go except
  that unsourced field, which is the opposite of how everything else here works.

  **What:** each card can now carry up to three sourced facts, each rendered as its own 💡 row
  with a 🔗 to its source. All 89 entries migrated: the original fun fact became `fact[0]`, and
  each entry's former `note` was reworked into self-contained extra fact(s) where it held a
  distinct, sourceable detail (64 entries gained a 2nd fact, one - `git-folders` - a 3rd; the
  remaining 24 stay at one). Every `fact.link`
  is seeded from the entry's own `source`, so no link is unverified. The validator now requires
  `fact` to be a non-empty array (max 3) of `{ note, link }` with a real `link`, and rejects any
  leftover top-level `note`; `app.js` renders the rows via new `factList`/`factNote` accessors
  (search/share blurbs use `factNote`), and `build_entries.py` via a new `fact_html`. Styling:
  `.row-note`/`.entry-note` removed; a card's facts render as a `<ul>` (the `.row-fact` /
  `.entry-fact` list) with a 💡 as each item's bullet marker (a hanging `::before`, so wrapped
  lines align past it). Docs updated (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`,
  `agents/add-databricks-entry.md`).
- **Per-fact link refinement.** Most extra facts keep the entry's canonical `source` (the most
  authoritative doc for the claim), but 12 whose fact makes a specific dated/GA/preview claim now
  point at the dedicated doc that evidences it (a matching monthly release-notes page or GA
  announcement already listed on that entry) instead of the generic overview: `classification`,
  `databricks-clean-rooms`, `serverless-workspaces`, `ai-runtime`, `secrets-in-unity-catalog`,
  `mission-critical`, `secureconnect`, `discover`, `managed-iceberg-materialized-views`,
  `databricks-apps`, `lakeflow-designer`, `opensharing`.
- **`what` is now a `{ note, link }` object, not a bare string.**

  **Why:** the description is the first thing anyone reads on a card, and it was the one piece
  of prose with no source of its own. It inherited whatever the entry's `source` happened to
  be, even when the description came from somewhere else.

  **What:** every entry's `what` now carries the one-line description (`note`) plus the
  official doc it is drawn from (`link`), both required, with `link` a real http(s) URL. All 89
  existing entries migrated, their `link` seeded from each entry's `source` and to be refined
  per entry over time. The validator enforces the shape (`what.note` non-empty, `what.link` a
  URL); `app.js` reads it via new
  `whatNote`/`whatLink` accessors and renders the description with a 🔗 to the doc; the SEO
  builder (`build_entries.py`) reads it via `what_note`. Docs updated (`AGENTS.md`,
  `CONTRIBUTING.md`, `agents/add-databricks-entry.md`).

### Added
- **"✨ Ask Genie" label on the AI-guess button.** The card's prediction button now reads
  "✨ Ask Genie" at rest (was a bare ✨); its reveal states are unchanged.

### Fixed
- **Search results no longer stranded off-screen on mobile.**

  **Why:** if you scrolled deep into the list and then typed, say, "dbx", the filtered results
  rendered above the viewport. The page looked empty and you had to scroll up to find your own
  search results.

  **What:** a search that *begins*, meaning the query goes from empty to non-empty, now scrolls
  the filters and results block back into view. It only ever scrolls upward, so it never tugs
  the page for someone already at the top. New `revealFiltersIfBelow` helper in `app.js`.

### Changed (UI)
- **Status badge moved to the card's bottom-left corner.** It kept its bookmark treatment
  (straddling the card edge, half on / half below) but moved from the top-right (`.fam-rel`,
  `top:0; right:16px`) to the bottom-left (`.fam-badge`, `bottom:0; left:16px`).
- **Copy/LinkedIn actions moved to the card's top-right corner** - the spot the status badge
  vacated (`.fam-actions`, straddling the top edge). The card footer is gone entirely (its only
  remaining content); removed `.row-foot`/`.row-foot-actions`/`.row-foot .row-odds` CSS. The
  click handler still resolves the active member via the card's `data-id` (the whole article is
  replaced on an in-place chain swap), so copy/share target the right entry.
- **Search bar is more prominent** without changing its size: the magnifier icon now uses the
  brand accent color, the field has a subtle lift shadow, and it gains a hover border state
  (the accent focus glow is unchanged).
- **The `/` badge clears the search.** Clicking it empties the query, re-renders back to the
  list, and refocuses the input; it now shows a pointer cursor and an accent hover state.
- **Home invitations get out of the way while searching.** Once a query is present, the
  quiz/badge banner and the intro blurb under the "They changed it" title hide (on every
  device); the title and the lifecycle filters stay put. Both return when the search clears.

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
- **Extended limitations to the remaining active features** (35 more), each looked up on its
  official Databricks docs page via research subagents and fetched 2026-07-23 - e.g. Lakeflow
  Declarative Pipelines, Lakeflow Jobs, SQL Warehouse, Git folders, AI/BI Dashboards, Unity
  Catalog (+ Volumes, managed Iceberg tables), Model Serving, Databricks AI Search, the Agent
  Bricks capabilities, Lakehouse Federation, Lakebase, ABAC, and more. **47 of 89 entries now
  carry sourced limitations.** Renamed former names (22) and deprecations (14) were skipped -
  limitations are moot for a superseded or retired name - and six live features whose docs list
  no limitations (Delta Lake, Agent Bricks, Declarative Automation Bundles, Lakeflow Pipelines
  Editor, Databricks CLI, AI Gateway) were left without the field rather than given an invented
  one.
- **Static SEO pages render limitations too.** `build_entries.py` now emits an `.entry-limitations`
  block (`limitations_html`, amber-keyed, with the sourced link) on each crawlable `/databricks/{id}/`
  page, matching the app card. Verified locally: 47 of 89 generated pages carry the block. (The
  `databricks/` output is gitignored and regenerated by CI on deploy; the tracked change is the
  generator.)
- **Added the resource-limits page as a reference source and cross-checked the numeric notes.**
  `scripts/sources.json` now tracks `https://docs.databricks.com/aws/en/resources/limits` (fetch
  with `python scripts/fetch_reference.py databricks-resource-limits`; the `reference/` mirror is
  gitignored). Validated the number-citing limitations against it - feature store (1000/50/100),
  jobs (2000 tasks, 10000/hr, 12000 saved), Lakeflow pipelines (1000 concurrent updates), Git
  folders (1 GB branch, 20000 files), and SQL warehouses all matched. Sharpened two notes with
  authoritative figures: Databricks Apps (up to 100 apps per workspace) and Clean Rooms (up to
  100 per metastore, 10 collaborators). The add-entry skill now tells future runs to cross-check
  any numeric quota against this reference.
- **Soft vs hard limits.** Using the resource-limits page's `Fixed` column (No = raisable on
  request, Yes = hard), confirmed the numbers already cited in notes are all Fixed=Yes (hard),
  and corrected a stale Model Serving figure (provisioned concurrency is 200 per endpoint and per
  model, not 1024). Docs and the add-entry skill now instruct writing soft limits as raisable
  defaults rather than absolute caps. Separately re-verified the Lakebase and Databricks AI Search
  notes against their official docs - both cite hard limits (Lakebase's 10 instances / 1000
  connections / 2 TB; AI Search's 10,000-ANN / 200-hybrid / 10 MB caps) - so no softening was
  needed.

## 2026-07-22 (Agent Bricks + status/release model rework)

### Changed
- **Renamed the data file `databricks.json` → `databricks.features.json`** (first step of a
  data-file refactor). Updated every reference: the `fetch()` and error message in `app.js`,
  the `DATA` path in `scripts/validate.py` and `scripts/build_entries.py`, plus docs
  (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, the add-entry skill), `.gitignore`, the CI
  workflow labels, and `COVERAGE-GAPS.md`. `git mv` preserved history.
- **The `active` status badge is no longer shown on cards.**

  **Why:** `active` is the default state. Most cards carry it, so the badge said nothing and
  crowded out the badges that do mean something.

  **What:** only the noteworthy lifecycle states - renamed, deprecated, legacy, retired - now
  render a status badge. The release pill still shows on active cards, so an active card reads
  as just its release pill and lineage chain. `statusBadge()` in `app.js` and `badge_html()` in
  `build_entries.py` return no status badge for `active`.
- **Release stages can be announced but not yet reached (`is_announced: true`); dropped
  `pre-ga`.**

  **Why:** "GA soon" is not a stage a product has reached, it is a stage that has been
  announced. Modelling it as its own `pre-ga` type meant inventing a rung on a ladder
  Databricks does not have.

  **What:** a `releases` stage is now either reached - `{type, date}` - or merely announced -
  `{type, is_announced: true}`, with no date and only allowed as the last stage. So "GA
  approaching soon" is just `{type: "ga", is_announced: true}` and `pre-ga` is gone. Valid
  `type`s are now `private-preview`, `beta`, `public-preview`, and `ga`. The pill renders an
  announced stage as "<Stage> soon" with a dashed border (`badge-rel-soon`), and the teal
  `--rel-pre-ga` token and class were removed. `validate.py` enforces date-XOR-is_announced and
  announced-only-last. No data used `pre-ga` or an announced stage yet, so no entries changed.
- **`release` (a single value) became `releases` (a `{type, date}` timeline).**

  **Why:** one value told you where a thing is now and threw away how it got there. Preview
  dates are often the most interesting part of a feature's story, and there was nowhere to keep
  them.

  **What:** each entry now records the ordered stages it passed through with the date it
  entered each - for example, `information-extraction` is
  `[{beta, 2025-06}, {public-preview, 2026-03}]`. The last stage
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
- **Dropped the `kind` field; `status` is now the sole discriminator.**

  **Why:** `kind` and `status` could disagree, and when two stored fields can contradict each
  other, one of them is going to be wrong eventually. `kind` was the redundant one: every value
  of it followed from `status`.

  **What:** removed `kind` (`rename`, `deprecation`, `feature`) from all 78 entries. `kindOf()`
  in `app.js` and `kind_of()` in `build_entries.py` now derive the logical family from `status`
  instead of reading a field, so nothing downstream renders differently. Updated `validate.py`
  with status-keyed required fields and a new `status_group()` helper, and the schema docs in
  `AGENTS.md`, `CONTRIBUTING.md`, and `agents/add-databricks-entry.md`.
- **Dropped the `current` status; every live name is now `active`.**

  **Why:** same reason as `kind`. `current`, the tip of a rename chain, was derivable from what
  the card already carried, so storing it was one more thing that could drift out of step.

  **What:** whether an `active` card is a standalone feature or a current rename tip is now
  **calculated** - a feature carries its own
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
- **Split `status` into two independent axes: `status` (lifecycle) and `release` (maturity).**

  **Why:** one field was doing two jobs. Features used `status` for `ga` and `preview` while
  renames and deprecations used it for lifecycle, so the two vocabularies could not be held at
  once. A thing that is both in Beta and marked legacy had no way to say so, and Agent Bricks
  Custom LLM is exactly that: it shipped as Beta and was later called legacy without ever
  reaching GA.

  **What:** `status` is now purely lifecycle - `active` for live names, `renamed` for
  superseded ones, and `deprecated`, `legacy`, or `retired` for deprecations. A new optional
  `release` axis carries Databricks' own maturity stages: `private-preview` -> `beta` ->
  `public-preview` -> `pre-ga` -> `ga`, omitted when GA. A card can now be active but public
  preview, or legacy but beta. Migrated all 19 pre-existing feature entries (`ga` became
  `active`, and the two preview features gained a `release`). Updated `scripts/validate.py`,
  `scripts/build_entries.py`, `app.js` (new `releasePill()` and an amber maturity pill),
  `styles.css`, and the schema docs in `AGENTS.md` and `CONTRIBUTING.md`.

## 2026-07-21 (lineage navigation)

### Changed
- **Clicking a lineage chain node now scrolls to that card instead of collapsing to a single
  card.**

  **Why:** the chain is the whole point of a rename, and clicking along it threw the chain
  away. Each hop rebuilt the view around one card, so following a history meant losing sight of
  the history.

  **What:** focusing an entry, whether by `#id` deep link or by a chain hop, renders the
  entry's whole lineage family - every predecessor, the entry itself, and every successor - as
  one stacked list, sorted like the main list. Clicking any chain node scrolls to that sibling
  card in place, with the existing flash highlight. New `lineageFamily()` helper, an extracted
  `byRecency()` comparator, and `rowEl()` and `scrollRowIntoView()` helpers. Chain-node clicks
  are intercepted in `wireRows()` and fall through to the normal `#id` route when the target is
  not on screen.

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

  **Why:** every `→` in the chain took the current card's `--state`, so a lineage with a
  deprecation in it and a rename after it rendered in one flat color. The chain showed the
  shape of a history but none of what happened at each step.

  **What:** each arrow is now colored by its left node, the thing that changed: amber for a
  deprecation hop, orange for a rename, green at the live tip. New `.flow-*` modifier classes
  on `.chain-flow`, keyed off the source node's status.

### Fixed
- **`no-isolation-shared-access-mode` now chains through Shared / Single user.**

  **Why:** its `successorId` pointed straight at `standard-and-dedicated-access-modes` and
  skipped the middle hop, so the chain silently dropped a name that really existed. A broken
  chain is a history with a hole in it.

  **What:** rerouted it to `shared-single-user-access-modes`, which already succeeds to
  Standard and Dedicated, and updated `replacement` to match. The chain is now contiguous: No
  isolation shared -> Shared / Single user -> Standard and Dedicated.
- **`databricks-apps` was unreachable from the rail, which blocked the deploy.**

  **Why:** every entry has to be reachable from a rail section, and the Apps entry had no NAV
  section. `validate.py` failed the CI gate, so nothing could ship until it was wired up.

  **What:** added an "Apps" rail item, with a new app-launcher icon, wired to
  `databricks-apps`.

### Docs
- **Folded this session's lessons into the `add-databricks-entry` skill and pointed AGENTS.md
  at it.** The skill now covers prepending an origin card (vs. inserting a middle rename), the
  retronym case (a "legacy X" deprecation label deserving its own origin `rename` card), the
  one-card-owns-its-own-aliases/links rule, and re-verifying + bumping `verified` when editing
  an existing card; its trigger now includes correcting/re-chaining, not just adding. AGENTS.md
  now directs readers to follow the skill for any add **or** edit instead of hand-rolling the flow.

### Changed
- **Rerouted the legacy dashboards successor through Lakeview.**

  **Why:** `legacy-dashboards` pointed straight at `ai-bi-dashboards` and skipped
  `lakeview-dashboards`, which sits between them and already chains onward. The card named the
  right destination by the wrong route, so a real intermediate name went missing from the
  history.

  **What:** repointed `successorId` at `lakeview-dashboards` and `replacement` at "Lakeview
  dashboards", so the chain is continuous: Legacy dashboards -> Lakeview dashboards -> AI/BI
  Dashboards.
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
- **Trimmed `legacy-dashboards` to just the deprecation story.**

  **Why:** the original name is now its own card, so this one was carrying somebody else's
  history. One card, one name: aliases and links belong on the card for the name they describe.

  **What:** dropped the naming aliases and the Redash-acquisition links, which moved to
  `databricks-sql-dashboards`, rewrote `what` and `fact` to focus on the retirement, and
  reframed the `note` as the deprecation-era relabel plus the end-of-life timeline.

## 2026-07-19 (Genie rename lineage)

### Added
- **Intermediate "Genie" rename card.**

  **Why:** the Databricks One lineage was recorded as a single hop, `databricks-one` ->
  `genie-one`. It actually went Databricks One -> **Genie** on April 27, 2026 -> Genie One on
  June 9, 2026, so the list was missing a name the product really had.

  **What:** added the `genie` card, repointed `databricks-one` at it, updated `genie-one`
  (aliases, occasion, note), and wired `genie` into the "Genie Agents" rail section. Sourced
  from the AI/BI 2026 release notes.

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
- **Ids now follow the name, and the gate enforces it.**

  **Why:** an id that does not match its card's name makes deep links lie. Someone links to
  `#workflows` expecting the product called Workflows and lands on the card for whatever now
  holds that id, which on a site about renames is the one mistake that matters.

  **What:** every card's `id` is the kebab slug of its own `name`, with parenthetical
  qualifiers dropped, so a deep link always lands on the card for the product named in the
  link, and when that product was renamed the card says so. 31 ids were normalised - for
  example `workflows` became `lakeflow-jobs` and the former name reclaimed `workflows`, `dlt`
  became `lakeflow-declarative-pipelines`, and `abac` became
  `attribute-based-access-control` - with every `successorId` pointer and the `app.js` NAV
  updated to match. `validate.py` gained a hard check that `id == name_slug(name)`. **Ids are
  permanent from here on:** a rename adds a new card and never re-slugs an existing id. Old
  deep links to the retired ids no longer resolve, since there are no redirects. Contributor
  and agent docs updated to match.
- **Merged `state` into `status`, so there is one lifecycle field per card.**

  **Why:** renames used `state` while deprecations and features used `status`, and the
  deprecation and feature cards copied their `status` into `state` as well. Two fields always
  holding the same value is two fields that can stop holding the same value.

  **What:** every card now carries a single `status` whose vocabulary depends on kind:
  `current` or `renamed` for a rename, `deprecated`, `legacy`, or `retired` for a deprecation,
  and `ga` or `preview` for a feature. Rename cards' `state` migrated into `status` and the
  mirror copies were dropped. `validate.py`, `app.js`, and the contributor and agent docs
  updated to match. Nothing visible changed - badges render identically.
- **PAT reclassified from `deprecated` to `legacy`.**

  **Why:** personal access tokens have no formal deprecation date. The docs page is titled
  "...(legacy)", and calling it deprecated claims a commitment Databricks has not made.

  **What:** PATs now use `legacy`, matching the convention already applied to the legacy CLI
  and the Workspace Model Registry.
- **The filter is now status-based, not kind-based.**

  **Why:** the filter buttons did not match the badges. Unchecking a bucket left cards on
  screen that looked like they belonged to it, because the filter keyed off raw `kind` while
  the card showed a badge derived from status.

  **What:** the buckets are **Active**, **Renamed**, and **Deprecated**, keyed on the badge a
  card actually shows (`bucketOf`). A new feature, a preview, and the current-name side of a
  rename all count as Active, and only superseded former names are Renamed. Unchecking Active
  now hides current names too, where before they stayed on screen filed under the old rename
  bucket. The empty state, the URL `kind=` parameter, and the filter tooltips follow the new
  keys.
- **New status palette via dedicated tokens.**

  **Why:** the old green never adapted to dark mode, and the status colors were entangled with
  the Databricks brand red used for chrome.

  **What:** `--c-active` (emerald), `--c-renamed` (slate), and `--c-deprecated` (amber), each
  with a light **and** a dark value. Badges, card left stripes, and timeline segments all read
  from these tokens, and the brand red (`--accent`) is now chrome only. The solid "retired"
  badge uses a theme-aware `--c-deprecated-ink` so its text stays legible on the amber that
  goes light in dark mode.
- **Badge wording.** `former name` → `renamed`; the current-name badge `current` → `latest`.
- **Logo relaid out as a one-height lockup.** The emblem (unchanged), the inverted **RE**
  chip, and a stacked **bricked** / **latest edition** block now sit in a single row, all
  sized to the same height, matching the wordmark. Previously "REbricked" was one small text
  line with the edition tag beneath the whole word.
- **Year timeline is dynamic.**

  **Why:** the chart showed one undifferentiated bar per year and ignored the filter, so it
  could not answer the question people actually bring to it: was this year mostly renames or
  mostly retirements?

  **What:** each year's bar is now a stacked, colour-coded column (Active, Renamed, Deprecated)
  with a legend, and it re-renders live as the filter toggles. Hiding a bucket rescales the
  plot instead of blanking it. The title is now "Changes by year".
- **Home extras persist across filtering.**

  **Why:** the timeline and the "on this month" spotlight keyed off `allKindsSelected()`, so
  touching any filter hid the whole panel. The moment you started narrowing things down was the
  moment the chart disappeared.

  **What:** both now stay put when a filter toggles, and the spotlight stays when a year is
  selected.

### Added
- **Cookieless analytics (Umami).** No cookies, no personal data, no consent banner. A
  guarded `track(name, data)` helper records anonymous custom events (filter toggles, nav,
  debounced searches, quiz opens, roulette, shares, timeline-year, theme). Every call is
  wrapped so a blocked or absent script can't affect the app.
- **UTM-tagged share links.** `withUTM(url, params)` appends UTM params (kept before any
  `#fragment`) to the card and quiz LinkedIn share URLs, so shared traffic attributes in
  Umami. Card shares carry the entry id as `utm_content`.

### Fixed
- **Card header on phones.**

  **Why:** the wide "✨ Guess a new name using AI" pill sat in a `flex-shrink:0` group pinned
  top-right, so on a narrow card it kept its full width. It wrapped the title onto two lines
  and pushed the status badge and the category onto rows of their own, which is three rows
  spent on a joke button.

  **What:** at `≤640px` the right-hand group now collapses into the card flow
  (`display:contents`): the compact action icons stay pinned beside the title and the pill
  drops to its own full-width
  row underneath. `.row-head-left` grows from `flex-basis:0` so a wide title never bumps the
  icons onto a separate line (regression seen on badge-only cards like deprecations). The
  override lives at the end of the stylesheet so it wins the cascade over the base
  `.row-head-right` rule - media queries add no specificity.

## 2026-07-19 (card header reflow; click-to-copy correction fix)

### Fixed
- **Clicking a card title no longer mislabels an old name as the current one.**

  **Why:** clicking a *former* name (a `"renamed"` card) or a *deprecated* name copied
  "Actually, it's called '<that name>' now", which presents the superseded name as the current
  one. The site's whole job is telling people what a thing is called now, and this told them
  the opposite.

  **What:** a former-name title now
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
- **Every historical name is now its own card.**

  **Why:** old names lived as bare strings inside another card's `lineage` array. That gave
  them no source, no fact, no deep link, and no place in search, the filter counts, or the
  timeline. On a site whose entire subject is the names things used to have, the old names were
  the one thing you could not look up.

  **What:** the `lineage` array is gone. A rename now creates a new `"current"` card and
  freezes the old one as a `"renamed"` card, linked by a single **`successorId`**.
  Predecessors are derived - any card whose `successorId` points here - so a card shows its
  whole history in both directions as linked, jump-to cards. 50 entries became **71 cards**.
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
