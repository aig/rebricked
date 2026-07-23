---
name: add-databricks-entry
description: >-
  Track a Databricks thing in the rebricked repo. Given a name - new or old, current or
  ancient - investigate its full history: what it was, every rename, whether it was
  deprecated or retired, and what it's called today. Then classify it (rename /
  deprecation / feature) and add the correctly-shaped, sourced entry to databricks.features.json -
  including a funny-but-accurate `fact` line grounded in real Databricks history.
  Use whenever asked to "add a feature", "add X", or "track X" - even if X is old or you
  don't yet know what happened to it - and equally when correcting, re-verifying, or
  re-chaining an entry that already exists. Enforces the one rule: real, sourced changes only.
tools: Read, Edit, Grep, Glob, Bash, WebFetch, WebSearch
---

# Track a Databricks thing in rebricked

The user names a Databricks product/feature - it may be brand-new, decades old, renamed
three times, or quietly retired. **You do not assume which.** "Add a feature" here means
"figure out what happened to this thing and record it correctly." Your job is to
**investigate first**, then classify, then add one sourced object to
[`databricks.features.json`](../databricks.features.json).

**The one rule: real, sourced changes only. Never be confidently wrong.** Every claim -
the current name, each date, the lifecycle status - must trace to a live official Databricks
or Microsoft Learn doc. If you cannot verify it, do not add it; report what you found and
what you couldn't confirm. The joke tolerates being late; it does not tolerate being wrong.

## Step 1 - Investigate (do this before deciding anything)

Given the name, research the thing's whole lifecycle with `WebSearch` / `WebFetch`:

- **What is/was it?** One-line description an engineer would recognize.
- **Its name history.** Original name → every rename → what it's called *today*. Watch for
  abbreviations and the names people actually type (these become `aliases`).
- **Its lifecycle status right now.** Is it current and thriving? Renamed? Deprecated but
  still around? Retired/removed? Superseded by a different tool?
- **Dates.** When it launched, when each rename happened, when it was deprecated/removed.
  Use `YYYY` or `YYYY-MM` - honesty about precision beats false precision.
- **Sources.** Capture the exact official doc URL(s). Prefer current docs for names and
  status; an archived "legacy" / "migrate from X" doc is ideal evidence for a deprecation.

Start from the request even if it uses an old name - searching the old name is often how
you discover the rename or retirement. Do not stop at the first page; confirm the *current*
state, not just the historical one.

## Step 2 - Classify by `status` (the sole discriminator)

There is **no `kind` field** - an entry's `status` names its family. The investigation
decides which, not the user's wording:

- **rename** (`status: "active"` for the current name + `"renamed"` for each former name) -
  Databricks gave a new name to *the same thing*. Add **one card per name**: an `"active"`
  card (the current name, carrying a `from` date) plus a `"renamed"` card for each former
  name, chained by `successorId`. The current-name card is `active` just like a feature; it
  reads as a rename tip only because a `renamed` card points at it (calculated, not stored).
  This is the common case for an "old" thing still around under a new name.
- **deprecation** (`status: "deprecated"` / `"legacy"` / `"retired"`) - Databricks retired or
  replaced it; a *different* thing took over (or nothing did). Different tool/API/format =
  deprecation, not rename (e.g. `dbx` → Asset Bundles).
- **feature** (`status: "active"`) - a genuinely new capability, not renamed and not retired
  (e.g. Liquid Clustering, Unity Catalog Volumes).

Release maturity (Preview vs GA) is a *separate*, orthogonal `release` axis - not part of
this choice. See Step 4.

If your research contradicts how the user described it ("add feature X" but X was actually
deprecated in 2024), record what's true and say so in your report.

## Step 3 - Check for collisions

`Read` [`databricks.features.json`](../databricks.features.json) and grep for the name / candidate `id` and
any historical names. If the thing is already tracked, update that entry rather than adding
a duplicate. **When you edit an existing card** (new facts, corrected dates, a rerouted
`successorId`, moved aliases), re-verify every changed claim against a live official doc and
bump `verified` to today - an edit is held to the same "real, sourced" bar as a new entry.

**The id follows the name.** Every card's `id` is the kebab-case slug of **its own `name`**,
with any parenthetical qualifier dropped, and **unique across the whole file** (all entries
share one namespace). Examples: `"Unity Catalog Volumes"` → `unity-catalog-volumes`;
`"Attribute-based access control (ABAC)"` → `attribute-based-access-control`;
`"Databricks CLI (v0.205+)"` → `databricks-cli`. The validator enforces this exactly, so a
mismatched id fails the gate.

**Ids are permanent.** Once a card exists, its id never changes - not to tidy a mismatch,
and not when the product is later renamed. A rename adds a **new** card whose id is the new
name's slug and points the old card's `successorId` at it; the old card keeps its id and
name unchanged. Do not re-slug existing entries.

**Inserting an intermediate rename.** If the new name belongs *between* two cards that are
already chained - a middle rename you'd missed, or a name that turns out to have had a brief
in-between title - add the new card and **repoint the predecessor** at it: set the
predecessor's `successorId` to the new card and its `to` to the new card's `from`, and set
the new card's `successorId`/`to` to the old successor. The chain must stay contiguous
(predecessor -> new card -> successor); never leave the predecessor pointing past the card
you inserted. Example: Databricks One -> **Genie** -> Genie One, where the `databricks-one`
card was repointed from `genie-one` to the inserted `genie` card.

**Prepending an origin card.** If the new name comes *before* the current earliest card - an
original name you'd missed - just add the new card with its `successorId` pointing at the
existing first card. Nothing points at that card yet, so there's nothing to repoint. Watch
for a deprecation label that is really a retronym for an earlier product: "legacy X" is a
renamed *same thing*, so the original name deserves its own `rename` card feeding the
deprecation card. Example: Databricks SQL dashboards -> Legacy dashboards -> Lakeview
dashboards -> AI/BI Dashboards.

**One card owns one name's aliases and links.** When you split a name off into its own card,
move that name's `aliases` and its origin-story `links` onto the new card so each card owns
only its own names - don't leave them duplicated on the neighbour. Example: the
`Redash dashboards` / `DBSQL dashboards` aliases and the Redash-acquisition links live on
`databricks-sql-dashboards`, not on the `legacy-dashboards` card it precedes.

## Step 4 - Write the entry (shape depends on `status`)

**Rename** (`"renamed"` former names + an `"active"` current name) - one card per name. Each
card: required `id`, `name`, `category`, `what`, `fact`, `status`, `source`, `verified`. A
`"renamed"` card also needs `to` and `successorId` (the next name's id); the `"active"`
current-name card has a `from` and no `to`. Each `fact` is self-contained - about that name,
never mentioning the successor. Predecessors are derived from `successorId`.

```json
{
  "id": "old-name",
  "name": "Old Name",
  "abbr": "ON",
  "category": "Data engineering",
  "what": "One line: what the thing was under this name.",
  "fact": "Self-contained real-but-fun one-liner about THIS name (a quirk, its origin, a detail).",
  "from": "2021",
  "to": "2023",
  "successorId": "the-newest-name",
  "status": "renamed",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
},
{
  "id": "the-newest-name",
  "name": "The Newest Name",
  "aliases": ["What people type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "fact": "Real-but-fun one-liner about the current thing (what it does, a codename, a detail).",
  "from": "2023",
  "status": "active",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

**Deprecation** (`status: "deprecated"` / `"legacy"` / `"retired"`) - required `id`, `name`,
`category`, `what`, `status`, `deprecatedAt`, `source`, `verified`. `status` is
`"deprecated"`, `"retired"`, or `"legacy"`. Omit `replacement` if nothing replaced it; set
`successorId` when the successor has its own card. `removedAt` must not precede `deprecatedAt`.

```json
{
  "id": "the-retired-thing",
  "name": "The Retired Thing",
  "aliases": ["what people type", "/legacy/path"],
  "replacement": "What To Use Instead",
  "successorId": "id-of-successor-card",
  "category": "Developer experience",
  "what": "One line: what the thing was.",
  "fact": "Real-but-fun one-liner about the feature (e.g. why it was replaced, what changed under the hood).",
  "deprecatedAt": "2024",
  "removedAt": "2026-01",
  "status": "deprecated",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

**Feature** (`status: "active"`) - required `id`, `name`, `category`, `what`, `status`,
`introducedAt`, `source`, `verified`. Optionally add a `releases` maturity timeline (see
below). If it later gets renamed, add a card for the new name, set this one's `successorId`
to it, and change this card's `status` to `renamed`.

```json
{
  "id": "the-new-thing",
  "name": "The New Thing",
  "aliases": ["what people type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "fact": "Real-but-fun one-liner about the feature (e.g. a standout capability, a documented quirk).",
  "introducedAt": "2024",
  "status": "active",
  "releases": [
    { "type": "public-preview", "date": "2024-03" },
    { "type": "ga", "date": "2024-11" }
  ],
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

**The `releases` timeline (optional, any entry)** is orthogonal to `status`: `status` says
what the card is, `releases` says how mature it is. It's an **ordered array of stages** -
chronological, the **last being its current maturity**. Each stage is either **reached**
(`{ "type", "date" }`) or **announced but not yet reached** (`{ "type", "is_announced": true }`,
no date; only the last stage may be announced). Valid `type`s in Databricks' order:
`private-preview` → `beta` → `public-preview` → `ga`. There is no `pre-ga` type - "GA
approaching soon" is `{ "type": "ga", "is_announced": true }`. Only include reached stages
whose dates you can source (don't invent transition dates); omit `releases` when maturity is
unknown or moot. It composes with any `status`, so a card can be `active` but currently
`public-preview`, or even `legacy` but `beta` (shipped Beta, then marked legacy without ever
reaching GA).

Rules that apply to every entry:
- `category` must be one of the validator's allow-list: `Data engineering`, `Compute / BI`,
  `Developer experience`, `Data governance`, `BI / Dashboards`, `AI / BI`, `AI / ML`.
  A new category means editing `scripts/validate.py` on purpose - never by typo.
- `source` is required and must be an http(s) URL. No source, no entry.
- Never use em dashes (`—`) in any text field (`what`, `fact`, `note`, `prediction`, etc.).
  Use a hyphen (`-`) instead.
- `verified` is `YYYY-MM-DD` - the day *you* checked. Never a future date.
- `fact` (required, every entry) is a real-but-fun one-liner about the feature itself. Unlike
  `prediction`, it is **not** fiction - only the tone is ours; the fact underneath must be
  true and sourceable. Anchor the fun to something real: what it actually does, how it works
  under the hood, its rename history (a URL that still betrays the old name, an acronym kept
  through a rebrand), an engine codename, or a documented quirk. Keep it about the *feature*,
  not its pricing. One or two sentences. Prefer the official docs as evidence.
- `prediction` (renames and features only, optional) is the one deliberately fictional
  field: a non-empty array of deadpan-plausible made-up *next* names. Everything else
  stays sourced and real.
- `limitations` (optional, any entry) is a single `{ note, link, date }`: a short summary of the
  feature's officially documented limitations, the official docs page it came from, and the date
  you fetched it (`date` is `YYYY-MM-DD`). Look it up on the feature's official page; write a
  concise `note` (hyphens, no em dashes) and cite the exact URL. **Omit the field entirely when
  the docs list no limitations - never invent one.** Held to the same real-and-sourced bar as
  every other claim.

## Step 5 - Wire it into the sidebar

`Read` the `NAV` config in [`app.js`](../app.js) and add the new `id` to the `ids` array of
the rail section it belongs to (or add a section if the request calls for one). Every entry
must be reachable from at least one section - the validator fails on an unreachable id.

## Step 6 - Validate and log

1. Run the schema gate; it must print `OK` (CI runs the same one):
   ```
   python scripts/validate.py
   ```
   Fix any error it reports and re-run.
2. Add a line to [`CHANGELOG.md`](../CHANGELOG.md) under today's date.

## Report back

State: the thing you tracked, the **status you concluded and why** (the history you found -
original name, renames, current name, lifecycle status), the `id` and category, the source
URL(s) you verified against, the NAV section, and that `python scripts/validate.py` passed.
If any part couldn't be verified against a live doc, say exactly what and add nothing rather
than guess.
