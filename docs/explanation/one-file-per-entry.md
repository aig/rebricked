# Why one file per entry

The data is 105-odd YAML files in `kb/databricks/`, assembled into one JSON array at build time. It
used to be that single JSON array, hand-edited. This page is about why it moved, because the change
looks like bureaucracy until you have tried to review a diff against the old layout.

## What the single array cost

Every problem below was a real, recurring cost, not a hypothetical:

**A diff was unreadable.** Adding a rename was a hunk in the middle of a 2,500-line array. The
reviewer's job was to spot whether the surrounding lines had shifted, which is not a job a human is
good at. Now it is a new file plus a one-line `successorId` edit, and the reviewer reads exactly what
changed.

**`git blame` was useless.** One hundred and five entries shared one file's history. "When did we last
touch Delta Live Tables and why?" required reading every commit that touched the array. Now
`git log kb/databricks/delta-live-tables.yaml` is that entry's whole history, and nothing else's.

**Merge conflicts were structural.** Two people adding unrelated entries conflicted because they both
appended to the same array. Now they touch different files and merge cleanly.

**Ordering was a false decision.** Someone had to decide where in the array a new entry went, and any
answer was arbitrary because `app.js` sorts client-side anyway. The builder now emits entries sorted by
`id`, so order is deterministic and nobody thinks about it.

## Why the JSON still exists, and is gitignored

The page fetches one array, because 105 HTTP requests to render a list would be absurd. So the build
assembles it. But the built file is **not tracked**:

- It would churn on every regeneration, so every entry PR would carry a large unrelated diff and the
  per-file blame win would be lost immediately.
- Two copies of the data in git means someone eventually edits the wrong one. Making it untracked means
  the mistake is *impossible to commit*, not merely discouraged.

The failure mode this closes is specific and it used to happen: someone edits
`www/databricks.features.json` directly, sees their change locally, opens a PR, and CI regenerates the
file from `kb/` and silently discards it. It ships with the change missing and nobody notices. Now
there is nothing to edit.

The builder emits a canonical key order for the same reason: the output must not reshuffle just because
a contributor wrote the YAML keys in a different sequence.

## Why the filename is the id

`build_features.py` fails if `id` and filename disagree. That makes **uniqueness the filesystem's job**
as well as the validator's, and it makes the collision check trivial: `ls kb/databricks/<slug>.yaml`
answers "is this already tracked?" with no tooling at all.

It also makes the id predictable in both directions. Given a name you can construct the filename;
given a filename you know the id and roughly the name.

## Why ids are permanent

An id, once assigned, never changes. Not to fix a mismatch, not when the product is renamed, not to
tidy up. A rename adds a **new** file named for the new name's slug and repoints the old card's
`successorId`; the old card keeps its id, its name, and its filename forever.

Three reasons, in increasing order of how much they hurt when violated:

1. **The id is a URL.** `/databricks/<id>/` is a published, crawled, shared, and linked address.
   Re-slugging breaks every inbound link and every `#id` deep link anyone has pasted anywhere.
2. **The id is a cross-reference.** `successorId` values, `NAV` `ids` arrays, guide front-matter
   `entries` lists, and `{{entry:<id>}}` shortcodes in prose all point at it. The shortcode case is the
   sharpest: it resolves to the entry's *current name*, so prose survives a rename precisely because
   the id did not move.
3. **The id is history.** Re-slugging an entry means `git mv`, which means the file's blame restarts.
   The whole point of one-file-per-entry was that history.

Which is why the instruction is blunt: **never `git mv` an entry.** A different name is always a
different card.

## The same shape for guides

`kb/posts/<slug>/` is a folder rather than a file because a guide has assets - `images/` (tracked and
copied into the build) and `materials/` (working source such as PDFs, never deployed). Same principles:
the folder name is the `slug` is the permanent URL, the built pages are gitignored, and the source is
the only thing you commit.

`build_features.py` skips `kb/posts/` explicitly, because `kb/` holds two kinds of collection and only
directories that are vendors get assembled into feature JSON.

## The costs

- **A rename touches two files.** Slightly more typing than editing one array in place, and the chain
  can be left dangling. The validator catches exactly that.
- **You cannot see the dataset at once.** No single file to scroll. `grep -ril` across the folder is the
  replacement, and the built JSON is there if you genuinely want to read all of it.
- **A build step now stands between the source and the page.** Which is why the validators read built
  output, and why "did you rebuild?" is the first question when something looks wrong. See
  [architecture.md](architecture.md).
