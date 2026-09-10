# How to refresh the reference mirror

[`scripts/fetch_reference.py`](../../scripts/fetch_reference.py) keeps a local copy of the external
docs this project sources from, under `reference/` (gitignored). Two reasons it exists:

1. **Fact-checking without re-fetching.** Cross-check a numeric limit or a release date against a
   local file instead of hunting the live site again.
2. **Spotting new renames as release notes ship.** A new month appearing in the release-notes
   sitemap is the earliest signal that something got renamed.

## Run it

```bash
python scripts/fetch_reference.py                            # all sources
python scripts/fetch_reference.py databricks-release-notes   # one source by id
python scripts/fetch_reference.py databricks-resource-limits # the numeric limits page
python scripts/fetch_reference.py --force                    # ignore 304, re-fetch everything
python scripts/fetch_reference.py --list                     # show sources, fetch nothing
```

Standard library only - no pip install needed.

## What lands where

Files mirror the URL path, so the local tree reads like the site:

```
reference/<host>/<path>.html    raw HTML, the source of truth
reference/<host>/<path>.md      the extracted <article> as readable Markdown
```

For example
`https://docs.databricks.com/aws/en/release-notes/product/2026/may` becomes
`reference/docs.databricks.com/aws/en/release-notes/product/2026/may.{html,md}`.

Read the `.md`. The `.html` is kept so an extraction bug is recoverable without a re-fetch.

## Fetching is incremental

Every page's ETag and Last-Modified go into `reference/manifest.json`. The next run sends them as
`If-None-Match` / `If-Modified-Since`, so unchanged pages return 304 and are skipped. Only two
things actually download: new pages (a fresh month in the sitemap) and changed pages (the current
month gaining entries). This is why the routine cost of running it is close to zero, and why
`--force` exists for when you suspect the manifest is lying.

## Track another site

Sources are declared in [`scripts/sources.json`](../../scripts/sources.json) - **adding one needs no
code change**. Each source discovers URLs either from a `sitemap` (filtered by `include` /
`exclude` regexes over the `<loc>` entries) or from an explicit `urls` list.

Current source ids:

| id | What it mirrors |
|---|---|
| `databricks-release-notes` | Databricks product release notes |
| `databricks-ai-bi-release-notes` | AI/BI and Genie One release notes, one page per year |
| `databricks-lakebase-release-notes` | The Lakebase release notes page (Lakebase entries no longer appear in the platform notes) |
| `databricks-unity-gateway-release-notes` | The Unity Gateway release notes page |
| `databricks-resource-limits` | The Databricks resource limits page |
| `azure-databricks-release-notes` | Azure Databricks release notes on Microsoft Learn |

**The AI/BI notes are separate for a reason.** The AI/BI and Genie One product lines publish their
own release notes, and Genie naming and preview-gate changes land there *first* - sometimes only
there. "Genie renamed to Genie One" and "Genie Spaces renamed to Genie Agents" were both announced
in that archive, not in the platform notes. A sweep of `databricks-release-notes` alone therefore
misses the Genie half of the dataset silently, which is exactly how a card ends up citing a preview
gate that was lifted a week earlier.

**The Lakebase notes are separate for a harsher reason.** In August 2026 Databricks moved every
Lakebase entry out of the platform notes onto Lakebase's own page and reworded them without the
"Autoscaling" name - so quotes that three cards cited in the October 2025, January 2026 and March
2026 platform notes vanished from those pages overnight. `check_anchors.py` caught it as a cluster
of `DEAD` citations on one product, which is the signature of a product-line page being split out.
Unity Gateway has its own page too; it is mirrored for the same reason, before the same thing
happens to it.

Add an entry to `sources.json`, run `--list` to confirm it is picked up, then fetch it by id.

## The one place the mirror is load-bearing

Any numeric quota in an entry's `limitations.note` must be cross-checked against
`reference/docs.databricks.com/aws/en/resources/limits.md`. Its **`Fixed`** column decides the
wording: `Yes` means a hard cap, `No` means a soft default that the account team can raise. Write
soft limits as raisable defaults, never as absolute caps. See
[add-a-feature.md](add-a-feature.md#4-fill-limitations-only-from-the-docs).
