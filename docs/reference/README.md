# Reference

Information-oriented. Look things up here; do not learn from here.

- **[entry-schema.md](entry-schema.md)** - every field of `kb/databricks/<id>.yaml`: type,
  when it is required, what the validator enforces.
- **[guide-schema.md](guide-schema.md)** - guide front matter and the supported Markdown subset.
- **[scripts.md](scripts.md)** - all eight scripts: what each reads, writes, and accepts as flags.
- **[generated-output.md](generated-output.md)** - every generated file and directory, which script
  owns it, whether it is tracked, and the published URL scheme.
- **[frontend.md](frontend.md)** - `app.js` contracts: `NAV`, the status filter, routing, the
  derived-versus-stored boundary.
- **[analytics-events.md](analytics-events.md)** - every tracked event name, where it fires, and the
  two places the snippet lives.

## Authority

Where these pages and the code disagree, **the code wins** and the page is a bug:

| Subject | Executable truth |
|---|---|
| entry fields | [`scripts/validate.py`](../../scripts/validate.py) |
| guide fields, Markdown subset | [`scripts/validate_posts.py`](../../scripts/validate_posts.py), [`scripts/build_posts.py`](../../scripts/build_posts.py) |
| id/filename agreement, JSON key order | [`scripts/build_features.py`](../../scripts/build_features.py) |
| URL scheme, page metadata | [`scripts/build_entries.py`](../../scripts/build_entries.py) |
| the rail, filters, routing | [`www/app.js`](../../www/app.js) |
| build order, what deploys | [`.github/workflows/static.yml`](../../.github/workflows/static.yml) |

[`CONTRIBUTING.md`](../../CONTRIBUTING.md) is the contributor-facing companion to
`entry-schema.md`: it carries the annotated YAML templates you copy from, while this section
carries the lookup tables.
