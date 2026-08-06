# How to add a feature

**Use this when** the thing is a genuinely new capability - not renamed from something else, not
deprecated. Liquid Clustering and Unity Catalog Volumes are features. It records what the thing
is and when it landed, so the timeline stays complete.

A feature card and a rename tip are *both* `status.value: active`. The difference is calculated,
not stored: a feature carries its own `introducedAt`; a rename tip carries `from`. Exactly one of
the two, never both.

## 1. Confirm it is actually new

Search the name and any plausible earlier name before you write anything. The common failure is
adding a "new feature" that is really the third name for a 2019 product - in which case you want
[add-a-rename.md](add-a-rename.md) and a chain, not a standalone card.

Also confirm it is not already tracked:

```bash
ls kb/databricks/ | grep -i <candidate-slug>
grep -ril "<the name>" kb/databricks/
```

## 2. Write the card

`kb/databricks/<slug>.yaml`:

```yaml
id: the-new-thing
name: The New Thing
aliases:
  - what people type
  - ABBR
category: Data engineering
what:
  note: 'One line: what the thing is.'
  link: https://docs.databricks.com/...
fact:
  - note: Real-but-fun one-liner - a standout capability, an engine codename, a documented quirk.
    link: https://docs.databricks.com/...
  - note: Optional second sourced fact - up to three, each with its own link.
    link: https://docs.databricks.com/...
status:
  value: active
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
releases:
  - type: public-preview
    date: 2024-03
    link: https://docs.databricks.com/...
  - type: ga
    date: 2024-11
    link: https://docs.databricks.com/...
introducedAt:
  date: '2024'
  link: https://docs.databricks.com/...
occasion:
  date: 2024-11
  link: https://docs.databricks.com/...
  note: Data + AI Summit 2024
limitations:
  note: Officially documented caveats - omit the whole field when the docs list none.
  link: https://docs.databricks.com/...
  date: 'YYYY-MM-DD'
prediction:
  - A deadpan-plausible invented next name
source: https://docs.databricks.com/...
verified: 'YYYY-MM-DD'
```

## 3. Get `releases` right, because it is the field most often mangled

`releases` is the **maturity** axis and is orthogonal to `status`. A card can be `active` but
only in public preview, or even `legacy` but `beta` (shipped as Beta, later marked legacy without
ever reaching GA).

- Ordered array, chronological. **The last element is the current maturity.**
- Reached stage: `{ type, date }`. Announced but not reached: `{ type, is_announced: true }`,
  no date, and **only** as the last element.
- Valid types in Databricks' order: `private-preview` -> `beta` -> `public-preview` -> `ga`.
- There is no `pre-ga` type. "GA soon" is `{ type: ga, is_announced: true }`.
- Only include stages whose dates you can source. Omit the field rather than guess.

## 4. Fill `limitations` only from the docs

Look up the feature's official limitations page. Write one concise `note`, cite the exact URL,
and date it. **Omit the field entirely when the docs list none - never invent a limitation.**

For any numeric quota, cross-check the mirrored resource-limits reference:

```bash
python scripts/fetch_reference.py databricks-resource-limits
# then read reference/docs.databricks.com/aws/en/resources/limits.md
```

That page's **`Fixed`** column decides how you word it. `Yes` = a hard cap. `No` = a soft
default, raisable on request through the account team, so write it as "up to N by default,
raisable on request", not as an absolute cap. Getting this wrong turns a support ticket into an
architecture decision.

## 5. Wire, validate, log

```bash
# add the id to a NAV section in www/app.js first
python scripts/build_features.py && python scripts/validate.py
python scripts/check_anchors.py <id>
```

Then a **why then what** [`CHANGELOG.md`](../../CHANGELOG.md) entry, and commit the YAML plus the
`app.js` edit.

## If it gets renamed later

Do not edit this card's name. Add a new card for the new name, then change this card to
`status.value: renamed` with a `to` date and a `successorId` pointing at the new card. It joins
the chain and keeps its id forever. See [add-a-rename.md](add-a-rename.md).
