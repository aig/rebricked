# Why a client-rendered app also ships hundreds of static pages

The app renders everything from JSON in the browser. That is the right design for the interactive
experience and completely wrong for discovery, so the repo generates a second, static face for the same
data.

## The problem

The site answers one question: *"what happened to the thing Databricks used to call X?"* Almost everyone
who has that question types it into a search engine. So being findable is not a nice-to-have; it is the
distribution channel.

But to a crawler:

- **`index.html` is an empty shell.** The content arrives after a `fetch()`, and the useful text - the
  card, the dates, the lineage - is never in the served HTML.
- **`#<id>` deep links are not documents.** Fragments are not separate URLs. A hundred entries collapse
  into one indexable page with no distinctive content.
- **There is nothing to preview.** A shared link has no per-entry title, description, or image.

## What `build_entries.py` emits

A real HTML document per entry, plus a hub:

| URL | Purpose |
|---|---|
| `/{vendor}/` | Hub listing every entry grouped by category. A strong landing page, and it guarantees no entry page is orphaned |
| `/{vendor}/{id}/` | One page per entry: unique `<title>`, description, canonical URL, Open Graph and Twitter tags, JSON-LD, the full content, and internal links to related entries |
| `/sitemap.xml` | Every entry page and guide |
| `/feed.xml` | RSS 2.0, newest tracked change first, with one `[Guide]` item per post |

The visible chrome is reused verbatim from `build_badges.py`, with its root-relative paths rewritten per
depth, so a generated page looks like a screen of the app rather than a stripped-down mirror.

## Why generate rather than server-render or prerender

- **There is no server.** GitHub Pages serves files. Static generation is the only option that keeps
  deployment to "upload a folder".
- **It cannot drift.** The pages are derived from `databricks.features.json` on every deploy, so a card
  and its static page can never disagree. Nobody maintains a second copy of anything.
- **No browser needed.** `build_entries.py` is pure string generation and runs in CI, unlike
  `build_badges.py` which needs Chromium for its PNGs.

## Why the `/{vendor}/` segment exists

Today every entry is `databricks`, so the segment looks redundant. It is future-proofing with a concrete
mechanism behind it: an entry may carry a `vendor` field, defaulting to `databricks`, and a second vendor
slots in as a new top-level namespace (`/snowflake/...`) with no change to the URL scheme, the generator,
or any existing link.

Getting this wrong later would be expensive in the one way this repo cannot afford: **published URLs are
permanent.** Adding a path segment after the fact breaks every inbound link. So it was paid for upfront,
before there was anything to break.

## Why `?id=` exists alongside `#id`

Both deep-link forms are supported, for different consumers:

- `#<id>` is the natural in-app form, and what the address bar shows as you navigate.
- `?id=<id>` is the **share- and crawler-safe** form, because LinkedIn and most link-preview services
  strip the fragment before fetching. A shared card link with only a fragment would preview as the
  generic home page.

Card share actions therefore emit the query-string form.

## How the guides tie in

`build_posts.py` runs before `build_entries.py` and writes `posts.json`. `build_entries.py` reads it to
render **"Guides that mention this"** on each entry page.

That reverse link is the main reason guides live in this repo rather than on a blog. A guide declares its
references once, as `{{entry:<id>}}` in prose, and gets two things it could not get elsewhere: the product
name re-resolves on every build so a rename cannot strand the prose, and the entry pages gain inbound
context nobody had to maintain by hand. The prose makes the data more findable, and the data keeps the
prose current.

## The trade-off

Hundreds of generated files per deploy, and two page families rendering the same content through different
code paths - `app.js` at runtime, `build_entries.py` at build time. That duplication is the real cost, and
it shows up as visual drift when the shared chrome changes on one side only (which is exactly why
`build_badges.py` keeps its own static copy of the rail, and why that copy has to be kept in sync).

The alternative was being invisible to search, which for this site means having no readers.
