<h1 align="center">
  <img src="assets/logo.svg" alt="REbricked" width="320">
</h1>

<p align="center"><strong>Databricks no longer calls it that.</strong></p>

A single static page that answers one question: *"What happened to the thing Databricks
used to call X?"* It lists Databricks product and feature **renames, deprecations, and new
features** — sourced, dated, and searchable — dressed up as the Databricks console.

`rebricked` = **re**named or de**pre**cated.

> Not affiliated with Databricks. The console chrome is an homage. This site is for
> educational purposes only.

## What it does

- **Look up an old name** and see what it became — full lineage, with dates
  (e.g. *Delta Live Tables → Lakeflow Declarative Pipelines*).
- **Three kinds of entry**, each held to the same bar of *real, sourced changes only*:
  - **Renames** — a new name for the same thing. The name in use now shows as **Active**
    (green); each superseded former name shows as **Renamed** (slate).
  - **Deprecations** — retired or replaced, pointing at the successor (**Deprecated**, amber).
  - **New features** — genuinely new capabilities worth tracking (**Active**, green).
- **Filter and search** — a status filter (**Active / Renamed / Deprecated**), keyed on the
  badge each card shows, plus category chips, a console-style sidebar, and instant search.
- Every entry has an **official source** (Databricks or Microsoft Learn docs) and a
  `verified` date.

### The fun bits

- **Quiz mode** — "guess the current name," 5 questions per round, score + streak, and a
  results screen. Share your score on LinkedIn via a link that encodes the result, so
  whoever opens it gets a "beat this score" challenge banner.
- **Deep links** — `#<entry-id>` opens a single entry; `?q=<term>` reflects the search box.
  Each card can copy its own link or a tidy blurb for pasting into Slack.
- **Year timeline** — a stacked bar chart of changes per year, colour-coded by status
  (Active / Renamed / Deprecated) and synced to the filter; click a bar to filter by year.
- **"On this month" spotlight**, a **random-entry roulette** (with brick confetti 🧱), a
  light/dark theme toggle, and a deadpan "days since the last change" counter.

## Running locally

No build step, no framework, no backend — it's a static site. The page fetches
`databricks.json`, so it must be served over http (opening the file directly is blocked by
the browser):

```bash
python -m http.server 8777
```

Then open <http://localhost:8777/>.

## Layout

| File | What it is |
|------|------------|
| `databricks.json` | **The data. Source of truth.** An array of rename / deprecation / feature objects. |
| `index.html` | App shell: Databricks-style sidebar rail + content area. |
| `app.js` | Vanilla JS (single IIFE, no deps). Fetches the data, renders everything, wires search / filters / quiz / roulette / theme. |
| `styles.css` | All styling. CSS variables; light default, `data-theme="dark"` toggle. |
| `scripts/validate.py` | Schema / format gate for `databricks.json`. |
| `CONTRIBUTING.md` | The entry schema and field rules. |
| `AGENTS.md` | Guidance for AI agents (and humans) working in the repo. |

## Analytics & privacy

Visits are counted with [Umami](https://umami.is) — cookieless, no personal data, so no
consent banner is required. A few anonymous custom events (filter toggles, quiz opens,
searches, shares) help show what people use. LinkedIn share links carry
[UTM tags](https://docs.umami.is/docs/utm) so shared traffic is attributed. Everything is
guarded: if the analytics script is blocked or absent, the app behaves identically.

## Contributing

Spotted an error, an out-of-date name, or a change we're missing? Contributions welcome:
<https://github.com/aidatafab/rebricked>.

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
the console-style chrome is an homage. Every entry is sourced and dated, but — given the
subject — may already be out of date.
