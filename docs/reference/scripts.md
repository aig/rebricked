# Scripts

Eight scripts in [`scripts/`](../../scripts/). All are run as `python scripts/<name>.py` from the repo
root. PyYAML is the only dependency, and only for the ones marked below; the site itself ships with
none.

## The order that matters

```
build_features.py  ->  build_posts.py  ->  build_entries.py
                                       ->  validate.py / validate_posts.py
```

- `build_posts.py` resolves `{{entry:<id>}}` against the built JSON, so features first.
- `build_entries.py` reads `posts.json` to render "Guides that mention this", so posts first.
- Both validators read **built** output, so a skipped build validates a stale file.

The one command for a full local check:

```bash
python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate.py && python scripts/validate_posts.py
```

## build_features.py

**The data build.** Assembles `kb/<vendor>/*.yaml` into `www/<vendor>.features.json`.

| | |
|---|---|
| Reads | `kb/<vendor>/*.yaml` (every directory under `kb/` except `posts/`) |
| Writes | `www/<vendor>.features.json` - gitignored |
| Needs | PyYAML |
| Flags | `--check` - fail if the built JSON on disk is stale, instead of writing |

Canonical key order and entries sorted by `id`, so the output is deterministic and never reshuffles
because a contributor wrote the YAML keys in a different order. Keys not in the order list are
appended sorted rather than dropped; `validate.py` is what rejects unknown fields.

**Fails on** a YAML parse error, or an `id` that does not match its filename.

## build_posts.py

**The guides build.** Renders `kb/posts/<slug>/index.md` into the Learn pages.

| | |
|---|---|
| Reads | `kb/posts/<slug>/index.md` + `images/`, and `www/databricks.features.json` |
| Writes | `www/learn/index.html`, `www/learn/<slug>/index.html`, `www/learn/<slug>/images/`, `www/posts.json` - all gitignored |
| Needs | PyYAML; `build_features.py` must have run |
| Flags | none |

Carries its own small Markdown-subset renderer instead of adding a dependency. Resolves
`{{entry:<id>}}` against the built data and **fails the build on an unknown id**. `materials/` is
never copied.

## build_entries.py

**The SEO content layer.** Emits real HTML for crawlers, since the app renders client-side and
`index.html` looks empty to a bot.

| | |
|---|---|
| Reads | `www/databricks.features.json`, `www/posts.json` |
| Writes | `www/{vendor}/index.html` (hub), `www/{vendor}/{id}/index.html`, `www/sitemap.xml`, `www/feed.xml` - all gitignored |
| Needs | nothing beyond the standard library; imports `build_badges.py` for the shared chrome. No browser |
| Flags | none |

Each entry page gets a unique `<title>`, description, canonical URL, Open Graph and Twitter tags,
JSON-LD, the full content, and internal links to related entries. The hub groups every entry by
category and guarantees no entry page is orphaned. `feed.xml` is RSS 2.0, newest tracked change
first, with one `[Guide]` item per post. Vendor comes from the optional `vendor` field, default
`databricks`.

Runs automatically in CI before deploy.

## build_badges.py

**The quiz-result share pages,** and the shared chrome library the other builders import.

| | |
|---|---|
| Reads | nothing (templates are in the file) |
| Writes | `www/badges/<n>-of-5/index.html` + `og.png`, for n = 0..5. **Tracked in git** |
| Needs | a Chromium-based browser (Edge or Chrome) to render `og.png`. The HTML needs nothing |
| Flags | none |

Rewrites `www/badges/` from scratch. Exports `ANALYTICS`, `BASE_URL`, `FAVICON`, `INLINE_JS`,
`TOPBAR`, `render_rail`, `NAV`, and `ICONS`, which `build_entries.py` and (via it) `build_posts.py`
import - so one edit here changes four page types. Carries its **own static copy** of the rail
config, which must be kept roughly in sync with `app.js`.

`OG_PAGE`, the template the headless browser loads, deliberately omits `ANALYTICS` so the build is
not counted as traffic.

## validate.py

**The entry schema gate.** Branches on `status.value`.

| | |
|---|---|
| Reads | `www/databricks.features.json`, `www/app.js` |
| Writes | nothing. Prints `OK: <n> entries valid.` or a list of errors |
| Needs | nothing beyond the standard library |
| Flags | none |
| Exit | 0 on success, 1 if any error |

Also enforces the two cross-cutting invariants: every `successorId` resolves, and every entry is
reachable from a `NAV` section in `app.js` (both directions). Warnings do not fail the run. See
[how-to/fix-a-failing-build.md](../how-to/fix-a-failing-build.md) for the message-by-message table.

## validate_posts.py

**The guide schema gate.** Reads the *source* Markdown plus the built `posts.json`.

| | |
|---|---|
| Reads | `kb/posts/<slug>/index.md`, `www/databricks.features.json` |
| Writes | nothing. Prints `OK` or errors |
| Needs | PyYAML; both builds must have run |
| Flags | none |

Enforces front-matter completeness and the closed field set, slug/folder agreement, resolvable entry
ids, real source URLs, sane dates, alt text on every image, existing image files, no em dashes, and
balanced `:::` fences. **Warns** (never fails) when a guide is past its `staleAfter` date.

## check_anchors.py

**The citation rot check.** The only script that fetches the network.

| | |
|---|---|
| Reads | `www/databricks.features.json`, `kb/posts/` |
| Writes | nothing. Prints a verdict per URL |
| Needs | network access |
| Flags | `--list-blocked` (print only blocked URLs), `--fail-on-blocked` (treat BLOCKED as failure) |
| Args | zero or more entry ids, or `post:<slug>` for a guide. Default: everything |

Verdicts are `OK`, `DEAD` (page gone, or readable but the cited quote is absent), and `BLOCKED` (the
host refused a scripted request - says nothing about the link, and never fails the run).

**Not part of the deploy gate**, by design: it needs the network and third parties rate-limit it.
See [how-to/check-citations.md](../how-to/check-citations.md).

## fetch_reference.py

**The reference mirror.** Incrementally mirrors external docs into `reference/` (gitignored) so
entries can be fact-checked and new renames spotted as release notes ship.

| | |
|---|---|
| Reads | [`scripts/sources.json`](../../scripts/sources.json), `reference/manifest.json` |
| Writes | `reference/<host>/<path>.html` and `.md`, plus the manifest - all gitignored |
| Needs | network access. Standard library only |
| Flags | `--force` (ignore 304 and re-fetch), `--list` (show sources, fetch nothing) |
| Args | zero or more source ids. Default: all |

Incremental: ETag and Last-Modified per page go into the manifest and come back as
`If-None-Match` / `If-Modified-Since`, so unchanged pages 304 and are skipped. Source ids today are
`databricks-release-notes`, `databricks-resource-limits`, and `azure-databricks-release-notes`. Add a
source by editing `sources.json` - no code change.

## What CI runs

[`.github/workflows/static.yml`](../../.github/workflows/static.yml):

| Job | Steps | When |
|---|---|---|
| `validate` | `build_features` -> `build_posts` -> `validate` -> `validate_posts` | every push to `main`, every PR into `main`, manual dispatch |
| `deploy` | the same builds, plus `build_entries`, then upload **only `www/`** to Pages | after `validate` passes, and never on a pull request |

CI never runs `check_anchors.py` (network) or `build_badges.py` (browser). That is why `www/badges/`
is the one generated directory committed to git.
