---
name: add-snowflake-entry
description: >-
  Track a Snowflake thing in the rebricked repo. Given a name - new or old, current or
  ancient - investigate its full history: what it was, every rename, whether it was
  deprecated or retired, and what it's called today. Then classify it and add the
  correctly-shaped, sourced entry as its own YAML file under kb/snowflake/ - including one to
  three funny-but-accurate, individually-sourced `fact` entries grounded in real Snowflake
  history.
  Use whenever asked to "add a Snowflake feature", "add X to Snowflake", or "track X" for
  Snowflake - even if X is old or you don't yet know what happened to it - and equally when
  correcting, re-verifying, or re-chaining an entry that already exists. Enforces the one rule:
  real, sourced changes only.
tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, WebSearch
---

# Track a Snowflake thing in rebricked

**The workflow is [`add-databricks-entry`](add-databricks-entry.md).** Read it and follow it -
investigate first, classify by `status`, check for collisions, write the correctly-shaped entry,
build, validate, changelog. Every field rule, every shape, and the one rule are identical across
vendors; this file only records where Snowflake differs.

## What changes

**Where the file goes.** `kb/snowflake/<id>.yaml`, not `kb/databricks/`. The filename is still
the `id`, the `id` is still the kebab-case slug of this card's own `name`, and ids are still
permanent.

**`vendor: snowflake` on every entry.** The builder would infer it from the folder, but writing it
makes the file self-describing and is what the existing entries do.

**Sources are Snowflake's.** Every claim traces to a live official Snowflake doc:

- `https://docs.snowflake.com/...` - the product documentation. Preferred for `what` and `status`.
- `https://docs.snowflake.com/en/release-notes/...` - dated release notes. **This is where dates
  come from.** The per-year indexes (`new-features-2024`, `new-features-2025`, `new-features`)
  list every feature announcement with its date and Preview/GA status, and the dedicated notes
  (`/release-notes/<year>/other/<date>-<slug>`) are the best `releases` links.
- `https://docs.snowflake.com/en/release-notes/bcr-bundles/...` - behavior change bundles. These
  are where retirements live; the bundle folder name (`2025_06`) is the month the change was
  announced, and is the honest `YYYY-MM` token for it.
- `https://www.snowflake.com/en/blog/...` - Snowflake's own blog. Official, and often the only
  surviving source for anything before 2023.

Never cite a Databricks or Microsoft Learn doc on a Snowflake entry.

**Snowflake docs only keep three years of release notes.** Anything before that is gone from
`docs.snowflake.com`, so older dates usually have to come from the Snowflake blog, or be left out.
`YYYY` precision you can source beats `YYYY-MM` you cannot. If you can source neither, the entry
does not go in - say what you could not confirm.

**Categories are the Snowflake list**, not the Databricks one - `VALID_CATEGORIES["snowflake"]` in
[`validate.py`](../scripts/validate.py):
`Data engineering`, `Compute / BI`, `Developer experience`, `Data governance`, `AI / ML`.

**Ids are globally unique across vendors.** `kb/databricks/` already owns names like
`legacy-dashboards`, so grep both folders before settling on an id, not just `kb/snowflake/`.
A rename chain may not cross vendors either: `successorId` must name a Snowflake entry.

**The rail step applies, but not to `app.js`.** Step 5 of the Databricks skill says to wire the id
into `app.js`'s `NAV`; the app renders the Databricks rail only, so a Snowflake id goes into
**`SNOWFLAKE_NAV` in [`scripts/chrome.py`](../scripts/chrome.py)** instead - the Snowsight rail the
generated pages wear. Append the id to the tuple of the section it belongs under (Projects,
Ingestion, Transformation, AI & ML, Catalog, Data sharing, Governance & security, Compute, Admin).
`validate.py` fails if an entry is in no section, exactly as it does for Databricks, so this is not
optional. The section also drives the hub's own filter at `/snowflake/#s=<label>`.

## Build, validate, check

Same chain, same order:

```
python scripts/build_features.py && python scripts/validate.py
python scripts/check_anchors.py <the-ids-you-touched>
```

`check_anchors.py` matters more here than usual: Snowflake rewords release notes and moves doc
pages between `docs.snowflake.com` and `other-docs.snowflake.com`, and a text fragment fails
silently in a browser. A `DEAD` quote on a live Snowflake doc is frequently the first sign of a
rename you have not recorded yet.

Then the [`CHANGELOG.md`](../CHANGELOG.md) entry, written as **why then what**.
