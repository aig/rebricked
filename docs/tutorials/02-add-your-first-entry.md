# Add your first entry

You will read a real rename chain to see how one is shaped, then build a practice entry from
scratch, watch each gate reject it for a different reason, fix it until everything passes, and
delete it.

**Before you start:** finish [Get the site running](01-get-the-site-running.md).

> **The practice entry is disposable.** You will create
> `kb/databricks/tutorial-widget.yaml`, which is *not* a real Databricks product. Step 8
> deletes it. Never commit it - the repo's one rule is real, sourced changes only, and an
> invented product on the live site is exactly the failure this project exists to avoid.

## 1. Read a real chain first

Databricks renamed Delta Live Tables to Lakeflow Declarative Pipelines in June 2025. That is
two cards, not one. Open both:

```bash
cat kb/databricks/delta-live-tables.yaml
cat kb/databricks/lakeflow-declarative-pipelines.yaml
```

Notice five things, because they are the whole model:

1. **One card per name.** The old name did not get edited into the new name. It was frozen.
2. **`delta-live-tables` has `status.value: renamed`**, a `to` date, and
   `successorId: lakeflow-declarative-pipelines`.
3. **`lakeflow-declarative-pipelines` has `status.value: active`** and a `from` date. Nothing
   in it points *backwards* - "what came before" is derived by looking for cards whose
   `successorId` points here. You only ever store the forward link.
4. **Every date is an object,** not a string: `{ date, link }`, so the date carries the doc
   that confirms it.
5. **Almost every link ends in `#:~:text=`.** That is a text fragment selecting the exact
   sentence on the source page. It is what makes a claim checkable rather than merely cited.

The word "rename" appears in no field. It is *calculated*: a card is a rename tip because
some other card's `successorId` points at it. See
[explanation/status-as-sole-discriminator.md](../explanation/status-as-sole-discriminator.md).

## 2. Create the old-name card

Write `kb/databricks/tutorial-widget.yaml`:

```yaml
id: tutorial-widget
name: Tutorial Widget
category: Data engineering
what:
  note: A pretend feature used only to learn the workflow.
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
fact:
  - note: It does not exist, which makes it the only entry in this repo you should delete.
    link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
status:
  value: renamed
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
  date: '2026-08-06'
from:
  date: '2024'
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
to:
  date: 2025-06
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
successorId: tutorial-gadget
source: https://docs.databricks.com/aws/en/ldp/where-is-dlt
verified: '2026-08-06'
```

House style, and it matters for diffs: two-space indent, `-` for lists, **one line per value**
(never wrap a long note or URL), and quote anything YAML would otherwise read as a number or
date. `date: '2024'` needs quotes; `date: 2025-06` does not.

## 3. Watch the build fail

```bash
python scripts/build_features.py && python scripts/validate.py
```

The build succeeds; the validator does not. You should see something like:

```
error: [tutorial-widget] successorId 'tutorial-gadget' does not match any entry id
error: [tutorial-widget] entry appears in no NAV section in app.js - unreachable from the rail
```

Two real invariants, caught for free. A rename chain must not dangle, and an entry the sidebar
cannot reach is an entry nobody finds.

## 4. Create the current-name card

Write `kb/databricks/tutorial-gadget.yaml`:

```yaml
id: tutorial-gadget
name: Tutorial Gadget
aliases:
  - Widget
category: Data engineering
what:
  note: The pretend feature under its pretend new name.
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
fact:
  - note: Its only documented capability is teaching you where the successorId goes.
    link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
status:
  value: active
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
  date: '2026-08-06'
releases:
  - type: public-preview
    date: 2025-06
  - type: ga
    date: 2026-01
from:
  date: 2025-06
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt
source: https://docs.databricks.com/aws/en/ldp/where-is-dlt
verified: '2026-08-06'
```

`releases` is the maturity axis, and it is **orthogonal** to `status`: this card is `active`
*and* currently GA, and it would still be `active` if it were only in public preview. The last
stage in the array is the current one.

## 5. Break it deliberately, twice

First, add `to:` to the `tutorial-gadget` card (copy the `from` block and rename the key), then
re-run the validator:

```
error: [tutorial-gadget] an 'active' card must not have a 'to' date (it is open-ended)
```

A name in use now has no end date. Remove the `to`.

Second, change `name: Tutorial Gadget` to `name: Tutorial Gizmo` and re-run:

```
error: [tutorial-gizmo] id must be the name slug 'tutorial-gizmo' (from name 'Tutorial Gizmo'); ids follow the name
```

The `id` is the kebab-case slug of the card's own name, **and it is the filename**. Change the
name back. In real work you never fix this by renaming a file: ids are permanent, and a rename
adds a new card. See [explanation/one-file-per-entry.md](../explanation/one-file-per-entry.md).

## 6. Wire both ids into the sidebar

Open [`www/app.js`](../../www/app.js) and find the `NAV` array near the top. Add both ids to
the `ids` list of the *Jobs & Pipelines* item:

```js
{ label: "Jobs & Pipelines", icon: "jobs", ids: ["tutorial-widget", "tutorial-gadget", "lakeflow-declarative-pipelines", ...] },
```

Re-run the gate:

```bash
python scripts/build_features.py && python scripts/validate.py
```

`OK: 107 entries valid.` Every id reachable, every chain resolved.

## 7. See it

```bash
python -m http.server 8777 -d www
```

Search for `Tutorial` at <http://localhost:8777/>. You should see the `Tutorial Gadget` card,
green **Active** badge, a **GA** pill in its corner, and a lineage line showing
`Tutorial Widget -> Tutorial Gadget`. Click the *Jobs & Pipelines* rail item and both cards are
in the filtered list.

That lineage line is the payoff of the whole data model: you stored one forward pointer, and
the UI derived the chain, the predecessor, the badge, and the timeline segment from it.

## 8. Clean up

```bash
rm kb/databricks/tutorial-widget.yaml kb/databricks/tutorial-gadget.yaml
```

Remove both ids from `NAV` in `app.js`, then confirm you left nothing behind:

```bash
python scripts/build_features.py && python scripts/validate.py && git status --short
```

`git status` should be clean. If `app.js` still shows as modified, you missed a `NAV` id.

## What you learned

- Each name is its own card; a rename freezes the old one and adds a new one.
- `status.value` decides which fields are required, and nothing else does.
- Maturity (`releases`) is a separate axis from lifecycle (`status`).
- `id` = the name's slug = the filename, and ids never change.
- The validator enforces chain integrity and sidebar reachability, not just field types.

## Next

Do it for real with [how-to/add-a-rename.md](../how-to/add-a-rename.md), which starts where
this tutorial skipped: the research, the sourcing, and the changelog entry. Or carry on to
[Publish your first guide](03-publish-your-first-guide.md).
