# rebricked documentation

Organised with [Diátaxis](https://diataxis.fr/): four kinds of document, each answering a
different question, deliberately kept apart. If you cannot tell which of the four a page you
are writing belongs to, it belongs to none of them yet - split it.

| | Serves *doing* | Serves *knowing* |
|---|---|---|
| **Study** (acquiring skill / insight) | [Tutorials](tutorials/) - learning by doing, start here if you are new | [Explanation](explanation/) - why the repo is shaped the way it is |
| **Work** (applying skill / insight) | [How-to guides](how-to/) - one task, one recipe | [Reference](reference/) - the field rules, the scripts, the outputs |

## Start here

- **New to the repo?** [Tutorials](tutorials/) - get the site running, add an entry, publish a
  guide. Three lessons, in order.
- **Know the repo, need to do a thing?** [How-to guides](how-to/) - add a rename, insert a
  name into a chain, check citations, fix a failing build.
- **Need to look something up?** [Reference](reference/) - entry schema, guide front matter,
  every script and its flags, every generated file, the frontend contracts.
- **Wondering why it works this way?** [Explanation](explanation/) - why `status` is the sole
  discriminator, why one file per entry, why there is no framework, why citation rot has its
  own checker.

## The one rule

**Real, sourced changes only. Never be confidently wrong.** Every entry claim traces to a
live official Databricks or Microsoft Learn doc, carries a `verified` date, and is thrown
away rather than guessed at. Guides may argue, but every *fact* in a guide is cited inline
and every *judgement* is labelled as one. See
[explanation/sourcing-discipline.md](explanation/sourcing-discipline.md).

## How this relates to the other repo docs

`docs/` is the organised documentation. A few files outside it stay where tooling and
newcomers expect them:

| File | Role | Relationship to `docs/` |
|------|------|-------------------------|
| [`README.md`](../README.md) | The public front door (what the site is, how to run it) | Points here for anything deeper |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributor-facing quickstart: annotated YAML templates + field rules, the thing a PR author reads | The prose companion to [reference/entry-schema.md](reference/entry-schema.md); templates live there, the lookup table lives here |
| [`AGENTS.md`](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md) | Agent context, loaded automatically | Summarise; link here for detail |
| [`agents/*.md`](../agents/) | Executable skills an agent follows step by step | The authoritative *workflow*; the how-to guides here are the human-readable short form of the same steps |
| [`CHANGELOG.md`](../CHANGELOG.md) | Why-then-what log of every notable change | Not documentation; it is the record |
| [`COVERAGE-GAPS.md`](../COVERAGE-GAPS.md) | Point-in-time coverage report | Curation reference, not a checklist |

**When two documents disagree, authority runs:** the validators
([`scripts/validate.py`](../scripts/validate.py),
[`scripts/validate_posts.py`](../scripts/validate_posts.py)) are executable truth, then
[`CONTRIBUTING.md`](../CONTRIBUTING.md) and [`agents/`](../agents/), then these docs. A
disagreement is a bug in whichever document is not the validator - fix it, do not work
around it.

## Keeping these docs true

**Every change that alters behaviour updates the documentation in the same commit.** The docs
are only worth reading if they are not lying, and a static site with no tests has nothing else
to catch drift. The map from change to page:

| If you change... | Update |
|---|---|
| an entry field, a validator rule, `VALID_CATEGORIES` | [reference/entry-schema.md](reference/entry-schema.md), and `CONTRIBUTING.md` if the template changes |
| guide front matter or the Markdown subset | [reference/guide-schema.md](reference/guide-schema.md) |
| a script's flags, inputs, or outputs | [reference/scripts.md](reference/scripts.md) |
| what gets generated, or a URL path | [reference/generated-output.md](reference/generated-output.md) |
| `NAV`, filters, routing, or a tracked event | [reference/frontend.md](reference/frontend.md), [reference/analytics-events.md](reference/analytics-events.md) |
| the build order, the CI workflow, or a dependency | [explanation/architecture.md](explanation/architecture.md), [reference/scripts.md](reference/scripts.md) |
| a workflow step in `agents/` | the matching page in [how-to/](how-to/) |
| a design decision, or the reasoning behind one | the matching page in [explanation/](explanation/) |

Adding data (a new entry, a new guide) does **not** require a docs change - that is the
documented workflow working as intended. Changing *how* data is added always does.
