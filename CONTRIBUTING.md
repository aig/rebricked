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

## Where the data lives

Add one YAML file per entry under [`kb/databricks/`](kb/databricks/), named `<id>.yaml`. That's
the whole PR. `www/databricks.features.json` - the array the page fetches - is **build output**:
`scripts/build_features.py` assembles it from `kb/`, it's gitignored, and CI regenerates it before
validating and deploying. Editing it directly does nothing; your change gets overwritten.

One file per entry keeps a change legible: adding a rename is a new file plus a one-line
`successorId` edit on its predecessor, instead of a hunk in the middle of a 2,500-line array. And
`git log kb/databricks/delta-live-tables.yaml` is that entry's whole history.

```bash
pip install pyyaml                    # one-time; the only dependency, and only for the build
python scripts/build_features.py      # kb/*.yaml -> www/databricks.features.json
python scripts/validate.py            # the schema gate CI runs
python -m http.server 8777 -d www     # preview at http://localhost:8777/
```

YAML house style: two-space indent, `-` for lists, **one line per value** (don't wrap long notes
or URLs - reflowed text makes noisy diffs), and quote values YAML would otherwise read as a number
or date - `date: '2021'` and `verified: '2026-08-04'` need quotes; a bare `date: 2021-05` doesn't.
Every field rule below is unchanged from when this was one big JSON file.

## Add a rename

Each name is its own card, linked by `successorId`. A rename = one `"active"` card (the
current name, carrying a `from` date) plus one `"renamed"` card per former name (add another
`"renamed"` card for each extra old name). The current-name card is `active` just like a
feature - what marks it as a rename tip is the `renamed` card pointing at it, so it's derived,
not stored.

`kb/databricks/old-name.yaml`:

```yaml
id: old-name
name: Old Name
abbr: ON
category: Data engineering
what:
  note: 'One line: what the thing was under this name.'
  link: https://docs.databricks.com/...
fact:
  - note: Self-contained real-but-fun one-liner about THIS name - don't mention the newer name.
    link: https://docs.databricks.com/...
status:
  value: renamed
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
from:
  date: '2021'
  link: https://docs.databricks.com/...
to:
  date: '2023'
  link: https://docs.databricks.com/...
successorId: the-newest-name
source: https://docs.databricks.com/...
verified: 'YYYY-MM-DD'
```

`kb/databricks/the-newest-name.yaml`:

```yaml
id: the-newest-name
name: The Newest Name
aliases:
  - What people actually type
  - ABBR
category: Data engineering
what:
  note: 'One line: what the thing is.'
  link: https://docs.databricks.com/...
fact:
  - note: Real-but-fun one-liner about the current thing - funny, but true and sourceable.
    link: https://docs.databricks.com/...
  - note: A second sourced fun fact (optional) - up to three total, each with its own link.
    link: https://docs.databricks.com/...
status:
  value: active
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
from:
  date: '2023'
  link: https://docs.databricks.com/...
occasion:
  date: '2023'
  link: https://docs.databricks.com/...
  note: Where it was announced, e.g. Data + AI Summit 2023 (optional).
source: https://docs.databricks.com/...
verified: 'YYYY-MM-DD'
```

## Add a deprecation

`kb/databricks/the-retired-thing.yaml`:

```yaml
id: the-retired-thing
name: The Retired Thing
aliases:
  - what people type
  - /legacy/path
category: Developer experience
what:
  note: 'One line: what the thing was.'
  link: https://docs.databricks.com/...
fact:
  - note: Real-but-fun one-liner about the feature - funny, but the fact must be true and sourceable.
    link: https://docs.databricks.com/...
status:
  value: deprecated
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
deprecatedAt:
  date: '2024'
  link: https://docs.databricks.com/...
removedAt:
  date: 2026-01
  link: https://docs.databricks.com/...
successorId: id-of-the-successor-card (optional)
replacement: What To Use Instead
occasion:
  date: 2026-01
  link: https://docs.databricks.com/...
  note: End of life, if any (optional).
source: https://docs.databricks.com/...
verified: 'YYYY-MM-DD'
```

## Add a feature

`kb/databricks/the-new-thing.yaml`:

```yaml
id: the-new-thing
name: The New Thing
aliases:
  - what people type
  - ABBR
category: Data engineering
what:
  note: 'One line: what the thing is.'
  link: https://docs.databricks.com/...
fact:
  - note: Real-but-fun one-liner about the feature - funny, but the fact must be true and sourceable.
    link: https://docs.databricks.com/...
status:
  value: active
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
releases:
  - type: public-preview
    date: 2024-03
  - type: ga
    date: 2024-11
introducedAt:
  date: '2024'
  link: https://docs.databricks.com/...
occasion:
  date: 2024-11
  link: https://docs.databricks.com/...
  note: Where/when it shipped, e.g. GA at Data + AI Summit (optional).
limitations:
  note: Documented caveats - omit when the docs list none.
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
source: https://docs.databricks.com/...
verified: 'YYYY-MM-DD'
```

### Field rules
- **`status` is a required `{ value, link, date }` object and the sole discriminator** (there
  is no `kind` field). `value` stores only what can't be calculated: `"active"` (any name in use
  now), `"renamed"` (a superseded former name), `"deprecated"`/`"legacy"`/`"retired"` (retired or
  replaced); the validator branches on `status.value` to pick the required fields. `link` is the
  official doc backing the call (a real http(s) URL, may equal `source`) and `date` (`YYYY-MM-DD`,
  never future) is the day you confirmed it. All three are required.
- **`category` is a closed allow-list** (required, every entry). The validator rejects
  anything outside this set - the same set the UI's chips are built from, so pick the closest
  fit rather than coining a new one: `Data engineering`, `Compute / BI`, `Developer experience`,
  `Data governance`, `BI / Dashboards`, `AI / BI`, `AI / ML`. A genuinely new category is
  allowed, but add it deliberately to `VALID_CATEGORIES` in
  [`scripts/validate.py`](scripts/validate.py) in the same PR - never by typo.
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
- `occasion` (optional, any entry) is a dated milestone **object** `{ "date", "link", "note" }`,
  not a bare string - the moment a name debuted or was retired (a summit, a launch blog, an end
  of life), carrying its own confirmation link like the date fields do. `date` is `YYYY`/`YYYY-MM`,
  `link` a real http(s) URL backing it, `note` the short human label (e.g. `"Data + AI Summit 2025"`).
  The UI appends it to the card's date line. (A plain string is tolerated for legacy resilience,
  but write new entries as the object.)
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
  `python scripts/fetch_reference.py databricks-resource-limits`). That page's **`Fixed`** column
  tells you whether a limit is hard (`Yes`) or soft (`No` - raisable on request via the account
  team); write soft limits as raisable defaults, not absolute caps. The UI renders it as a
  "Limitations" line on the card.
- `what` is **required** on every entry: an object `{ "note", "link" }`. `note` is the one-line
  description of the thing under this name (self-contained, like `fact`); `link` is the official
  doc that description is drawn from - **both are required**, and `link` must be a real, verified
  http(s) URL (it may be the same as `source`). The UI renders `note` as the card's description
  with a 🔗 to `link`.
- `source` is **required** on every entry. No source, no entry. Prefer official Databricks /
  Microsoft Learn docs - an archived "legacy"/"migrate from X" doc is ideal for deprecations.
- `verified` is the date a human last confirmed it. Put the day you checked.
- `fact` is **required** on every entry: an **array of one to three** `{ "note", "link" }`
  objects, each a real-but-fun one-liner about the feature itself. `note` is the fun-fact text;
  `link` is **required** on every fact and must be a real, verified official http(s) URL that
  backs *that specific* claim (it may reuse `source` or `what.link`). Unlike `prediction`, a fact
  is **not** fiction - only the tone is ours; the fact underneath must be real and sourceable
  (what it does, how it works, its rename history, a documented quirk or codename). Keep each
  about the feature, not its pricing, and self-contained. The UI renders each as its own 💡 row.
  (There is **no** top-level `note` field - it was folded into this array and removed.)
- `id` is the kebab-case slug of the entry's own `name`, with any parenthetical qualifier
  dropped, unique across the vendor (all entries share one namespace), **and it is the
  filename**: `kb/databricks/<id>.yaml`. Examples:
  `"Unity Catalog Volumes"` → `unity-catalog-volumes.yaml`;
  `"Attribute-based access control (ABAC)"` → `attribute-based-access-control.yaml`. The build
  fails if `id` and filename disagree; the validator enforces the slug rule. **Ids are
  permanent:** once assigned, an id never changes - not to fix a mismatch, not on a later rename.
  A rename adds a *new* file with the new name's slug and points the old card's `successorId` at
  it; the old card keeps its id and filename. Never re-slug or `git mv` an existing entry.
- **Date-bearing fields are `{ "date", "link" }` objects, not bare strings.** `from`, `to`,
  `introducedAt`, `deprecatedAt`, and `removedAt` each carry the date **plus** the official doc
  confirming it - the same pattern as `status`/`occasion`. `date` is `YYYY` or `YYYY-MM`; `link`
  is a real, verified http(s) URL backing that date (it may reuse `source`). Precision is
  optional; honesty about precision is not. (A bare date string still validates for legacy
  resilience, but every current entry uses the object - write new ones that way.)
- Never use em dashes (`—`) in any text field. Use a hyphen (`-`) instead.
- If sources disagree on a date, use the official doc's date; if the discrepancy is worth
  recording, note it in a `fact` entry with the source that disagrees.
- `prediction` (renames and features only, optional) is the one **deliberately fictional**
  field: an **array** of made-up next names for the product, e.g.
  `["Genie Pipelines", "Unity Pipelines"]`. They power the "New" button gag, the card's
  "AI guess" reveal, and the quiz's hardest distractors, and the UI always labels them as
  invented. Keep them deadpan-plausible; everything else in the entry stays sourced and real.

### Review bar
A maintainer checks the source resolves and the date is defensible. Merge = publish.

The joke tolerates being late. It does not tolerate being wrong.
