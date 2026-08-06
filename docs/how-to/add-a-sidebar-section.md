# How to add or change a sidebar section

The rail is a static mirror of the Databricks console, configured by the `NAV` array near the top
of [`www/app.js`](../../www/app.js). It is also the reachability contract: **the validator fails
if any entry appears in no section.**

## Add an entry to an existing section

Find the item and append the id to its `ids` array:

```js
{ label: "Jobs & Pipelines", icon: "jobs", ids: ["lakeflow-jobs", "workflows", "your-new-id"] },
```

Then:

```bash
python scripts/build_features.py && python scripts/validate.py
```

The validator checks both directions: an id in `NAV` that is not in the data is an error, and an
entry in the data that no section lists is an error.

## Add a new section

`NAV` is an array of groups, each `{ label, items }`. An empty group label renders as the
unlabelled top block:

```js
{ label: "Data Engineering", items: [
  { label: "Runs", icon: "runs" },
  { label: "Data Ingestion", icon: "ingestion", ids: ["zerobus-ingest"] },
]},
```

Item shapes:

| Shape | Renders as | Behaviour |
|---|---|---|
| `{ label, icon, ids: [...] }` | rail item with a dot | clicking filters the list to those entries |
| `{ label, icon }` | rail item, no dot | clicking shows an honest empty state |
| `{ label, icon, home: true }` | Home | clears every filter and shows all entries |
| `{ label, icon, href: "/learn/" }` | an anchor | navigates away from the app (the Learn item) |

A section with no `ids` is deliberately allowed. The rail is console chrome first, so an item
Databricks has but this dataset does not cover yet still belongs there - it just says so.

## Add an icon

`icon` keys into the `ICONS` map below `NAV`, whose values are the inner markup of a 24x24 SVG
(paths only, `stroke` and `fill` come from CSS):

```js
const ICONS = {
  ingestion: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/>',
};
```

Keep it to simple strokes that read at 16 pixels in both light and dark themes.

## Keep the badge pages in sync

[`scripts/build_badges.py`](../../scripts/build_badges.py) carries its **own static copy** of
`NAV` and `ICONS`, because the badge and entry pages render the same rail without loading
`app.js`. A new section will not appear on those pages until you mirror it there and regenerate:

```bash
python scripts/build_badges.py     # needs Edge or Chrome for the og.png images
python scripts/build_entries.py
```

This duplication is deliberate (the generated pages have no JS runtime dependency on the app) and
it is a known drift risk. If the rails ever look different between `/` and `/databricks/<id>/`,
this is why.

## After any NAV change

Update [reference/frontend.md](../reference/frontend.md) if you changed the item shapes or added a
behaviour, and add a **why then what** [`CHANGELOG.md`](../../CHANGELOG.md) entry.
