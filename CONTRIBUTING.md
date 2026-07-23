# Contributing to rebricked

One rule: **real, sourced changes only.** Three kinds fit: **renames**, **deprecations**,
and **features**. If it wouldn't make a data engineer nod and say "oh, *that's* what
happened to it" (or "oh, *that's* the new thing") - it doesn't belong here.

- A **rename** is a product/feature Databricks gave a new name for *the same thing*. Not a
  new product, not a casual nickname.
- A **deprecation** is a feature Databricks retired or replaced. A *different* thing takes
  over (or nothing does) - the opposite of a rename. `dbx` → Asset Bundles is a deprecation,
  not a rename: different tool, different config format.
- A **feature** is a genuinely *new* capability worth tracking - not renamed, not (yet)
  deprecated. It records what it is and when it landed, so the timeline stays complete.
  Liquid Clustering and Unity Catalog Volumes are features. Same bar: real and sourced.

There is **no `kind` field** - `status` is the sole discriminator, and it stores only what
can't be calculated: `active` (any name in use now), `renamed` (a superseded former name), or
`deprecated`/`legacy`/`retired` (retired or replaced). Whether an `active` card is a fresh
feature or the current name of a rename is *calculated*, not stored - a feature carries its
own `introducedAt`; the current tip of a rename chain carries `from`. `status` is what the
validator branches on to decide the entry's shape.

Add one object to [`databricks.features.json`](databricks.features.json). That's the whole PR.

## Add a rename

Each name is its own card, linked by `successorId`. A rename = one `"active"` card (the
current name, carrying a `from` date) plus one `"renamed"` card per former name (add another
`"renamed"` card for each extra old name). The current-name card is `active` just like a
feature - what marks it as a rename tip is the `renamed` card pointing at it, so it's derived,
not stored.

```json
{
  "id": "old-name",
  "name": "Old Name",
  "abbr": "ON",
  "category": "Data engineering",
  "what": "One line: what the thing was under this name.",
  "fact": "Self-contained real-but-fun one-liner about THIS name - don't mention the newer name.",
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
  "aliases": ["What people actually type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "fact": "Real-but-fun one-liner about the current thing - funny, but true and sourceable.",
  "from": "2023",
  "status": "active",
  "occasion": "Where it was announced (optional).",
  "note": "Anything an engineer needs to know - does old code still run? (optional)",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

## Add a deprecation

```json
{
  "id": "the-retired-thing",
  "name": "The Retired Thing",
  "aliases": ["what people type", "/legacy/path"],
  "replacement": "What To Use Instead",
  "successorId": "id-of-the-successor-card (optional)",
  "category": "Developer experience",
  "what": "One line: what the thing was.",
  "fact": "Real-but-fun one-liner about the feature - funny, but the fact must be true and sourceable.",
  "deprecatedAt": "2024",
  "removedAt": "2026-01",
  "status": "deprecated",
  "occasion": "End of life date, if any (optional).",
  "note": "Why it's a replacement, not a rename; migration path (optional).",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

## Add a feature

```json
{
  "id": "the-new-thing",
  "name": "The New Thing",
  "aliases": ["what people type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "fact": "Real-but-fun one-liner about the feature - funny, but the fact must be true and sourceable.",
  "introducedAt": "2024",
  "status": "active",
  "releases": [
    { "type": "public-preview", "date": "2024-03" },
    { "type": "ga", "date": "2024-11" }
  ],
  "occasion": "Where/when it shipped (optional).",
  "note": "Anything an engineer needs - what it replaces, GA vs preview caveats (optional).",
  "limitations": { "note": "Documented caveats - omit when the docs list none.", "link": "https://docs.databricks.com/...", "date": "YYYY-MM-DD" },
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

### Field rules
- **`status` is the sole discriminator** (there is no `kind` field), and it stores only what
  can't be calculated: `"active"` (any name in use now), `"renamed"` (a superseded former
  name), `"deprecated"`/`"legacy"`/`"retired"` (retired or replaced). The validator branches
  on it to pick the required fields.
- **Active = features *and* current rename tips.** Don't store which one a card is - it's
  calculated: a standalone **feature** carries its own `introducedAt`; the **current tip** of
  a rename chain carries `from` (and has a `renamed` card pointing at it). An `active` card
  must have **exactly one** of `introducedAt`/`from` and never a `to` - that's what keeps the
  distinction unambiguous. Maturity (Preview vs GA) is **not** `status` - it's the separate
  `releases` timeline below.
- **Renames:** one card per name. Each `"renamed"` card needs a `to` date and a `successorId`;
  the `"active"` current-name card has a `from` and no `to`. Predecessors are derived from
  everyone's `successorId`, so you never store a backward link. When a feature is later
  renamed, change its card to `status: "renamed"` with a `to`/`successorId` and add the new
  name's `active` card. Keep each card's `fact` self-contained (about that name, not its
  successor).
- **Deprecations:** `status` is `"deprecated"`, `"retired"`, or `"legacy"`. Choose
  `"legacy"` - **not** `"deprecated"` - when the docs merely call it legacy/unsupported but
  Databricks has set **no formal deprecation date or timeline** (a "…(legacy)" doc title is
  the tell); reserve `"deprecated"` for an actual announced deprecation, and `"retired"` for
  something already removed. `removedAt` is optional; omit `successorId`/`replacement` if
  nothing directly replaces it (renders as "retired"). Set `successorId` when the successor
  has its own card - the card links to it.
- **`releases` is the maturity timeline** (optional, any entry): an **ordered array of
  stages** the thing has entered, chronological. The **last element is its current maturity**.
  Each stage is either **reached** - `{ "type", "date" }` (the date it hit that stage) - or
  **announced but not yet reached** - `{ "type", "is_announced": true }` (no date; only the
  last stage may be announced). It is **orthogonal** to `status` - a thing can be `active` but
  currently in public preview, or even `legacy` but `beta` (shipped as Beta, later marked
  legacy without ever reaching GA - e.g. Agent Bricks Custom LLM). The valid stage `type`s are
  Databricks' own release stages, in order:

  | `type` | Databricks stage | Meaning |
  |---|---|---|
  | `private-preview` | Private Preview | Invite-only, a small set of customers |
  | `beta` | Beta | Available to most customers |
  | `public-preview` | Public Preview | Available to all customers |
  | `ga` | GA | Fully supported, production-ready (off the Previews page) |

  There is **no `pre-ga` type** - "GA approaching soon" is just GA announced-but-unreached,
  i.e. `{ "type": "ga", "is_announced": true }`. Only include reached stages whose dates you
  can source (`YYYY`/`YYYY-MM`); don't invent transition dates. Omit `releases` entirely when
  maturity is unknown or moot (e.g. a superseded former name). The UI shows the current (last)
  stage as a pill on a cool-hue ramp (violet -> indigo -> blue -> green; an announced stage
  renders "<Stage> soon", dashed), with the full timeline in the tooltip.
- `links` (optional, every entry): additional classified references, an array of
  `{ "url", "kind": "official"|"community"|"internet", "label" }`. (That inner `kind`
  classifies the *link* - it is unrelated to the entry's `status`.) Every URL must be real
  and verified - a dead or off-topic link is worse than none.
- `limitations` (optional, any entry): a single `{ "note", "link", "date" }` - a concise
  summary of the feature's **officially documented** limitations, the official page it came from,
  and the date you fetched it (`date` is `YYYY-MM-DD`). Source it like everything else and
  **omit it when the docs list none - never invent a limitation.** Cross-check any numeric quota
  against the mirrored resource-limits reference
  (`reference/docs.databricks.com/aws/en/resources/limits.md`, refreshed with
  `python scripts/fetch_reference.py databricks-resource-limits`). The UI renders it as a
  "Limitations" line on the card.
- `source` is **required** on every entry. No source, no entry. Prefer official Databricks /
  Microsoft Learn docs - an archived "legacy"/"migrate from X" doc is ideal for deprecations.
- `verified` is the date a human last confirmed it. Put the day you checked.
- `fact` is **required** on every entry: a real-but-fun one-liner about the feature itself.
  Unlike `prediction`, it is **not** fiction - only the tone is ours; the fact underneath
  must be real and sourceable (what it does, how it works, its rename history, a documented
  quirk or codename). Keep it about the feature, not its pricing. One or two sentences.
- `id` is the kebab-case slug of the entry's own `name`, with any parenthetical qualifier
  dropped, and unique across the whole file (all entries share one namespace). Examples:
  `"Unity Catalog Volumes"` → `unity-catalog-volumes`;
  `"Attribute-based access control (ABAC)"` → `attribute-based-access-control`. The validator
  enforces this. **Ids are permanent:** once assigned, an id never changes - not to fix a
  mismatch, not on a later rename. A rename adds a *new* card with the new name's slug and
  points the old card's `successorId` at it; the old card keeps its id. Never re-slug an
  existing entry.
- Dates use `YYYY` or `YYYY-MM`. Precision is optional; honesty about precision is not.
- Never use em dashes (`—`) in any text field. Use a hyphen (`-`) instead.
- If sources disagree on a date, use the official doc's date and say so in `note`.
- `prediction` (renames and features only, optional) is the one **deliberately fictional**
  field: an **array** of made-up next names for the product, e.g.
  `["Genie Pipelines", "Unity Pipelines"]`. They power the "New" button gag, the card's
  "AI guess" reveal, and the quiz's hardest distractors, and the UI always labels them as
  invented. Keep them deadpan-plausible; everything else in the entry stays sourced and real.

### Review bar
A maintainer checks the source resolves and the date is defensible. Merge = publish.

The joke tolerates being late. It does not tolerate being wrong.
