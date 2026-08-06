# How to regenerate the badge pages

`www/badges/<n>-of-5/` holds one shareable page per quiz result, 0 through 5. Each folder has an
Open-Graph-tagged `index.html` and a 1200x630 `og.png`. The quiz's LinkedIn share button links
here, so the OG tags are the whole point: they are what turns a shared score into a preview card
with a "beat this" challenge.

Unlike almost everything else generated in this repo, **`www/badges/` is tracked in git** - it is
not in `.gitignore`, because rendering the PNGs needs a browser and CI does not have one.

## Run it

```bash
python scripts/build_badges.py
```

It rewrites `www/badges/` from scratch. Rendering `og.png` needs a Chromium-based browser (Edge or
Chrome) installed; the HTML pages themselves are plain static files and need nothing.

## When to run it

- you edited the badge copy (the emoji, badge name, or deadpan blurb in the `BADGES` map)
- you changed the shared app chrome - `TOPBAR`, `render_rail`, `NAV`, or `ICONS` in
  [`scripts/build_badges.py`](../../scripts/build_badges.py)
- you changed the analytics snippet (`ANALYTICS`)
- you changed the quiz's question count, which changes how many pages there should be

## Why the quiz has one page per *score*

The quiz picks a random set of eligible entries, so the meaningful outcome is *how many* you got
right, not which ones. Six possible scores, six pages, all pre-rendered - no server, no query
string to spoof, and a URL that previews correctly wherever it is pasted.

## This file is also the chrome library

`build_badges.py` is imported by [`build_entries.py`](../../scripts/build_entries.py), which is
imported in turn by [`build_posts.py`](../../scripts/build_posts.py). They pull `ANALYTICS`,
`BASE_URL`, `FAVICON`, `INLINE_JS`, `TOPBAR`, and `render_rail` from it, so the generated entry
pages, the vendor hub, the guides, and the badges all render the same rail and carry the same
tracking snippet.

Two consequences worth knowing before you edit it:

1. **A change here changes four page types.** Regenerate all of them:

   ```bash
   python scripts/build_features.py && python scripts/build_posts.py && python scripts/build_entries.py && python scripts/build_badges.py
   ```

2. **`OG_PAGE` deliberately omits the analytics snippet.** It is the template a headless browser
   loads to render `og.png`, and counting the build as traffic would pollute the stats. If you add
   a new generated page, put `ANALYTICS` in its head - and if you add a new *build-time* template,
   leave it out. See [reference/analytics-events.md](../reference/analytics-events.md).
