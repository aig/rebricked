---
name: write-guide
description: >-
  Write or edit a guide in the rebricked repo (kb/posts/). Given a topic - a cost question, a
  how-to, an opinion about the platform - verify every fact against live official docs, then
  write the guide as kb/posts/<slug>/index.md with front matter, inline card-style citations
  that select the exact sentence in the source, labelled judgement, and a staleAfter date.
  Use whenever asked to "write a guide/post/article", or when challenging, simplifying,
  re-verifying, or extending a guide that already exists. Enforces the one rule: facts are
  cited, judgement is labelled, and the citation lands on the claim, not at the bottom.
tools: Read, Write, Edit, Grep, Glob, Bash, WebFetch, WebSearch
---

# Write a guide in rebricked

A guide is the repo's second content type and the one place **judgement** is allowed. An entry
records what a name did; a guide argues about what to do with it. The discipline carries over:
every fact still needs an official link, and the reader must always see where sourcing stops
and opinion starts.

**Where the prose lives.** One folder per guide: `kb/posts/<slug>/` with `index.md` (YAML front
matter + Markdown body), `images/` (figures, tracked and deployed), `materials/` (working
source, never deployed). `www/learn/` and `www/posts.json` are build output of
`scripts/build_posts.py` and gitignored - never edit them.

## Step 1 - Verify before you write

Research every load-bearing claim with `WebFetch` / `WebSearch` against live official docs
(Databricks, Microsoft Learn, Apache project docs and source). For each claim, capture:

- the exact URL, and
- the **exact sentence** on that page that states the claim, character for character - you
  will need it for the citation's text fragment (Step 3).

If a claim spans released and unreleased software, say which: check what the *latest released*
docs say, and treat anything only on a master branch as upcoming, dated and labelled as such.
If you cannot verify a claim, cut it or flag it - never ship an uncited number.

## Step 2 - Front matter

Required: `slug` (= folder name, permanent), `title`, `description`, `kind`
(`guide`/`explainer`/`opinion`), `category` (reuse the entry categories), `author`,
`published`, `verified`, `sources` (non-empty, each `{ url, kind, label }`). Optional:
`updated`, `staleAfter`, `tags`, `entries` (ids this guide references). `readingMinutes` is
computed by the builder, never authored.

`staleAfter` is a promise to re-verify: pricing, defaults, and cost advice rot; set it about
six months out. Dates are quoted `'YYYY-MM-DD'` strings.

## Step 3 - Write the body

The syntax is a deliberate Markdown subset: `##`/`###` headings, paragraphs, lists, pipe
tables, fenced code, `![alt](images/x.jpg "caption")` figures (alt text enforced),
`:::note` / `:::warning` / `:::judgement` callouts, inline bold/italic/code, links, and
`{{entry:id}}`.

**House style - the prose rules that matter here:**

- **Write for non-native English readers.** Short sentences, common words, no idioms. Define
  jargon at first use (task slot, garbage collection). Readable beats clever.
- **Tell a story.** Open with a concrete scene the reader recognizes, then mystery, cause,
  evidence, fix, cost. Functional headings in plain words.
- **No em dashes, anywhere.** Hyphens only. Prose dates read "August 2026", not "2026-08".
- **`{{entry:<id>}}` instead of typing a product name.** It resolves at build time to the
  entry's current name plus a link; an unknown id fails the build.
- **Judgement is labelled.** Every recommendation, ranking, or ordering claim goes in a
  `:::judgement` callout. `:::warning` marks undocumented or unsupported territory.

**Citations sit on the claim - not only at the bottom.** Every factual sentence carries its
link inline: the phrase that states the claim is the anchor text, and the URL's text fragment
selects the exact backing sentence in the source:

```
By default,
[one running task takes one core](https://spark.apache.org/docs/latest/configuration.html#:~:text=Number%20of%20cores%20to%20allocate%20for%20each%20task).
```

Rules for these links:

- The `#:~:text=` quote must be the **exact wording captured in Step 1**, URL-encoded
  (`%20` for spaces, `%2C` for commas). `scripts/check_anchors.py` verifies the quote is
  still on the page, so a paraphrase is a future DEAD link.
- Keep the fragment short but distinctive - a clause, not a paragraph.
- **No literal spaces or parentheses in the URL** - the renderer's link regex stops at the
  first `)` and the first whitespace. Shorten the fragment rather than encoding parens.
- Keep code chips and parenthetical numbers *outside* the anchor where you can - an
  underlined run wrapping around a bordered `code` box reads cluttered. Link the claim
  ("packs input files into partitions"), then state the value after it.
- Never a bare glyph or a footnote: the anchor text is the claim's own words
  (`[2018 proposal](url)`, `[only a predefined list of environment variables reaches the
  Spark engine](url)`), so the reader sees exactly which words the source backs.
- GitHub, JIRA, and other script-hostile hosts get plain links without a text fragment -
  `check_anchors.py` reports them BLOCKED anyway. Pin GitHub links to a commit hash so the
  cited line cannot drift.
- The builder appends any prose-linked URL missing from `sources` to the rendered Sources
  block, but declare the load-bearing ones in front matter anyway - that is the reviewable
  list.

## Step 4 - Build, validate, and log

1. Build and validate - all four must print `OK` (CI runs the same chain, in this order):
   ```
   python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate.py && python scripts/validate_posts.py
   ```
2. Check the citations actually resolve - the schema gate never fetches:
   ```
   python scripts/check_anchors.py post:<slug>
   ```
   It sweeps the guide's front-matter sources and every http(s) link in the body, and
   verifies each `#:~:text=` quote is on its page. Fix `DEAD` quotes (reworded page, or a
   wrong quote); finish `BLOCKED` hosts with your agent's web-fetch tool.
3. Preview: `python -m http.server 8777 -d www`, open `http://localhost:8777/learn/`.
4. Add a `CHANGELOG.md` entry under today's date, **why then what**.
5. Commit `kb/posts/<slug>/` (including `images/`), never `www/learn/` or `www/posts.json`.
6. Writing a guide needs **no** docs change. If you changed *how* guides work (a front-matter
   field, the Markdown subset, a `validate_posts.py` rule), update [`docs/`](../docs/) in the same
   commit - [`docs/reference/guide-schema.md`](../docs/reference/guide-schema.md) is the page.

## Report back

State: the guide's slug and what changed, every claim you verified and against which URL, any
claim you cut or flagged as unverifiable, and that all four gates plus (if run) the anchor
check passed.
