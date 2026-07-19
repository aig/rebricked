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

Add one object to [`databricks.json`](databricks.json). That's the whole PR.

## Add a rename

Each name is its own card, linked by `successorId`. A rename = one `"current"` card plus
one `"renamed"` card per former name (add another `"renamed"` card for each extra old name).

```json
{
  "id": "old-name-slug",
  "name": "Old Name",
  "abbr": "ON",
  "category": "Data engineering",
  "what": "One line: what the thing was under this name.",
  "fact": "Self-contained real-but-fun one-liner about THIS name - don't mention the newer name.",
  "from": "2021",
  "to": "2023",
  "successorId": "kebab-case-unique-id",
  "status": "renamed",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
},
{
  "id": "kebab-case-unique-id",
  "name": "The Newest Name",
  "aliases": ["What people actually type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "fact": "Real-but-fun one-liner about the current thing - funny, but true and sourceable.",
  "from": "2023",
  "status": "current",
  "occasion": "Where it was announced (optional).",
  "note": "Anything an engineer needs to know - does old code still run? (optional)",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

## Add a deprecation

```json
{
  "id": "kebab-case-unique-id",
  "kind": "deprecation",
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
  "id": "kebab-case-unique-id",
  "kind": "feature",
  "name": "The New Thing",
  "aliases": ["what people type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "fact": "Real-but-fun one-liner about the feature - funny, but the fact must be true and sourceable.",
  "introducedAt": "2024",
  "status": "ga",
  "occasion": "Where/when it shipped (optional).",
  "note": "Anything an engineer needs - what it replaces, GA vs preview caveats (optional).",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

### Field rules
- **Renames:** one card per name. Each `"renamed"` card needs a `to` date and a
  `successorId`; the `"current"` card has no `to`. Predecessors are derived from
  everyone's `successorId`, so you never store a backward link. Keep each card's `fact`
  self-contained (about that name, not its successor).
- **Deprecations:** `status` is `"deprecated"`, `"retired"`, or `"legacy"`. Choose
  `"legacy"` - **not** `"deprecated"` - when the docs merely call it legacy/unsupported but
  Databricks has set **no formal deprecation date or timeline** (a "…(legacy)" doc title is
  the tell); reserve `"deprecated"` for an actual announced deprecation, and `"retired"` for
  something already removed. `removedAt` is optional; omit `successorId`/`replacement` if
  nothing directly replaces it (renders as "retired"). Set `successorId` when the successor
  has its own card - the card links to it.
- **Features:** `introducedAt` (`YYYY`/`YYYY-MM`) is required; `status` is `"ga"` or
  `"preview"` (optional, defaults to `ga`). If the thing later gets renamed, add a card for
  the new name and point this one's `successorId` at it.
- **`status` is the single lifecycle field**, and its allowed values depend on the kind:
  `"current"`/`"renamed"` for a rename, `"deprecated"`/`"legacy"`/`"retired"` for a
  deprecation, `"ga"`/`"preview"` for a feature. There is no separate `state` field - one
  value per card says where it sits in its own lifecycle.
- `links` (optional, every kind): additional classified references, an array of
  `{ "url", "kind": "official"|"community"|"internet", "label" }`. Every URL must be real
  and verified - a dead or off-topic link is worse than none.
- `source` is **required** on every entry. No source, no entry. Prefer official Databricks /
  Microsoft Learn docs - an archived "legacy"/"migrate from X" doc is ideal for deprecations.
- `verified` is the date a human last confirmed it. Put the day you checked.
- `fact` is **required** on every entry: a real-but-fun one-liner about the feature itself.
  Unlike `prediction`, it is **not** fiction - only the tone is ours; the fact underneath
  must be real and sourceable (what it does, how it works, its rename history, a documented
  quirk or codename). Keep it about the feature, not its pricing. One or two sentences.
- `id` is kebab-case and unique across the whole file (renames and deprecations share it).
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
