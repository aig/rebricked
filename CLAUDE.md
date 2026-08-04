# CLAUDE.md

The full agent + contributor guidance for this repo lives in **[AGENTS.md](AGENTS.md)**,
imported below so it is always in context. AGENTS.md is the single source of truth; this
file only guarantees it loads and pins the one workflow that is easy to skip.

## Read this first

**The data is one YAML file per entry: `kb/databricks/<id>.yaml`.** `www/databricks.features.json`
is generated from it by `scripts/build_features.py` and is gitignored - never edit the JSON, your
change would be overwritten and never ship.

**Adding, editing, correcting, or re-verifying any entry MUST follow the
[`add-databricks-entry`](agents/add-databricks-entry.md) skill - do not hand-roll the flow from
the validator or from memory.** In short:

1. **Investigate + source** the thing's full history against live official docs (Databricks /
   Microsoft Learn). Real, sourced changes only - never be confidently wrong.
2. **Classify** by `status.value` (`active` / `renamed` / `deprecated` / `legacy` / `retired`);
   `status` is a `{ value, link, date }` object (value + backing doc + date confirmed).
3. **Check collisions** - `id` is the name's slug, unique, permanent, and *is the filename*
   (`ls kb/databricks/<id>.yaml`).
4. **Write** `kb/databricks/<id>.yaml`, correctly shaped (right required fields; no em dashes;
   `verified` = today; a `fact` array of 1-3 sourced real-but-fun `{ note, link }` one-liners;
   optional `releases` maturity timeline and sourced `limitations`
   `{ note, link, date }`, omitted when the docs list none).
5. **Wire the `id` into `app.js` `NAV`** - every entry must be reachable from a rail section.
6. **Build, validate, and log** - `python scripts/build_features.py && python scripts/validate.py`
   must print `OK`, then add a `CHANGELOG.md` entry under today's date, written as **why then
   what** (bold summary, a `Why:` paragraph, a `What:` paragraph). *(All required; the changelog
   is the step most often forgotten.)* Commit the YAML, not the built JSON.

Everything else - the data model, layout, conventions, and the pre-commit checklist - is in
AGENTS.md below.

@AGENTS.md
