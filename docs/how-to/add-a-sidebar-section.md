# How to add or change a sidebar section

The rail is a static mirror of the vendor's console, and it is the reachability contract: **the
validator fails if any entry appears in no section.**

**Which file you edit depends on the vendor:**

| Vendor | Rail lives in | Why |
|---|---|---|
| Databricks | the `NAV` array near the top of [`www/app.js`](../../www/app.js) | the SPA renders this rail, so the app is its source of truth and the generated pages parse it |
| Snowflake | `SNOWFLAKE_NAV` in [`scripts/chrome.py`](../../scripts/chrome.py) | there is no SPA for Snowflake to parse, so the rail is declared |

The rest of this page is the Databricks flow. A Snowflake section is the same idea in Python -
append the id to the right item's tuple, or add `(label, icon key, (ids...))` to a group, adding
the icon to `SNOWFLAKE_ICONS` if it is new - and the same validator check applies.

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

## The generated pages follow automatically

The badge, entry, hub and guide pages render the same rail without loading `app.js`.
[`scripts/build_badges.py`](../../scripts/build_badges.py) used to carry its own static copy of
`NAV` and `ICONS` for them, and that copy drifted every time `app.js` changed alone. It now
**parses `NAV` and `ICONS` out of `www/app.js`** at build time (`load_rail()`), so a new section,
a renamed one, or one that gains its first entry shows up on the generated pages the next time they
are built - nothing to mirror by hand:

```bash
python scripts/build_badges.py     # needs Edge or Chrome for the og.png images
python scripts/build_entries.py
```

The parser relies on the one-item-per-line formatting `NAV` and `ICONS` already use (`{ label:
"...", icon: "...", ids: [...] }` per line; `key: '<svg inner markup>',` per icon). Keep that shape.
If a `NAV` item names an icon that `ICONS` lacks, or the blocks cannot be found, the build fails
loudly instead of shipping a partial rail.

## Snowflake sections also filter the hub

A Snowflake rail item with ids links to `/snowflake/#s=<label>`, and the hub's own script filters
its table to that section. Nothing else to wire: the section label in `SNOWFLAKE_NAV` *is* the
key, matched against each row's pipe-delimited `data-sections`. A section with an empty tuple
renders without a dot and just links to the hub.

## After any NAV change

Update [reference/frontend.md](../reference/frontend.md) if you changed the item shapes or added a
behaviour, and add a **why then what** [`CHANGELOG.md`](../../CHANGELOG.md) entry.
