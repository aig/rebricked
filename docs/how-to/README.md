# How-to guides

Task-oriented. Each page assumes you already know the repo (do the [tutorials](../tutorials/)
if not) and answers exactly one question: *how do I do this?*

## Content

- [Add a rename](add-a-rename.md) - Databricks gave the same thing a new name
- [Add a deprecation](add-a-deprecation.md) - it was retired or replaced by a *different* thing
- [Add a feature](add-a-feature.md) - a genuinely new capability
- [Insert a name into a rename chain](insert-a-name-in-a-rename-chain.md) - a middle or origin
  name you missed
- [Re-verify an existing entry](re-verify-an-entry.md) - the docs moved, a date was wrong, a
  quote went dead
- [Write a guide](write-a-guide.md) - the prose content type

## Plumbing

- [Add a sidebar section](add-a-sidebar-section.md) - the `NAV` rail
- [Add a category](add-a-category.md) - the closed allow-list, changed on purpose
- [Check that citations still resolve](check-citations.md) - `check_anchors.py`
- [Refresh the reference mirror](refresh-the-reference-mirror.md) - `fetch_reference.py`
- [Regenerate the badge pages](regenerate-badge-pages.md) - `build_badges.py`
- [Fix a failing build or gate](fix-a-failing-build.md) - the error messages, decoded
- [Preview and deploy](preview-and-deploy.md) - local server, CI, GitHub Pages

## The command you will type most

```bash
python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate.py && python scripts/validate_posts.py
```

Order matters and the validators read *built* output, so skipping a build validates a stale
file. Full rationale in [explanation/architecture.md](../explanation/architecture.md).
