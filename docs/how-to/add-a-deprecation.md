# How to add a deprecation

**Use this when** Databricks retired or replaced something and a *different* thing took over, or
nothing did. Different tool, different API, different config format = deprecation. Same thing
under a new label = [rename](add-a-rename.md).

The distinction is a human judgement, which is exactly why it is *stored* in `status` rather
than derived.

## 1. Pick the right status value

Three values, and choosing wrong is the most common error in this repo:

| `status.value` | Use when | The tell |
|---|---|---|
| `deprecated` | Databricks announced an actual deprecation, with a date or timeline | A release note or doc saying "deprecated on <date>" / "will be removed" |
| `retired` | It is already gone; access has ended | The feature no longer exists, docs are archival |
| `legacy` | The docs merely call it legacy or unsupported, and there is **no** formal deprecation date or timeline | A doc title ending in "(legacy)" |

`legacy` is not a softer `deprecated`. It means Databricks has not committed to a date, and
claiming they have would be being confidently wrong.

## 2. Research and source it

An archived "legacy" or "migrate from X to Y" doc is the ideal source for a deprecation - better
than a release note, because it states both the status and the replacement. Capture:

- when it was deprecated (`deprecatedAt`), and when it was removed if it has been (`removedAt`)
- what replaced it, if anything, and whether that replacement has its own card

## 3. Write the card

`kb/databricks/<slug>.yaml`:

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
  - note: Real-but-fun one-liner about the thing itself - why it was replaced, what changed underneath.
    link: https://docs.databricks.com/...
status:
  value: legacy
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
deprecatedAt:
  date: '2024'
  link: https://docs.databricks.com/...
removedAt:
  date: 2026-01
  link: https://docs.databricks.com/...
successorId: id-of-the-successor-card
replacement: What To Use Instead
source: https://docs.databricks.com/...
verified: 'YYYY-MM-DD'
```

- `deprecatedAt` is **required** for all three deprecation statuses.
- `removedAt` is optional and must not precede `deprecatedAt`.
- **Omit both `successorId` and `replacement` when nothing directly replaced it.** The card then
  renders as "retired", which is honest. Do not invent a successor.
- Set `successorId` when the successor has its own card in the dataset; use `replacement` for a
  free-text name when it does not.
- `prediction` does not belong here. Retired things do not get renamed, and the validator warns
  if you add one.

## 4. Check for a hidden rename underneath

Before you finish: is the deprecated name actually a *retronym*? "Legacy dashboards" was not
born legacy - it was the new name for Databricks SQL dashboards, and only later deprecated. In
that case the original name deserves its own `renamed` card feeding this deprecation card:

```
databricks-sql-dashboards (renamed) -> legacy-dashboards (deprecated) -> ...
```

See [insert-a-name-in-a-rename-chain.md](insert-a-name-in-a-rename-chain.md).

## 5. Wire, validate, log

```bash
# add the id to a NAV section in www/app.js first
python scripts/build_features.py && python scripts/validate.py
python scripts/check_anchors.py <id>
```

Then add a **why then what** entry to [`CHANGELOG.md`](../../CHANGELOG.md) and commit the YAML
plus the `app.js` edit, never the built JSON.
