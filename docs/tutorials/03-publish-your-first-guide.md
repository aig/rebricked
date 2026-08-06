# Publish your first guide

Entries record what a name did. **Guides argue about what to do** - and they are the one place
in this repo where judgement is allowed, provided it is labelled as judgement. In this tutorial
you will write a short guide with one cited fact, one labelled opinion, and one link to an
entry that survives the next rename, then delete it.

**Before you start:** finish [Get the site running](01-get-the-site-running.md).

> Like the entry tutorial, this creates a throwaway. Step 7 deletes it. Do not commit it.

## 1. Read the real one first

```bash
head -60 kb/posts/databricks-task-slots-not-more-nodes/index.md
ls kb/posts/databricks-task-slots-not-more-nodes/
```

A guide is a **folder**, not a file, because a guide has assets:

```
kb/posts/<slug>/
  index.md      YAML front matter + Markdown body - the source of truth
  images/       figures, tracked in git, copied into the built page
  materials/    working source such as PDFs, never deployed
```

Look at how the body cites. Every factual sentence carries its link *inline*, the anchor text
is the claim's own words, and the URL ends in `#:~:text=` selecting the exact backing sentence.
A Sources block at the bottom alone would not tell a reader *which* words a source backs.

## 2. Create the folder and front matter

```bash
mkdir -p kb/posts/tutorial-guide
```

Write `kb/posts/tutorial-guide/index.md`:

```markdown
---
slug: tutorial-guide
title: A throwaway guide, written to learn the pipeline
description: A two-paragraph practice guide with one cited fact and one labelled judgement,
  used only to see the guide build and its gates run.
kind: guide
category: Data engineering
author: Your Name
published: '2026-08-06'
verified: '2026-08-06'
staleAfter: '2027-02-06'
tags: [tutorial]
entries:
  - lakeflow-declarative-pipelines
sources:
  - url: https://docs.databricks.com/aws/en/ldp/where-is-dlt
    kind: official
    label: 'Databricks: where DLT went'
---

## What changed

The declarative pipelines framework was renamed, and
[no migration is required to use the new name](https://docs.databricks.com/aws/en/ldp/where-is-dlt#:~:text=there%20is%20no%20migration%20required%20to%20use%20Lakeflow%20pipelines).
Pipelines built as {{entry:delta-live-tables}} keep running as
{{entry:lakeflow-declarative-pipelines}}.

:::judgement
Rename the folder in your repo anyway. Nothing forces you to, but a codebase whose directory
names lag two product names behind costs every new joiner an afternoon.
:::
```

`slug` must equal the folder name, and it is permanent - it is the published URL.
`readingMinutes` is computed by the builder; never write it yourself.

## 3. Build and see the shortcode resolve

```bash
python scripts/build_features.py && python scripts/build_posts.py
```

Open `www/learn/tutorial-guide/index.html` and search it for "Lakeflow". The
`{{entry:lakeflow-declarative-pipelines}}` shortcode resolved at build time to the entry's
**current name** plus a link to its page. That is the point: when Databricks renames the thing
again, this prose re-resolves on the next build instead of going stale.

## 4. Break the shortcode deliberately

Change `{{entry:delta-live-tables}}` to `{{entry:delta-live-table}}` and rebuild:

```bash
python scripts/build_posts.py
```

The build **fails**. An unknown entry id is a hard error, never a silently broken link, so
prose can never reference a name the dataset does not have. Change it back.

## 5. Run the guide gate

```bash
python scripts/validate_posts.py
```

It should print `OK`. Now try each of these one at a time and re-run it:

- delete the `sources:` block -> a guide with no sources is rejected outright
- set `kind: essay` -> rejected; the set is `guide` / `explainer` / `opinion`
- set `published: '2027-01-01'` -> rejected as a future date
- put an em dash in the description -> rejected; this repo uses hyphens only
- set `staleAfter: '2026-01-01'` -> **warns**, does not fail. A guide past its review date is a
  review signal, and the rendered page already tells the reader so in amber

Put everything back so it prints `OK`.

## 6. Read it in the browser

```bash
python scripts/build_entries.py
python -m http.server 8777 -d www
```

- <http://localhost:8777/learn/> - your guide is in the index.
- <http://localhost:8777/learn/tutorial-guide/> - the page, with the judgement callout styled
  distinctly from body prose, and a Sources block that includes the URL you linked inline even
  though you only declared one source in front matter.
- <http://localhost:8777/databricks/lakeflow-declarative-pipelines/> - scroll to **Guides that
  mention this**. Your guide is listed there. You never wrote that link; `build_entries.py`
  derived it by reading `posts.json`, which is why `build_posts.py` has to run first.

## 7. Clean up

```bash
rm -rf kb/posts/tutorial-guide
python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate_posts.py
git status --short
```

Clean. The built `www/learn/tutorial-guide/` folder is gitignored output; if it lingers,
delete it or let the next full build sort it out.

## What you learned

- A guide is a folder; `slug` = folder name = permanent URL.
- Facts get inline citations with exact-sentence text fragments; judgement goes in a
  `:::judgement` callout. Uncited numbers do not ship.
- `{{entry:<id>}}` beats typing a product name, and an unknown id fails the build.
- `staleAfter` is a promise to re-verify, and the only thing in the repo that warns instead of
  failing.
- Build order is load-bearing: features -> posts -> entries.

## Next

Write a real one with [how-to/write-a-guide.md](../how-to/write-a-guide.md), and read
[explanation/sourcing-discipline.md](../explanation/sourcing-discipline.md) for where the line
between fact and judgement actually sits.
