# How to preview and deploy

## Preview locally

```bash
python scripts/build_features.py && python scripts/build_posts.py && python scripts/build_entries.py
python -m http.server 8777 -d www
```

Open <http://localhost:8777/>.

Two things about that server command are not optional:

- **Serve over http, not `file://`.** The page fetches `databricks.features.json`, and browsers
  block that from a file URL.
- **`-d www` makes `www/` the web root**, which is exactly what GitHub Pages publishes. Serving the
  repo root instead makes every absolute path (`/learn/`, `/databricks/`, `/badges/`) wrong.

What each build step gets you:

| Command | Needed to see |
|---|---|
| `build_features.py` | anything at all - the app fetches its output |
| `build_posts.py` | `/learn/` and `/learn/<slug>/` |
| `build_entries.py` | `/databricks/`, `/databricks/<id>/`, `sitemap.xml`, `feed.xml` |
| `build_badges.py` | `/badges/<n>-of-5/` (already committed; only rerun if you changed them) |

## The pre-commit checklist

1. Build and validate - all four print `OK`:

   ```bash
   python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate.py && python scripts/validate_posts.py
   ```

2. If you touched entries or a guide, check the citations actually resolve. The schema gate never
   fetches:

   ```bash
   python scripts/check_anchors.py <the-ids-you-touched>
   ```

3. Preview it in a browser. The gates check shape, not whether the card reads correctly.

4. Confirm the diff is source only:

   ```bash
   git status --short
   ```

   It should show `kb/**` (and `kb/posts/<slug>/images/`, which *is* tracked), plus `app.js` if you
   edited `NAV`, plus `CHANGELOG.md`. Nothing under
   [reference/generated-output.md](../reference/generated-output.md).

5. Add the [`CHANGELOG.md`](../../CHANGELOG.md) entry, **why then what**. This is the step most
   often forgotten.

## Deployment

Deployment is [`.github/workflows/static.yml`](../../.github/workflows/static.yml) and there is
nothing to run by hand.

**Triggers:** push to `main`, pull request into `main`, or manual dispatch from the Actions tab.

**The `validate` job** runs on every trigger, including pull requests:

```
pip install pyyaml
build_features.py -> build_posts.py -> validate.py -> validate_posts.py
```

**The `deploy` job** runs only if `validate` passed **and** the event is not a pull request, so a PR
can never publish. It rebuilds everything, then runs `build_entries.py` and uploads **only `www/`**
as the Pages artifact. Repo docs, `scripts/`, `agents/`, `kb/`, and `reference/` are never deployed.

Concurrency is limited to one Pages deployment at a time, and in-progress deployments are never
cancelled.

**What CI does not do:** it never runs `check_anchors.py` (it needs the network and third-party
hosts rate-limit it) and never runs `build_badges.py` (it needs a browser). Both are local or
scheduled tasks - which is why `www/badges/` is the one generated directory committed to git.

## If a deploy goes out wrong

Every generated file is derived from `kb/`, so the fix is always the same: correct the YAML or
Markdown, push, and the next deploy regenerates everything. There is no build state to clear and no
cache to bust beyond the browser's.
