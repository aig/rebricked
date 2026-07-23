# CLAUDE.md

The full agent + contributor guidance for this repo lives in **[AGENTS.md](AGENTS.md)**,
imported below so it is always in context. AGENTS.md is the single source of truth; this
file only guarantees it loads and pins the one workflow that is easy to skip.

## Read this first

**Adding, editing, correcting, or re-verifying any entry in `databricks.features.json` MUST
follow the [`add-databricks-entry`](agents/add-databricks-entry.md) skill - do not hand-roll
the flow from the validator or from memory.** In short:

1. **Investigate + source** the thing's full history against live official docs (Databricks /
   Microsoft Learn). Real, sourced changes only - never be confidently wrong.
2. **Classify** by `status` (`active` / `renamed` / `deprecated` / `legacy` / `retired`).
3. **Check collisions** - `id` is the name's slug, unique, permanent.
4. **Write** the correctly-shaped object (right required fields; no em dashes; `verified` =
   today; a real-but-fun `fact`; optional `releases` maturity timeline and sourced `limitations`
   `{ note, link, date }`, omitted when the docs list none).
5. **Wire the `id` into `app.js` `NAV`** - every entry must be reachable from a rail section.
6. **Validate and log** - `python scripts/validate.py` must print `OK`, then add a
   `CHANGELOG.md` line under today's date. *(Both are required; the changelog is the step
   most often forgotten.)*

Everything else - the data model, layout, conventions, and the pre-commit checklist - is in
AGENTS.md below.

@AGENTS.md
