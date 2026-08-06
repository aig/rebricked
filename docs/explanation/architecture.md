# Architecture: no framework, one build step

The site is one HTML file, one CSS file, one JS file, and a JSON array. There is no framework, no
bundler, no backend, and no runtime dependency of any kind. There *is* a build step, and it only
assembles data. This page is about why that line sits exactly where it does.

## The shape

```
kb/databricks/*.yaml ──build_features.py──> www/databricks.features.json ──fetch()──> www/app.js
kb/posts/<slug>/     ──build_posts.py─────> www/learn/, www/posts.json
        (both)       ──build_entries.py───> www/databricks/, sitemap.xml, feed.xml
     (templates)     ──build_badges.py────> www/badges/          [committed, needs a browser]
```

Left of an arrow: source, tracked, the only thing you edit. Right of an arrow: output, gitignored (with
one exception), rebuilt by CI on every deploy.

## Why no framework

The site does one thing: render a filtered, searchable list of a few hundred small records. That is
comfortably inside what vanilla DOM code does well, and a framework would add a build toolchain, a
dependency tree, and a supply of upgrade work in exchange for nothing this project needs.

The concrete wins are worth naming, because "no dependencies" sounds like ideology until you notice what
it buys:

- **The site cannot rot from underneath.** No npm audit advisories, no transitive dependency abandoned
  by its maintainer, no build that stops working because a tool went to a new major version. A static
  file served in 2026 will serve identically in 2031.
- **Contributing needs no toolchain.** `pip install pyyaml` and a browser. That is the entire setup, and
  it means a data contributor never has to care about JS at all.
- **CI is trivial.** Four Python commands and an upload. No cache to warm, no lockfile to reconcile.
- **Deploys are atomic and cheap.** GitHub Pages serves files. There is nothing to restart and nothing
  to keep running.

So: **do not add a JS toolchain.** PyYAML is a dev dependency of `scripts/`, never of the page.

## Why there is a build step at all

Two things genuinely cannot be done in the browser at load time.

**1. The data lives in 105 files.** The page needs one array; fetching 105 files to render a list would
be absurd. So the build concatenates. See [one-file-per-entry.md](one-file-per-entry.md) for why the
source is split in the first place.

**2. Crawlers cannot see client-rendered content.** To a bot, `index.html` is an empty shell and `#id`
deep links are not distinct documents. The generated `/databricks/<id>/` pages exist so there is real
HTML to index. See [the-seo-layer.md](the-seo-layer.md).

Note what the build does *not* do. It does not transform the page, minify anything, transpile anything,
or generate CSS. `index.html`, `app.js`, and `styles.css` ship exactly as written, which is why you can
edit them and reload without running anything.

## Why the build order is load-bearing

```
build_features.py  ->  build_posts.py  ->  build_entries.py
```

Each arrow is a real data dependency, not a convention:

- `build_posts.py` resolves `{{entry:<id>}}` against the **built** feature JSON, so features must exist
  first. This is also what makes an unknown id a hard build error rather than a broken link.
- `build_entries.py` reads `posts.json` to render "Guides that mention this" on each entry page, and to
  list guides in the sitemap and feed. So posts must exist first.

And the consequence people trip over: **both validators read built output, not `kb/`.** Skipping a build
does not fail loudly; it silently validates a stale file, which is worse. That is why every documented
command chains the builds in front of the gates.

`validate.py` reading `www/app.js` is the odd one out - it greps the `NAV` config to check reachability.
It is the only place the data gate depends on the frontend, and it is there because an entry no rail
section reaches is an entry nobody finds.

## Why some things are not in CI

| Script | Why it is local or scheduled |
|---|---|
| `check_anchors.py` | Needs the network and fetches a few hundred third-party URLs. Rate limits and transient outages would make the deploy gate flaky, and a flaky gate gets ignored |
| `build_badges.py` | Needs a Chromium-based browser to render `og.png`. CI has none, which is precisely why `www/badges/` is committed rather than generated on deploy |
| `fetch_reference.py` | An authoring aid. Its output (`reference/`) is never deployed |

This is a deliberate split between the **deploy gate** - fast, hermetic, deterministic, blocks a bad
merge - and the **audit** - slow, networked, run by a human who can interpret the result. Conflating them
gets you a gate nobody trusts.

## Where PyYAML sits

The one dependency, and only for the scripts that read YAML: `build_features.py`, `build_posts.py`, and
`validate_posts.py`. `validate.py`, `build_entries.py`, `check_anchors.py`, and `fetch_reference.py` are
standard library only, because they read JSON or HTTP.

The site itself has zero. If you find yourself wanting a second dev dependency, check whether a small
purpose-built function does the job instead - that is why `build_posts.py` carries its own Markdown
subset renderer rather than importing `markdown`. It is intentionally not general-purpose; if a guide
ever needs real Markdown, swap `md_to_html` for the library rather than growing it.
