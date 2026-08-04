#!/usr/bin/env python3
"""Schema/format gate for the guides in kb/posts/ - the prose sibling of validate.py.

validate.py gates the entries; this gates the guides. It reads the *source* Markdown (not the
built HTML) plus the built www/posts.json, so run the builds first:

    python scripts/build_features.py && python scripts/build_posts.py && python scripts/validate_posts.py

What it enforces, and why each rule exists:

* front matter present and complete - a guide with no `verified` date or no `sources` is exactly
  the confidently-wrong content the project exists to avoid
* slug matches the folder name - the folder name is the permanent URL
* every declared `entries` id and every `{{entry:id}}` in the body resolves against the built
  data - a guide must never link to a name the dataset does not have
* every source URL is a real-looking http(s) URL with a classified `kind`
* dates are sane: published <= updated, nothing in the future, `verified` present
* no em dashes anywhere (repo-wide convention; hyphens only)
* every referenced image file exists on disk

And one thing it only *warns* about: a guide past its `staleAfter` date. That is a review
signal, not a build failure - the page already says so to the reader, in amber.
"""

import datetime
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    sys.exit("FATAL: PyYAML is required. pip install pyyaml")

ROOT = Path(__file__).resolve().parents[1]
KB_POSTS = ROOT / "kb" / "posts"
DATA = ROOT / "www" / "databricks.features.json"

REQUIRED = ("slug", "title", "description", "kind", "category", "author", "published", "verified", "sources")
OPTIONAL = ("updated", "staleAfter", "tags", "entries", "sources", "readingMinutes")
KINDS = {"guide", "explainer", "opinion"}
LINK_KINDS = {"official", "community", "internet"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL_RE = re.compile(r"^https?://[^\s\"'<>]+$")

errors = []
warnings = []


def err(slug, msg):
    errors.append(f"{slug}: {msg}")


def warn(slug, msg):
    warnings.append(f"{slug}: {msg}")


def check_date(slug, field, value, today):
    s = str(value)
    if not DATE_RE.match(s):
        err(slug, f"{field} must be YYYY-MM-DD, got {s!r}")
        return None
    try:
        d = datetime.date.fromisoformat(s)
    except ValueError:
        err(slug, f"{field} is not a real date: {s!r}")
        return None
    if field != "staleAfter" and d > today:
        err(slug, f"{field} is in the future ({s})")
    return d


def main():
    if not DATA.exists():
        sys.exit(
            "FATAL: www/databricks.features.json is missing - run scripts/build_features.py first."
        )
    by_id = {d["id"] for d in json.loads(DATA.read_text(encoding="utf-8"))}
    today = datetime.date.today()

    if not KB_POSTS.is_dir():
        print("OK    no kb/posts/ yet - nothing to validate.")
        return

    folders = sorted(p for p in KB_POSTS.iterdir() if p.is_dir())
    seen_slugs = {}
    count = 0

    for folder in folders:
        slug = folder.name
        src = folder / "index.md"
        if not src.exists():
            err(slug, "no index.md in the post folder")
            continue
        text = src.read_text(encoding="utf-8")
        if not text.startswith("---"):
            err(slug, "must start with a '---' YAML front-matter block")
            continue
        end = text.find("\n---", 3)
        if end == -1:
            err(slug, "front-matter block is never closed with '---'")
            continue
        try:
            fm = yaml.safe_load(text[3:end])
        except yaml.YAMLError as e:
            err(slug, f"front matter is not valid YAML: {e}")
            continue
        if not isinstance(fm, dict):
            err(slug, "front matter must be a YAML mapping")
            continue
        body = text[end + 4 :]
        count += 1

        for k in REQUIRED:
            if not fm.get(k):
                err(slug, f"missing required front matter: {k}")

        if fm.get("slug") != slug:
            err(slug, f"slug {fm.get('slug')!r} does not match the folder name {slug!r}")
        if slug in seen_slugs:
            err(slug, "duplicate slug")
        seen_slugs[slug] = True
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", slug):
            err(slug, "slug must be lowercase kebab-case")

        if fm.get("kind") and fm["kind"] not in KINDS:
            err(slug, f"kind must be one of {sorted(KINDS)}, got {fm['kind']!r}")

        unknown = [k for k in fm if k not in set(REQUIRED) | set(OPTIONAL)]
        if unknown:
            err(slug, f"unknown front-matter field(s): {', '.join(sorted(unknown))}")

        # dates
        pub = check_date(slug, "published", fm.get("published", ""), today) if fm.get("published") else None
        upd = check_date(slug, "updated", fm["updated"], today) if fm.get("updated") else None
        if fm.get("verified"):
            check_date(slug, "verified", fm["verified"], today)
        if fm.get("staleAfter"):
            sa = check_date(slug, "staleAfter", fm["staleAfter"], today)
            if sa and sa < today:
                warn(slug, f"past its staleAfter date ({fm['staleAfter']}) - re-verify the claims")
        if pub and upd and upd < pub:
            err(slug, f"updated ({upd}) is before published ({pub})")

        # description: one tight sentence or two, not a paragraph
        desc = " ".join(str(fm.get("description") or "").split())
        if desc and len(desc) > 320:
            err(slug, f"description is {len(desc)} chars; keep it under 320")

        # sources
        srcs = fm.get("sources")
        if srcs is not None:
            if not isinstance(srcs, list) or not srcs:
                err(slug, "sources must be a non-empty array")
            else:
                for j, s in enumerate(srcs):
                    if not isinstance(s, dict):
                        err(slug, f"sources[{j}] must be a mapping")
                        continue
                    if not URL_RE.match(str(s.get("url", ""))):
                        err(slug, f"sources[{j}].url is not a valid http(s) URL: {s.get('url')!r}")
                    if s.get("kind") not in LINK_KINDS:
                        err(slug, f"sources[{j}].kind must be one of {sorted(LINK_KINDS)}")
                    if not s.get("label"):
                        err(slug, f"sources[{j}].label is required")

        # entry links, declared and inline
        for eid in fm.get("entries") or []:
            if eid not in by_id:
                err(slug, f"entries lists unknown entry id {eid!r}")
        for m in re.finditer(r"\{\{entry:([^}]+)\}\}", body):
            if m.group(1) not in by_id:
                err(slug, f"{{{{entry:{m.group(1)}}}}} is not a known entry id")

        # images referenced in the body must exist
        for m in re.finditer(r"!\[[^\]]*\]\(([^)\s]+)", body):
            rel = m.group(1)
            if rel.startswith("http"):
                continue
            if not (folder / rel).exists():
                err(slug, f"image not found: {rel}")
        # and every image needs alt text - a screenshot with no alt is a dead end
        for m in re.finditer(r"!\[([^\]]*)\]\(([^)\s]+)", body):
            if not m.group(1).strip():
                err(slug, f"image has empty alt text: {m.group(2)}")

        # repo-wide convention
        if "—" in text or "–" in text:
            err(slug, "contains an em/en dash - use hyphens")

        if not body.strip():
            err(slug, "body is empty")

        # unclosed ::: callout fences would silently swallow the rest of the article
        if body.count(":::") % 2 != 0:
            err(slug, "odd number of ':::' callout fences - one is unclosed")

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    if errors:
        print(f"\n{len(errors)} error(s) in {count} guide(s).")
        sys.exit(1)
    print(f"OK    {count} guide(s) in kb/posts/ validated" + (f", {len(warnings)} warning(s)." if warnings else "."))


if __name__ == "__main__":
    main()
