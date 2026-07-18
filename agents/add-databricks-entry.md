---
name: add-databricks-entry
description: >-
  Track a Databricks thing in the rebricked repo. Given a name — new or old, current or
  ancient — investigate its full history: what it was, every rename, whether it was
  deprecated or retired, and what it's called today. Then classify it (rename /
  deprecation / feature) and add the correctly-shaped, sourced entry to databricks.json —
  including a funny-but-accurate `price` line grounded in real Databricks billing.
  Use whenever asked to "add a feature", "add X", or "track X" — even if X is old or you
  don't yet know what happened to it. Enforces the one rule: real, sourced changes only.
tools: Read, Edit, Grep, Glob, Bash, WebFetch, WebSearch
---

# Track a Databricks thing in rebricked

The user names a Databricks product/feature — it may be brand-new, decades old, renamed
three times, or quietly retired. **You do not assume which.** "Add a feature" here means
"figure out what happened to this thing and record it correctly." Your job is to
**investigate first**, then classify, then add one sourced object to
[`databricks.json`](../databricks.json).

**The one rule: real, sourced changes only. Never be confidently wrong.** Every claim —
the current name, each date, the lifecycle status — must trace to a live official Databricks
or Microsoft Learn doc. If you cannot verify it, do not add it; report what you found and
what you couldn't confirm. The joke tolerates being late; it does not tolerate being wrong.

## Step 1 — Investigate (do this before deciding anything)

Given the name, research the thing's whole lifecycle with `WebSearch` / `WebFetch`:

- **What is/was it?** One-line description an engineer would recognize.
- **Its name history.** Original name → every rename → what it's called *today*. Watch for
  abbreviations and the names people actually type (these become `aliases`).
- **Its lifecycle status right now.** Is it current and thriving? Renamed? Deprecated but
  still around? Retired/removed? Superseded by a different tool?
- **Dates.** When it launched, when each rename happened, when it was deprecated/removed.
  Use `YYYY` or `YYYY-MM` — honesty about precision beats false precision.
- **Sources.** Capture the exact official doc URL(s). Prefer current docs for names and
  status; an archived "legacy" / "migrate from X" doc is ideal evidence for a deprecation.

Start from the request even if it uses an old name — searching the old name is often how
you discover the rename or retirement. Do not stop at the first page; confirm the *current*
state, not just the historical one.

## Step 2 — Classify into exactly one kind

The investigation decides the shape — not the user's wording:

- **rename** (`kind` absent) — Databricks gave a new name to *the same thing*. Tell the
  full `lineage` story ending in the current name. This is the common case for an "old"
  thing that's still around under a new name.
- **deprecation** (`kind: "deprecation"`) — Databricks retired or replaced it; a *different*
  thing took over (or nothing did). Different tool/API/format = deprecation, not rename
  (e.g. `dbx` → Asset Bundles).
- **feature** (`kind: "feature"`) — a genuinely new capability, not renamed and not retired
  (e.g. Liquid Clustering, Unity Catalog Volumes).

If your research contradicts how the user described it ("add feature X" but X was actually
deprecated in 2024), record what's true and say so in your report.

## Step 3 — Check for collisions

`Read` [`databricks.json`](../databricks.json) and grep for the name / candidate `id` and
any historical names. If the thing is already tracked, update that entry rather than adding
a duplicate. `id` is kebab-case and **unique across the whole file** (all kinds share one
namespace).

## Step 4 — Write the entry (shape depends on the kind)

**Rename** — required `id`, `current`, `category`, `what`, `lineage`, `renamedAt`, `source`,
`verified`. `current` **must equal** the last `lineage` step (the one with `"to": null`).
Non-final steps need a `to` date and must be chronological.

```json
{
  "id": "kebab-case-unique-id",
  "current": "The Newest Name",
  "aliases": ["What people type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "price": "Deadpan one-liner anchored to a real billing fact (e.g. DBUs, a real SKU tier).",
  "lineage": [
    { "name": "Old Name", "abbr": "ON", "from": "2021", "to": "2023" },
    { "name": "The Newest Name", "from": "2023", "to": null }
  ],
  "renamedAt": "2023",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

**Deprecation** — required `id`, `name`, `category`, `what`, `deprecatedAt`, `status`,
`source`, `verified`. `status` is `"deprecated"`, `"retired"`, or `"legacy"`. Omit
`replacement` if nothing replaced it; set `replacementId` when the successor has its own
entry. `removedAt` must not precede `deprecatedAt`.

```json
{
  "id": "kebab-case-unique-id",
  "kind": "deprecation",
  "name": "The Retired Thing",
  "aliases": ["what people type", "/legacy/path"],
  "replacement": "What To Use Instead",
  "replacementId": "id-of-successor-entry",
  "category": "Developer experience",
  "what": "One line: what the thing was.",
  "price": "Deadpan one-liner anchored to a real billing fact (e.g. was free; the cost is the migration).",
  "deprecatedAt": "2024",
  "removedAt": "2026-01",
  "status": "deprecated",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

**Feature** — required `id`, `kind`, `name`, `category`, `what`, `introducedAt`, `source`,
`verified`. `status` is `"ga"` or `"preview"` (defaults `ga`). No `lineage`/`renamedAt`/
`replacement` — the validator warns and the UI ignores them.

```json
{
  "id": "kebab-case-unique-id",
  "kind": "feature",
  "name": "The New Thing",
  "aliases": ["what people type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "price": "Deadpan one-liner anchored to a real billing fact (e.g. DBUs, storage, serverless premium).",
  "introducedAt": "2024",
  "status": "ga",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

Rules that apply to every kind:
- `category` must be one of the validator's allow-list: `Data engineering`, `Compute / BI`,
  `Developer experience`, `Data governance`, `BI / Dashboards`, `AI / BI`, `AI / ML`.
  A new category means editing `scripts/validate.py` on purpose — never by typo.
- `source` is required and must be an http(s) URL. No source, no entry.
- `verified` is `YYYY-MM-DD` — the day *you* checked. Never a future date.
- `price` (required, every kind) is a deadpan one-liner on what the thing costs. Unlike
  `prediction`, it is **not** fiction — only the attitude is invented; the billing fact
  underneath must be true. Anchor the joke to something real: **DBUs** as the unit,
  a real SKU tier (Jobs vs All-Purpose Compute; DLT/Lakeflow **Core/Pro/Advanced**; SQL
  Warehouse **Classic/Pro/Serverless**), the serverless premium (serverless DBSQL lists
  ~$0.70/DBU), storage/egress, "contact your account team" for preview/beta, or "included
  at no additional cost". Governance (Unity Catalog, Catalog Explorer, ABAC) is genuinely
  free — say so, and note it's the compute it governs that bills. Keep it to one or two
  sentences. Prefer the official pricing page (databricks.com/product/pricing) as evidence.
- `prediction` (renames and features only, optional) is the one deliberately fictional
  field: a non-empty array of deadpan-plausible made-up *next* names. Everything else
  stays sourced and real.

## Step 5 — Wire it into the sidebar

`Read` the `NAV` config in [`app.js`](../app.js) and add the new `id` to the `ids` array of
the rail section it belongs to (or add a section if the request calls for one). Every entry
must be reachable from at least one section — the validator fails on an unreachable id.

## Step 6 — Validate and log

1. Run the schema gate; it must print `OK` (CI runs the same one):
   ```
   python scripts/validate.py
   ```
   Fix any error it reports and re-run.
2. Add a line to [`CHANGELOG.md`](../CHANGELOG.md) under today's date.

## Report back

State: the thing you tracked, the **kind you concluded and why** (the history you found —
original name, renames, current name, lifecycle status), the `id` and category, the source
URL(s) you verified against, the NAV section, and that `python scripts/validate.py` passed.
If any part couldn't be verified against a live doc, say exactly what and add nothing rather
than guess.
