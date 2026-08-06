# Entry schema

One entry = one file = `kb/databricks/<id>.yaml`, holding one YAML mapping. The same shape appears
as one object in the built `www/databricks.features.json`; the one-file-per-entry layout changed
nothing about the fields.

Enforced by [`scripts/validate.py`](../../scripts/validate.py) (fields) and
[`scripts/build_features.py`](../../scripts/build_features.py) (id/filename agreement). Copy-ready
templates live in [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## YAML house style

- two-space indent, `-` for lists
- **one line per value** - never wrap a long `note` or URL; reflowed text makes noisy diffs
- quote anything YAML would read as a number or date: `date: '2021'`, `verified: '2026-08-06'`.
  A bare `date: 2021-05` is already a string and needs no quotes
- **never an em dash** in any text field. Hyphens only

## `status` is the sole discriminator

There is **no `kind` field**. `status.value` decides what the card is and which extra fields are
required. It stores only what cannot be calculated.

| `status.value` | Meaning | Requires | Forbids |
|---|---|---|---|
| `active` | Any name in use now: both a standalone feature and the current tip of a rename chain | exactly one of `introducedAt` / `from` | `to` |
| `renamed` | A superseded former name | `to` + `successorId` | - |
| `deprecated` | An announced deprecation, with a date or timeline | `deprecatedAt` | - |
| `retired` | Already removed; access has ended | `deprecatedAt` | - |
| `legacy` | Docs call it legacy or unsupported, but there is **no** formal deprecation date | `deprecatedAt` | - |

Two things are **calculated, not stored**:

- **feature vs rename tip.** An `active` card with `introducedAt` is a standalone feature; one with
  `from` is the current name of a rename chain. Exactly one must be present.
- **predecessors.** Derived from every card's `successorId`. There is no backward link, no
  `predecessorId`, and no `lineage` array.

## Required on every entry

| Field | Type | Rules |
|---|---|---|
| `id` | string | kebab-case `[a-z0-9-]`, unique across the vendor, **equals the filename**, and equals the slug of this card's own `name` with parentheticals dropped. **Permanent** - never re-slug, never `git mv` |
| `name` | string | The product/feature name under this card |
| `category` | string | Closed allow-list; see below |
| `what` | `{ note, link }` | `note` = self-contained one-line description of the thing *under this name*; `link` = the official doc it is drawn from. Both required, `link` must be http(s) |
| `fact` | array of 1-3 `{ note, link }` | Real-but-fun one-liners about **this card's** thing. Each `link` is required and must back *that* claim. Self-contained: never mention the successor or predecessor |
| `status` | `{ value, link, date }` | All three required. `value` from the table above; `link` = the doc backing the call; `date` = `YYYY-MM-DD`, never future. Extra keys are rejected |
| `source` | URL | The canonical official link. No source, no entry |
| `verified` | `YYYY-MM-DD` | The day a human last confirmed the entry. Never future |

`category` must be one of:

```
Data engineering    Compute / BI    Developer experience    Data governance
BI / Dashboards     AI / BI         AI / ML
```

Adding one means editing `VALID_CATEGORIES` in `validate.py` deliberately, in the same commit that
uses it. See [how-to/add-a-category.md](../how-to/add-a-category.md).

## Date-bearing fields

Every one of these is a `{ date, link }` **object**, not a bare string: the date plus the official
doc confirming it. `date` is `YYYY` or `YYYY-MM` (real months only); `link` must be http(s) and may
reuse `source`. A bare string still validates for legacy resilience, but write the object.

| Field | Required when | Meaning |
|---|---|---|
| `introducedAt` | `active` standalone feature | when the capability landed |
| `from` | `active` rename tip; optional on `renamed` | when this name started being used |
| `to` | `renamed` | when this name stopped being current. Must not precede `from` |
| `deprecatedAt` | any deprecation status | when it was deprecated |
| `removedAt` | never | when it was removed. Must not precede `deprecatedAt` |

Precision is optional. Honesty about precision is not - use `YYYY` when you only know the year.

## `releases`: the maturity axis

Optional on any entry, and **orthogonal to `status`**. An ordered, chronological array of stages;
**the last element is the current maturity**. A card can be `active` but `public-preview`, or
`legacy` but `beta` (shipped Beta, later marked legacy without ever reaching GA).

Each stage is one of two shapes:

```yaml
releases:
  - type: public-preview    # REACHED
    date: 2024-03           # YYYY or YYYY-MM
    link: https://...       # optional
  - type: ga                # ANNOUNCED but not reached
    is_announced: true      # no date allowed; only valid as the LAST stage
```

| `type` | Databricks stage | Meaning |
|---|---|---|
| `private-preview` | Private Preview | invite-only, a small set of customers |
| `beta` | Beta | available to most customers |
| `public-preview` | Public Preview | available to all customers |
| `ga` | GA | fully supported, production-ready |

Rules: stages must be in chronological order; a stage has either `date` or `is_announced: true`,
never both; only the last stage may be announced. There is **no `pre-ga` type** - "GA soon" is
`{ type: ga, is_announced: true }`. Omit `releases` entirely when maturity is unknown or moot.

The UI shows the last stage as a corner pill on a cool-hue ramp (violet -> indigo -> blue -> green;
announced stages render "<Stage> soon" with a dashed border) and the full timeline in the tooltip.

## Optional fields

| Field | Type | Rules |
|---|---|---|
| `abbr` | string | An abbreviation shown with the name |
| `aliases` | array of strings | The names people actually type, including abbreviations and legacy URL paths. Owned by the card whose name they are - never duplicated onto a neighbour |
| `successorId` | string | The id of the card this became or was replaced by. Must resolve to a real id and may not equal this card's `id`. Required on `renamed` |
| `replacement` | string | Free-text "use this instead", for a successor with no card of its own. Omit when nothing replaced it - the card then renders "retired" |
| `occasion` | `{ date, link, note }` | A dated milestone: the summit, launch blog, or end-of-life moment. `date` is `YYYY`/`YYYY-MM`; `note` is the short label, e.g. `Data + AI Summit 2025`. Appended to the card's date line |
| `limitations` | `{ note, link, date }` | A concise summary of **officially documented** limitations, the page it came from, and the `YYYY-MM-DD` date fetched. **Omit when the docs list none - never invent one.** Cross-check numeric quotas against the [resource-limits mirror](../how-to/refresh-the-reference-mirror.md); a soft limit is a raisable default, not a cap |
| `links` | array of `{ url, kind, label }` | Extra classified references. `kind` is `official` / `community` / `internet` and classifies the *link*, unrelated to the entry's `status`. Every URL must be real and verified |
| `prediction` | array of strings | The **one deliberately fictional field**: invented next names, deadpan-plausible. Powers the "New" gag, the card's AI-guess reveal, and the quiz's hardest distractors; the UI always labels them invented. Renames and features only - the validator warns on a deprecation |
| `vendor` | string | Defaults to `databricks`. Sets the URL namespace `/{vendor}/{id}/` |

## Removed fields

| Field | Status |
|---|---|
| `note` | **Error.** Folded into the `fact` array and removed |
| `kind` | Gone. `status` is the sole discriminator |
| `lineage` | Gone. Warns if present. Chains are one forward `successorId` per hop |
| `renamedAt` | Gone. Warns if present. Use `to` / `from` |

## Cross-entry invariants

- Every `id` is unique across the vendor.
- Every `successorId` resolves to an existing id, and no card points at itself.
- **Every entry is reachable from at least one `NAV` section** in
  [`www/app.js`](../../www/app.js), and every id `NAV` lists exists in the data. Both directions are
  errors. See [frontend.md](frontend.md).

## Worked example

A two-card rename chain, real and current:

```yaml
# kb/databricks/delta-live-tables.yaml
id: delta-live-tables
name: Delta Live Tables
abbr: DLT
category: Data engineering
what:
  note: Declarative framework for batch and streaming ETL pipelines.
  link: https://docs.databricks.com/aws/en/ldp/concepts/#:~:text=declarative%20framework
status:
  value: renamed
  link: https://docs.databricks.com/aws/en/ldp/where-is-dlt#:~:text=formerly%20known%20as
  date: '2026-07-18'
from:
  date: '2021'
  link: https://www.databricks.com/blog/2021/05/27/...
to:
  date: 2025-06
  link: https://docs.databricks.com/aws/en/release-notes/product/2025/june#:~:text=DLT%20is%20now
successorId: lakeflow-declarative-pipelines
source: https://docs.databricks.com/aws/en/ldp/where-is-dlt
verified: '2026-07-23'
```

The successor card is identical in shape but carries `status.value: active`, a `from`, no `to`, and
no `successorId`. Read both in full for the canonical example:

```bash
cat kb/databricks/delta-live-tables.yaml kb/databricks/lakeflow-declarative-pipelines.yaml
```
