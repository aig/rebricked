# Analytics events

Umami, cookieless, no personal data, so no consent banner. Everything is guarded: if the script is
blocked or absent the app behaves identically.

## The rules

1. **All tracking goes through the guarded `track(name, data)` helper.** It wraps every call so a
   blocked or missing script cannot throw into a user path.
2. **Reuse an existing event name across surfaces** rather than minting a per-page variant. The
   generated pages derive a `surface` property instead, so one name slices by page type.
3. **A new generated page must carry the `ANALYTICS` snippet in its head**, or a whole class of page
   goes uncounted.

## Where the snippet lives

The script tag exists in **two** places and must stay in both:

| Location | Covers |
|---|---|
| hand-written in [`www/index.html`](../../www/index.html) | the app |
| the `ANALYTICS` constant in [`scripts/build_badges.py`](../../scripts/build_badges.py) | injected into the shared `HEAD` by `build_entries.py`, which covers entry pages, the vendor hub, and (since `build_posts.py` imports the same `HEAD`) the guides and the Learn index. The badge template injects it too |

The static [`disclaimer`](../../www/disclaimer/index.html) and
[`subscribe`](../../www/subscribe/index.html) pages carry their own copy, because no generator owns
them.

Same website id everywhere, so it is one dataset.

**Two deliberate exclusions:**

- `OG_PAGE` in `build_badges.py` - the template a headless browser loads to render `og.png`. Counting
  the build as traffic would pollute the stats.
- any hostname other than `rebricked.org`, via `data-domains`. This keeps
  `python -m http.server` previews out of production numbers.

## Events from the app (`app.js`)

| Event | Fires on |
|---|---|
| `search` | a search |
| `nav` | a rail section click |
| `filter-toggle` | a status filter button |
| `timeline-view` | switching the Home chart lens (year vs stage) |
| `timeline-year` | clicking a timeline bar |
| `roulette` | the random-entry button |
| `new-modal-open` | the "New" gag modal |
| `theme-toggle` | light/dark switch |
| `lineage-open` | expanding a lineage chain |
| `guess-name` | revealing a card's invented prediction |
| `copy-link` | a card's copy-link action |
| `share` | a card's LinkedIn share |
| `quiz-open` | opening the quiz |
| `quiz-start` | starting a run |
| `quiz-badge-created` | reaching the result screen |

## Events from the generated pages (`INLINE_JS`)

`INLINE_JS` derives a `surface` property - `guide`, `entry`, `hub`, `learn-index`, or `badge` - so one
event name slices by page type. It uses a **single delegated click listener keyed on the CSS classes
the generators already emit**, which means new links are tracked without touching the templates, and
**renaming a class is what breaks tracking**.

| Event | Fires on |
|---|---|
| `theme-toggle` | light/dark switch (shared name with the app) |
| `search` | the search box on a generated page |
| `guide-toc` | a table-of-contents link in a guide |
| `guide-prevnext` | previous/next guide navigation |
| `guide-open` | opening a guide from an index or reverse link |
| `source-click` | a citation or Sources link |
| `related-click` | a related-entry link |
| `hub-entry-open` | an entry link on the vendor hub |
| `cta-click` | a call to action |
| `quiz-open` | the quiz entry point (shared name with the app) |
| `github-click` | the repo link |
| `rss-click` | the feed link |

## UTM tagging

LinkedIn share links get UTM parameters via `withUTM(url, params)` so shared traffic is attributed.
Keep new share links going through it rather than hand-building query strings.

## Adding an event

1. Call `track("<name>", {...})` - never the analytics global directly.
2. Prefer an existing name plus a distinguishing property over a new name.
3. On a generated page, hook it on a class the generator already emits, in `INLINE_JS`.
4. Add it to the table above in the same commit.
