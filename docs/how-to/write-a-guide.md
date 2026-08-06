# How to write a guide

**Use this when** you want to say something the entry format cannot hold: a cost argument, a
how-to, an opinion about the platform. Guides are the one place judgement is allowed - provided
the reader can always see where sourcing stops and opinion starts.

> Agents: follow [`agents/write-guide.md`](../../agents/write-guide.md), the authoritative version
> of this workflow.

## 1. Verify before you write, and capture the sentence

For every load-bearing claim, capture two things:

1. the exact URL, and
2. the **exact sentence** on that page that states the claim, character for character.

You need the sentence for the citation's text fragment in step 3, and a paraphrase there becomes
a future `DEAD` link. If a claim spans released and unreleased software, say which: check the
*latest released* docs, and label anything only on a master branch as upcoming, with a date.

An uncited number does not ship. Cut it or flag it.

## 2. Create the folder and front matter

```bash
mkdir -p kb/posts/<slug>/images
```

`slug` is the folder name **and** the permanent published URL, so choose it once.

```yaml
---
slug: my-guide
title: 'Undocumented Databricks: the thing nobody tells you'
description: One or two sentences that would make a tired engineer click.
kind: guide           # guide | explainer | opinion
category: Compute
author: Your Name
authorLink: https://www.linkedin.com/in/...
published: '2026-08-06'
updated: '2026-08-06'
verified: '2026-08-06'
staleAfter: '2027-02-06'
tags: [cost, compute]
entries:
  - lakeflow-jobs
sources:
  - url: https://docs.databricks.com/aws/en/compute/configure
    kind: official
    label: 'Databricks: compute configuration reference'
---
```

- `sources` is **required and non-empty**, each entry `{ url, kind, label }` with
  `kind` one of `official` / `community` / `internet`.
- `staleAfter` is a promise to re-verify, about six months out. Pricing, defaults, and cost
  advice rot in a way entry facts do not.
- `readingMinutes` is computed by the builder. Never author it.
- Full field list: [reference/guide-schema.md](../reference/guide-schema.md).

## 3. Cite on the claim, not at the bottom

The citation goes **inline, where the claim is made**, with the claim's own phrase as the anchor
text and a text fragment selecting the backing sentence:

```markdown
By default,
[one running task takes one core](https://spark.apache.org/docs/latest/configuration.html#:~:text=Number%20of%20cores%20to%20allocate%20for%20each%20task).
```

Rules that keep these links working:

- The `#:~:text=` quote must be the **exact wording**, URL-encoded (`%20` for spaces, `%2C` for
  commas). `check_anchors.py` verifies it is still on the page.
- Keep the fragment short but distinctive - a clause, not a paragraph.
- **No literal spaces or parentheses inside the URL.** The renderer's link regex stops at the
  first `)` and the first whitespace. Shorten the fragment rather than encoding parens.
- Keep code chips and parenthetical numbers *outside* the anchor. Link the claim, then state the
  value after it.
- The anchor text is never a bare glyph or a footnote marker. It is the claim's own words, so the
  reader sees which words the source backs.
- GitHub, JIRA, and other script-hostile hosts get plain links with no fragment, pinned to a
  commit hash so the cited line cannot drift.
- The builder appends any prose-linked URL missing from `sources` to the rendered Sources block,
  but declare the load-bearing ones in front matter anyway - that is the reviewable list.

## 4. Label the judgement

```markdown
:::judgement
Use task slots before nodes. This is a recommendation, not a documented Databricks position.
:::

:::warning
`SPARK_WORKER_CORES` is not documented for Databricks compute. Treat it as unsupported.
:::

:::note
Background a reader may already know.
:::
```

Every recommendation, ranking, or ordering claim goes in a `:::judgement` callout. `:::warning`
marks undocumented or unsupported territory. This is the whole reason guides do not erode the
data's credibility: the reader can see the seam.

## 5. Name products with the shortcode, not by typing them

```markdown
Pipelines built as {{entry:delta-live-tables}} run as {{entry:lakeflow-declarative-pipelines}}.
```

It resolves at build time to the entry's **current** name plus a link to its page, so the next
rename cannot strand your prose. An unknown id **fails the build**. The reverse of that link
renders automatically as "Guides that mention this" on the entry page, which is the main reason
guides live in this repo at all.

## 6. Body syntax is a deliberate subset

`##` / `###` headings, paragraphs, lists, pipe tables, fenced code,
`![alt](images/x.jpg "caption")` figures, the three callouts, inline `**bold**` / `*italic*` /
`` `code` `` / links, and `{{entry:id}}`. Alt text on every image is enforced. Anything else is
not supported - see [reference/guide-schema.md](../reference/guide-schema.md).

House style: short sentences and common words (many readers are not native English speakers),
jargon defined at first use, no idioms, no em dashes anywhere, and prose dates written "August
2026" rather than "2026-08".

## 7. Build, validate, check, log

```bash
python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate.py && python scripts/validate_posts.py
python scripts/check_anchors.py post:<slug>
python -m http.server 8777 -d www      # then open /learn/<slug>/
```

All four gates print `OK`. The anchor check sweeps the front-matter sources *and* every http(s)
link in the body. Fix `DEAD` quotes; finish `BLOCKED` hosts with a web-fetch tool.

Then a **why then what** [`CHANGELOG.md`](../../CHANGELOG.md) entry, and commit
`kb/posts/<slug>/` including `images/`. Never commit `www/learn/` or `www/posts.json`.
