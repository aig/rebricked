# How to add a rename

**Use this when** Databricks gave *the same thing* a new name. Same capability, same API, new
label. If a *different* thing took over instead, that is a
[deprecation](add-a-deprecation.md), not a rename: `dbx` -> Asset Bundles is a deprecation
(different tool, different config format).

> Agents: follow [`agents/add-databricks-entry.md`](../../agents/add-databricks-entry.md), which
> is the authoritative step-by-step version of this page.

## 1. Research the whole history, not just the rename

Search the **old** name - that is usually how you find the rename in the first place - and keep
going until you have confirmed the *current* state, not just the historical one:

- the original name, every intermediate name, and what it is called today
- the abbreviations and the names people actually type (these become `aliases`)
- a date per transition, at `YYYY` or `YYYY-MM` precision only
- an official Databricks or Microsoft Learn URL per claim, with the exact sentence that states
  it

A "where did X go?" or "X is now Y" doc page is the ideal source for a rename. Release notes
are the ideal source for the date.

If you cannot verify a transition against a live doc, **do not write it**. Report what you could
not confirm.

## 2. Check for collisions

```bash
ls kb/databricks/ | grep -i <candidate-slug>
grep -ril "<the name>" kb/databricks/
```

One file per entry, so `kb/databricks/<candidate-id>.yaml` existing *is* the collision check.
The grep catches the same name living under a different id. If the thing is already tracked,
[re-verify that entry](re-verify-an-entry.md) instead of adding a duplicate.

## 3. Write one card per name

A rename is **one `renamed` card per former name, chained to one `active` card** for the name
in use now.

**The former name** - `kb/databricks/<old-slug>.yaml`:

```yaml
id: old-name
name: Old Name
category: Data engineering
what:
  note: 'One line: what the thing was under this name.'
  link: https://docs.databricks.com/...
fact:
  - note: Self-contained real-but-fun one-liner about THIS name - never mention the successor.
    link: https://docs.databricks.com/...
status:
  value: renamed
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
from:
  date: '2021'
  link: https://docs.databricks.com/...
to:
  date: 2025-06
  link: https://docs.databricks.com/...
successorId: the-new-name
source: https://docs.databricks.com/...
verified: 'YYYY-MM-DD'
```

**The current name** - `kb/databricks/<new-slug>.yaml`: same required fields, but
`status.value: active`, a `from` and **no** `to`, and no `successorId` (nothing has replaced it
yet).

Rules that trip people up:

- **`id` = the kebab-case slug of that card's own `name`, and it is the filename.** Parenthetical
  qualifiers are dropped: `"Databricks CLI (v0.205+)"` -> `databricks-cli.yaml`.
- **Ids are permanent.** Never re-slug, never `git mv`. The rename adds a *new* file; the old
  card keeps its id, name, and filename forever.
- **You store only the forward link.** Predecessors are derived from everyone's `successorId`.
- **Each card's `fact` entries are self-contained** - about that name alone. The successor is its
  own card with its own facts.
- **Move the aliases and origin-story `links` onto the card that owns that name.** Do not leave
  them duplicated on the neighbour.
- **When an existing `active` card is the one being renamed:** change it to `status.value:
  renamed`, add `to` + `successorId`, and add the new card. Do not edit the old card's name.
- Full field table: [reference/entry-schema.md](../reference/entry-schema.md).

## 4. Add the maturity timeline if you can source it

`releases` is a separate axis from `status`: an ordered array of stages, last one is current.

```yaml
releases:
  - type: public-preview
    date: 2021-05
    link: https://...
  - type: ga
    date: 2022-04
    link: https://...
```

Valid types in order: `private-preview`, `beta`, `public-preview`, `ga`. Announced but not
reached is `{ type: ga, is_announced: true }` with no date, and only as the last stage. Omit
`releases` entirely when maturity is unknown or moot, which is usually the case for a superseded
former name. Never invent a transition date.

## 5. Wire both ids into the rail

Add each new id to the right `NAV` section's `ids` array in
[`www/app.js`](../../www/app.js) - see [add-a-sidebar-section.md](add-a-sidebar-section.md). An
entry no section reaches fails the validator.

## 6. Build, validate, check the links

```bash
python scripts/build_features.py && python scripts/validate.py
python scripts/check_anchors.py <old-id> <new-id>
```

The first must print `OK`. The second fetches every URL you cited and confirms each
`#:~:text=` quote is still on its page - the schema gate never fetches, so this is the only
thing that catches a paraphrased quote. `BLOCKED` is not a failure; see
[check-citations.md](check-citations.md).

## 7. Log it, then commit source only

Add a [`CHANGELOG.md`](../../CHANGELOG.md) entry under today's date, written **why then what**:
a bold one-line summary, a `Why:` paragraph (the history you uncovered, or the wrong claim this
fixes), a `What:` paragraph (the cards, their statuses, dates, and sources). This is the step
most often forgotten.

Commit the `kb/databricks/*.yaml` files and the `app.js` `NAV` edit. Never commit
`www/databricks.features.json` or anything else under
[reference/generated-output.md](../reference/generated-output.md) - it is gitignored build
output that CI regenerates.
