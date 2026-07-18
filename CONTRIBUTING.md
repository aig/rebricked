# Contributing to rebricked

One rule: **real, sourced renames only.**

A rename is a product or feature that Databricks gave a new name for *the same thing*.
Not a new product. Not a casual nickname. Not a deprecation. If it wouldn't make a data
engineer nod and say "oh, *that's* what they call it now" — it doesn't belong here.

## Add a rename

Add one object to [`renames.json`](renames.json). That's the whole PR.

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

### Field rules
- `current` must equal the last `lineage` entry (the one with `"to": null`).
- `source` is **required**. No source, no entry. Prefer official Databricks / Microsoft Learn docs.
- `verified` is the date a human last confirmed it. Put the day you checked.
- Dates use `YYYY` or `YYYY-MM`. Precision is optional; honesty about precision is not.
- If sources disagree on a date, use the official doc's date and say so in `note`.

### Review bar
A maintainer checks the source resolves and the date is defensible. Merge = publish.

The joke tolerates being late. It does not tolerate being wrong.
