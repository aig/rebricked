# Contributing to rebricked

One rule: **real, sourced changes only.** Two kinds fit: **renames** and **deprecations**.
If it wouldn't make a data engineer nod and say "oh, *that's* what happened to it" — it
doesn't belong here.

- A **rename** is a product/feature Databricks gave a new name for *the same thing*. Not a
  new product, not a casual nickname.
- A **deprecation** is a feature Databricks retired or replaced. A *different* thing takes
  over (or nothing does) — the opposite of a rename. `dbx` → Asset Bundles is a deprecation,
  not a rename: different tool, different config format.

Add one object to [`databricks.json`](databricks.json). That's the whole PR.

## Add a rename

```json
{
  "id": "kebab-case-unique-id",
  "current": "The Newest Name",
  "aliases": ["What people actually type", "ABBR"],
  "category": "Data engineering",
  "what": "One line: what the thing is.",
  "lineage": [
    { "name": "Old Name", "abbr": "ON", "from": "2021", "to": "2023" },
    { "name": "The Newest Name", "from": "2023", "to": null }
  ],
  "renamedAt": "2023",
  "occasion": "Where it was announced (optional).",
  "note": "Anything an engineer needs to know — does old code still run? (optional)",
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
  "replacementId": "id-of-the-successor-entry (optional)",
  "category": "Developer experience",
  "what": "One line: what the thing was.",
  "deprecatedAt": "2024",
  "removedAt": "2026-01",
  "status": "deprecated",
  "occasion": "End of life date, if any (optional).",
  "note": "Why it's a replacement, not a rename; migration path (optional).",
  "source": "https://docs.databricks.com/...",
  "verified": "YYYY-MM-DD"
}
```

### Field rules
- **Renames:** `current` must equal the last `lineage` entry (the one with `"to": null`).
- **Deprecations:** `status` is `"deprecated"` or `"retired"`; `removedAt` is optional;
  omit `replacement` if nothing directly replaces it (renders as "retired").
- `source` is **required** on every entry. No source, no entry. Prefer official Databricks /
  Microsoft Learn docs — an archived "legacy"/"migrate from X" doc is ideal for deprecations.
- `verified` is the date a human last confirmed it. Put the day you checked.
- `id` is kebab-case and unique across the whole file (renames and deprecations share it).
- Dates use `YYYY` or `YYYY-MM`. Precision is optional; honesty about precision is not.
- If sources disagree on a date, use the official doc's date and say so in `note`.

### Review bar
A maintainer checks the source resolves and the date is defensible. Merge = publish.

The joke tolerates being late. It does not tolerate being wrong.
