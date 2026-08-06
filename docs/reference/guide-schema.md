# Guide schema

One guide = one folder = `kb/posts/<slug>/`. Guides are the repo's second content type and the one
place judgement is allowed, provided it is labelled.

Enforced by [`scripts/validate_posts.py`](../../scripts/validate_posts.py) (front matter) and
[`scripts/build_posts.py`](../../scripts/build_posts.py) (body rendering, shortcode resolution).

## Folder layout

```
kb/posts/<slug>/
  index.md      YAML front matter + Markdown body. The source of truth
  images/       figures. TRACKED in git, copied to www/learn/<slug>/images/
  materials/    working source (PDFs, transcripts). Never deployed
```

The folder name **is** the `slug` **is** the published URL `/learn/<slug>/`, and it is permanent.
`kb/posts/` is not a vendor directory: `build_features.py` skips it explicitly.

## Front matter

Front matter is a **closed set** - an unknown field is an error.

### Required

| Field | Type | Rules |
|---|---|---|
| `slug` | string | Must equal the folder name. Permanent |
| `title` | string | |
| `description` | string | One or two sentences; used as the meta description |
| `kind` | enum | `guide` / `explainer` / `opinion`. Closed set |
| `category` | string | Convention is to reuse an entry category, but **not** enforced as a closed list |
| `author` | string | |
| `published` | `'YYYY-MM-DD'` | Quoted. Never future |
| `verified` | `'YYYY-MM-DD'` | The day the claims were last confirmed. Never future |
| `sources` | array of `{ url, kind, label }` | **Non-empty.** `kind` is `official` / `community` / `internet`; `url` must be a real http(s) URL |

### Optional

| Field | Type | Rules |
|---|---|---|
| `updated` | `'YYYY-MM-DD'` | Must not precede `published`. Never future |
| `staleAfter` | `'YYYY-MM-DD'` | **May be in the past** - that is the point. Once passed, the page renders an amber "past its review date" strip and the validator **warns**. Guide-only: entry facts are historical and do not rot, but pricing, defaults, and cost advice do. Set it about six months out |
| `tags` | array of strings | |
| `entries` | array of entry ids | Every id must resolve against the built data |
| `authorLink` | URL | The byline becomes a link to it, and it becomes the JSON-LD Person's `url` |
| `readingMinutes` | number | **Computed by the builder. Never author it** |

## Body syntax

A deliberate Markdown **subset**. `build_posts.py` carries its own small renderer rather than adding
a dependency, so anything not listed here is unsupported.

| Construct | Syntax |
|---|---|
| Headings | `##`, `###` only |
| Paragraphs | blank-line separated |
| Lists | `-` bullets, `1.` ordered |
| Tables | pipe tables |
| Code | fenced blocks |
| Figures | `![alt](images/x.jpg "caption")` - **alt text is enforced**, and the file must exist |
| Callouts | `:::note`, `:::warning`, `:::judgement`, closed with `:::`. Fences must balance |
| Inline | `**bold**`, `*italic*`, `` `code` ``, `[text](url)` |
| Entry links | `{{entry:<id>}}` |

### `{{entry:<id>}}`

Resolves at build time to the entry's **current name** plus a link to its page, so a rename cannot
strand the prose. **An unknown id fails the build** - prose can never link to a name the dataset
does not have. The reverse renders automatically as "Guides that mention this" on the entry page,
which is why `build_posts.py` must run before `build_entries.py`.

### Link constraints

The renderer's link regex stops at the first `)` and the first whitespace, so a URL must contain
**no literal spaces and no parentheses**. Shorten a text fragment rather than encoding parens.

## Citation rules

Facts are cited **inline, on the claim** - not only in the Sources block:

```markdown
[one running task takes one core](https://spark.apache.org/docs/latest/configuration.html#:~:text=Number%20of%20cores%20to%20allocate%20for%20each%20task)
```

- The anchor text is the claim's own words, never a bare glyph or footnote marker.
- The `#:~:text=` fragment selects the **exact sentence**, URL-encoded. `check_anchors.py` verifies
  the quote is still on the page, so a paraphrase is a future `DEAD` link.
- Keep fragments short but distinctive - a clause, not a paragraph.
- Keep code chips and parenthetical numbers outside the anchor.
- GitHub / JIRA and other script-hostile hosts get plain links, pinned to a commit hash.
- The builder appends any prose-linked URL missing from `sources` to the rendered Sources block, but
  declare the load-bearing ones in front matter anyway - that is the reviewable list.

## Facts versus judgement

| | Rule |
|---|---|
| A **fact** | Carries an inline citation with a text fragment. An uncited number does not ship |
| A **judgement** - any recommendation, ranking, or ordering claim | Goes in a `:::judgement` callout |
| **Undocumented or unsupported** territory | Goes in a `:::warning` callout |

## House style

Short sentences, common words, no idioms (many readers are not native English speakers). Define
jargon at first use. Functional headings in plain words. No em dashes anywhere - hyphens only. Prose
dates read "August 2026", not "2026-08".

## Outputs

| Path | Contents |
|---|---|
| `www/learn/index.html` | the guides index |
| `www/learn/<slug>/index.html` | the guide page |
| `www/learn/<slug>/images/` | copied figures |
| `www/posts.json` | the index `build_entries.py` reads for reverse links, sitemap, and feed |

All gitignored. Commit `kb/posts/<slug>/` including `images/`; never the built output.
