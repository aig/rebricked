<h1 align="center">
  <img src="www/assets/logo.svg" alt="REbricked" width="320">
</h1>

<p align="center"><strong>Databricks renamed it.</strong></p>

A single static page that answers one question: *"What happened to the thing Databricks
used to call X?"* It lists Databricks product and feature **renames, deprecations, and new
features** - sourced, dated, and searchable - dressed up as the Databricks console.

`rebricked` = **re**named or de**pre**cated.

> Not affiliated with Databricks. The console chrome is an homage. This site is for
> educational purposes only.

## What it does

- **Look up an old name** and see what it became - full lineage, with dates
  (e.g. *Delta Live Tables → Lakeflow Declarative Pipelines*).
- **Three kinds of entry**, each held to the same bar of *real, sourced changes only*:
  - **Renames** - a new name for the same thing. The name in use now shows as **Active**
    (green); each superseded former name shows as **Renamed** (slate).
  - **Deprecations** - retired or replaced, pointing at the successor (**Deprecated**, amber).
  - **New features** - genuinely new capabilities worth tracking (**Active**, green).
- **Filter and search** - a status filter (**Active / Renamed / Deprecated**), keyed on the
  badge each card shows, plus category chips, a console-style sidebar, and instant search.
- Every entry has an **official source** (Databricks or Microsoft Learn docs) and a
  `verified` date.

### The fun bits

- **Quiz mode** - Associate ("guess the current name," 5 questions) or Professional
  ("name the feature from its definition," 10 questions), with score + streak and a
  results screen. Share your score on LinkedIn via a link that encodes the result, so
  whoever opens it gets a "beat this score" challenge banner.
- **Deep links** - `#<entry-id>` opens a single entry; `?q=<term>` reflects the search box.
  Each card can copy its own link or a tidy blurb for pasting into Slack.
- **Year timeline** - a stacked bar chart of changes per year, colour-coded by status
  (Active / Renamed / Deprecated) and synced to the filter; click a bar to filter by year.
- **"On this month" spotlight**, a **random-entry roulette** (with brick confetti 🧱), a
  light/dark theme toggle, and a deadpan "days since the last change" counter.

## Running locally

No framework, no backend, no JS toolchain - it's a static site, and the whole site lives in
`www/` (that folder is what GitHub Pages publishes). The only build step assembles the data:
entries are authored one YAML file per entry in `kb/databricks/`, and
`www/databricks.features.json` is generated from them. The page fetches that JSON, so it must be
served over http (opening the file directly is blocked by the browser):

```bash
pip install pyyaml                    # one-time: the only dependency, and only for the build
python scripts/build_features.py      # kb/databricks/*.yaml -> www/databricks.features.json
python -m http.server 8777 -d www
```

Then open <http://localhost:8777/>.

## Layout

| File | What it is |
|------|------------|
| `www/` | **The deployed site root** - everything GitHub Pages publishes. |
| `kb/databricks/` | **The data. Source of truth.** One YAML file per entry, named `<id>.yaml` - a rename, deprecation, or feature. |
| `www/databricks.features.json` | Generated from `kb/` by `scripts/build_features.py` (gitignored). What the page fetches at runtime; don't hand-edit. |
| `www/index.html` | App shell: Databricks-style sidebar rail + content area. |
| `www/app.js` | Vanilla JS (single IIFE, no deps). Fetches the data, renders everything, wires search / filters / quiz / roulette / theme. |
| `www/styles.css` | All styling. CSS variables; light default, `data-theme="dark"` toggle. |
| `scripts/build_features.py` | Assembles `kb/<vendor>/*.yaml` into `www/<vendor>.features.json`. Run before validating or previewing; CI runs it before deploy. |
| `scripts/validate.py` | Schema / format gate for the built `databricks.features.json`. |
| `docs/` | **The documentation**, organised with [Diátaxis](https://diataxis.fr/): tutorials, how-to guides, reference, explanation. |
| `CONTRIBUTING.md` | The entry schema and field rules. |
| `AGENTS.md` | Guidance for AI agents (and humans) working in the repo. |

## Documentation

[`docs/`](docs/) is the full documentation set, organised with
[Diátaxis](https://diataxis.fr/):

- **[Tutorials](docs/tutorials/)** - start here: get the site running, add your first entry,
  publish your first guide.
- **[How-to guides](docs/how-to/)** - one task per page: add a rename, add a deprecation,
  insert a name into a rename chain, check citations, fix a failing build.
- **[Reference](docs/reference/)** - the entry schema, guide front matter, every script and its
  flags, every generated file, the frontend contracts, the tracked analytics events.
- **[Explanation](docs/explanation/)** - why `status` is the sole discriminator, why the data is
  one file per entry, why there is no framework, why citation rot has its own checker.

## Analytics & privacy

Visits are counted with [Umami](https://umami.is) - cookieless, no personal data, so no
consent banner is required. A few anonymous custom events (filter toggles, quiz opens,
searches, shares) help show what people use. LinkedIn share links carry
[UTM tags](https://docs.umami.is/docs/utm) so shared traffic is attributed. Everything is
guarded: if the analytics script is blocked or absent, the app behaves identically.

## Contributing

Spotted an error, an out-of-date name, or a change we're missing? Contributions welcome:
<https://github.com/aig/rebricked>.

**The one rule: real, sourced changes only. Never be confidently wrong.** Every entry needs
an official source and a `verified` date; if you can't verify a claim against a live doc,
flag it rather than adding it. Before opening a PR, run the schema gate (CI runs the same
one):

```bash
python scripts/validate.py
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full field rules.

## Disclaimer

This site is for educational purposes only and is **not affiliated with, endorsed by, or
sponsored by Databricks**. Product names and trademarks belong to their respective owners;
the console-style chrome is an homage. Every entry is sourced and dated, but - given the
subject - may already be out of date.
