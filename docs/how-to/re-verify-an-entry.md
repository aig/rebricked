# How to re-verify an existing entry

**Use this when** a citation went dead, a date looks wrong, the docs moved, someone reports an
error, or an entry is simply old enough to doubt. An edit is held to exactly the same bar as a
new entry: real, sourced, and verified against a live doc today.

## 1. Find out what is actually wrong

```bash
python scripts/check_anchors.py <id>
```

Three verdicts, and only one is a problem:

- **`OK`** - the page is live, and the cited quote is still on it.
- **`DEAD`** - either the page is gone, or it loaded fine and **the cited text is not on it**.
  This is the one to act on.
- **`BLOCKED`** - the host refused a scripted request. Says nothing about the link. Finish those
  by hand; see [check-citations.md](check-citations.md).

**A `DEAD` quote on a live vendor page is often the first sign of a rename** - which is this
project's whole subject. Read the page before you assume it is just a wording change.

## 2. Decide which of the three things happened

| What you find | What to do |
|---|---|
| The doc was reworded, the claim still holds | Update the `#:~:text=` fragment to the new exact sentence |
| The doc moved | Update the URL (and the fragment, if the wording changed with it) |
| The claim is no longer true | The entry is wrong. Fix the claim, or change `status` - this may be a rename or a deprecation you have just discovered |

Never "fix" a dead quote by deleting the fragment. A plain URL only claims the page exists; the
fragment is what makes the claim checkable, and dropping it quietly downgrades a sourced entry to
an unsourced one.

## 3. Make the edit

Edit `kb/databricks/<id>.yaml` in place. Rules specific to editing:

- **Bump `verified` to today** on any entry you touch. That field means "a human confirmed this
  on this date" and nothing else.
- **Bump `status.date`** if you re-confirmed the lifecycle state, and `limitations.date` if you
  re-fetched the limitations page.
- **Never change the `id` or the filename**, even to fix a mismatch with the name. Ids are
  permanent. If the name genuinely changed, that is a
  [rename](add-a-rename.md): a new card plus a `successorId`, not an edit.
- **Re-verify every claim you touch**, not just the one that failed. If you are already reading
  the page, check the dates and the `what.note` against it.

## 4. If the discovery is bigger than the entry

Three outcomes that turn a re-verification into a larger change:

- **It was renamed.** Add the new name's card, set this one to `status.value: renamed` with a
  `to` and `successorId`. See [add-a-rename.md](add-a-rename.md).
- **It was deprecated.** Change `status.value`, add `deprecatedAt`, and add `successorId` or
  `replacement` only if something genuinely took over. See
  [add-a-deprecation.md](add-a-deprecation.md).
- **There is a name missing from the chain.** See
  [insert-a-name-in-a-rename-chain.md](insert-a-name-in-a-rename-chain.md).

## 5. Validate and log

```bash
python scripts/build_features.py && python scripts/validate.py
python scripts/check_anchors.py <id>
```

Then a [`CHANGELOG.md`](../../CHANGELOG.md) entry, **why then what**. For a correction the *why*
is the important half: what the entry claimed, why that was wrong, and what it cost a reader to
believe it. A changelog line that only says "updated delta-live-tables" is worthless in six
months.

## Sweeping many entries at once

`check_anchors.py` with no ids checks the whole dataset plus every guide. It needs the network and
takes a while, so it is a local or scheduled audit, deliberately **not** part of the deploy gate:

```bash
python scripts/check_anchors.py                 # everything
python scripts/check_anchors.py --list-blocked  # just the hosts to finish by hand
```
