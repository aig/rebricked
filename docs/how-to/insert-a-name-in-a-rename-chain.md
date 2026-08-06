# How to insert a name into a rename chain

**Use this when** you discover a name that belongs *between* two cards that are already chained,
or *before* the earliest card. The chain must stay contiguous: every hop is one
`successorId`, and no card may point past a card you inserted.

## The invariant

```
A --successorId--> B --successorId--> C(active)
```

Each `renamed` card points at exactly the next name, and its `to` date equals the next card's
`from` date. Predecessors are never stored - they are derived by scanning for cards whose
`successorId` points here. So every insert is: add a card, then repoint **one** predecessor.

## Case 1: a middle name you missed

Before: `databricks-one --> genie-one`. You discover the thing was called just **Genie** in
between.

1. Write the new card `kb/databricks/genie.yaml` with `status.value: renamed`, its own `from`,
   a `to`, and `successorId: genie-one`.
2. **Repoint the predecessor.** On `databricks-one`, change `successorId` from `genie-one` to
   `genie`, and change its `to` date to the new card's `from` date.
3. Leave `genie-one` untouched. Nothing points backwards, so nothing else needs changing.

After: `databricks-one --> genie --> genie-one`. The failure mode to avoid is leaving
`databricks-one` pointing at `genie-one` - the chain then skips the card you just added, and the
UI's lineage line will show a gap.

## Case 2: an origin name you missed

Before: `legacy-dashboards --> lakeview-dashboards --> ai-bi-dashboards`. You discover the
original name was **Databricks SQL dashboards**.

1. Write `kb/databricks/databricks-sql-dashboards.yaml` with `status.value: renamed` and
   `successorId: legacy-dashboards`.
2. Nothing points at `legacy-dashboards` yet, so there is nothing to repoint. Done.

Watch for the retronym trap here: a card labelled "legacy X" is often a *rename* of an earlier
product, not the beginning of the story. "Legacy dashboards" was Databricks SQL dashboards first.

## Case 3: moving aliases and links onto the card that owns them

When you split a name off into its own card, that name's `aliases` and its origin-story `links`
move **to the new card**. Do not leave them duplicated on the neighbour - one card owns one
name's identity. For example the `Redash dashboards` / `DBSQL dashboards` aliases and the
Redash-acquisition links belong on `databricks-sql-dashboards`, not on the `legacy-dashboards`
card it precedes.

## Case 4: rerouting because you had the chain wrong

If a card's `successorId` turns out to point at the wrong name, fix `successorId` **and** the
`to` date together - they describe the same hop, and a `to` that no longer matches the
successor's `from` is a silent inconsistency the validator cannot see.

## Never do this

- **Never rename a file or an `id`** to make a chain read better. Ids are permanent. A different
  name is always a different card.
- **Never add a backward pointer.** There is no `predecessorId` and no `lineage` array; the
  validator warns if it sees a leftover `lineage` field.
- **Never leave a `renamed` card without both a `to` and a `successorId`.** The validator rejects
  it, and rightly: a superseded name that says nothing about what superseded it is useless.

## Verify the chain

```bash
python scripts/build_features.py && python scripts/validate.py
```

The validator checks that every `successorId` resolves to a real id and that no card points at
itself. It cannot check that your dates line up across a hop, so read the rendered lineage line
yourself:

```bash
python -m http.server 8777 -d www
```

Open the card and confirm the full chain reads in order with sensible dates. Then log it in
[`CHANGELOG.md`](../../CHANGELOG.md), **why then what** - for a re-chaining, the *why* is the
history you uncovered.
