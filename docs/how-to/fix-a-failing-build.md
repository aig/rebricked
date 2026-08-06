# How to fix a failing build or gate

The error messages are written to be self-explanatory, so this page is a lookup table for the ones
whose *cause* is not obvious from their text.

## First: are you validating a stale file?

The single most common confusion. Both validators read **built output**, not `kb/`:

```bash
python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate.py && python scripts/validate_posts.py
```

If you edited YAML and the validator's complaint does not match what you see on disk, you skipped
a build.

```
FATAL: www/databricks.features.json not found - it is build output.
```

That is the same problem, stated plainly. Run `build_features.py`.

## `build_features.py` errors

| Message | Cause |
|---|---|
| `FATAL: PyYAML is required` | `pip install pyyaml` |
| id does not match filename | The `id` field and `<id>.yaml` must agree. **Fix the field, not the filename** - unless the file is genuinely new. Ids are permanent |
| a YAML parse error | Usually an unquoted value YAML read as a number or date. Quote `'2021'` and `'2026-08-06'`; a bare `2021-05` is already a string |

## `validate.py` errors

| Message | What it really means |
|---|---|
| `an 'active' card needs exactly one of introducedAt or from` | You have both or neither. A standalone feature gets `introducedAt`; the current name of a rename chain gets `from`. That is how the two are told apart |
| `an 'active' card must not have a 'to' date` | A name in use now is open-ended. If it *does* have an end date, its status is `renamed`, not `active` |
| `a 'renamed' card needs a successorId` / `needs a 'to' date` | A superseded name that says nothing about what superseded it is useless |
| `id must be the name slug '<x>' (from name '<y>')` | The `id` is the kebab-case slug of the card's own `name`, parentheticals dropped. If the *name* changed, that is a [rename](add-a-rename.md) - a new card, not an edited id |
| `successorId '<x>' does not match any entry id` | Dangling chain. Either the successor card is missing, or the id is a typo |
| `successorId points at itself` | A loop. Usually a copy-paste of the wrong card |
| `entry appears in no NAV section in app.js` | Add the id to a section's `ids` array in [`www/app.js`](../../www/app.js). See [add-a-sidebar-section.md](add-a-sidebar-section.md) |
| `NAV in app.js references an id that is not in ...` | The reverse: `NAV` lists an id you deleted or misspelled |
| `category must be one of (...)` | Closed allow-list. See [add-a-category.md](add-a-category.md) |
| `status.date ... is in the future` / `verified date ... is in the future` | These are "when a human confirmed this", so a future date is meaningless |
| `only the last release stage may be is_announced` | An announced-but-unreached stage cannot precede a reached one |
| `releases must be in chronological order` | The array is a timeline; the last element is the current maturity |
| `note is removed - move its content into the fact array` | There is no top-level `note` field any more |
| `fact may have at most 3 entries` | One to three, each with its own required `link` |

**Warnings do not fail the build.** They flag leftover fields (`lineage`, `renamedAt`) and
nonsense combinations (a `prediction` on a deprecation - retired things do not get renamed). Treat
them as cleanup, not noise.

## `build_posts.py` errors

| Message | Cause |
|---|---|
| unknown entry id in `{{entry:...}}` | A hard error on purpose: prose must never link to a name the dataset lacks. Fix the id, or add the entry |
| a shortcode renders literally | Check the exact syntax `{{entry:the-id}}` - no spaces |
| a link renders as plain text | The renderer's link regex stops at the first `)` and the first whitespace. Remove literal parentheses and spaces from the URL, shortening the text fragment if needed |
| a body construct is ignored | The Markdown support is a deliberate subset. See [reference/guide-schema.md](../reference/guide-schema.md) |

## `validate_posts.py` errors

| Message | Cause |
|---|---|
| `unknown front-matter field(s)` | Front matter is a closed set. Check the spelling against [reference/guide-schema.md](../reference/guide-schema.md) |
| `kind must be one of ...` | `guide`, `explainer`, or `opinion` |
| slug does not match the folder | The folder name is the permanent URL; the `slug` field must equal it |
| `entries lists unknown entry id` | Same rule as the shortcode: it must resolve against the built data |
| a date is in the future, or `published` is after `updated` | Fix the dates |
| an em dash was found | Repo-wide convention: hyphens only |
| an image file is missing | Every `![alt](images/x.jpg)` must exist under `kb/posts/<slug>/images/` |
| `past its staleAfter date` | A **warning**, not an error. The page already tells the reader in amber. It is a promise to re-verify, so go re-verify |

## CI fails but local passes

The [workflow](../../.github/workflows/static.yml) runs the same four commands on a clean checkout,
so the difference is almost always something you did not commit:

- you edited `www/databricks.features.json` instead of the YAML (it is gitignored; your change does
  not exist for CI)
- you added an entry but not its `NAV` id, or vice versa, and only committed one of the two
- you added a guide image but did not `git add` it - `kb/posts/<slug>/images/` **is** tracked

Reproduce it by checking whether your working tree is actually clean:

```bash
git status --short
```

## Nothing is failing, but the page looks wrong

- **A blank list or a stale card** - you are serving a stale JSON. Rebuild, then hard-reload.
- **`file://` shows nothing** - the page fetches JSON, which browsers block over `file://`. Serve
  over http: `python -m http.server 8777 -d www`.
- **`/databricks/<id>/` 404s** - those pages are generated. Run `build_entries.py`.
- **The rail differs between `/` and a generated page** - `build_badges.py` carries its own static
  copy of `NAV`. See [add-a-sidebar-section.md](add-a-sidebar-section.md).
