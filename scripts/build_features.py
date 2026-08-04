#!/usr/bin/env python3
"""Assemble www/<vendor>.features.json from the per-entry YAML files in kb/<vendor>/.

kb/ is the source of truth. One file per entry, named <id>.yaml, so touching a single
entry is a single small diff instead of a hunk buried in a 2,500-line JSON array - and
`git log kb/databricks/delta-live-tables.yaml` is that entry's whole history.

The JSON the app fetches at runtime is build output (gitignored): CI regenerates it
before validating and before deploying, and you run this locally before previewing.
Order in the file is irrelevant to the app (app.js sorts everything client-side), so
entries are emitted sorted by id to keep the build deterministic.
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover - the one dependency, and only for the build
    sys.exit(
        "FATAL: PyYAML is required to build the feature data.\n"
        "       pip install pyyaml   (CI does this too; the site itself stays dependency-free)"
    )

ROOT = Path(__file__).resolve().parents[1]
KB = ROOT / "kb"
WWW = ROOT / "www"

# kb/ holds two kinds of collection, and only one of them is vendor data: kb/<vendor>/ is the
# per-entry YAML this script assembles, while kb/posts/ is the guides (Markdown, one folder per
# post) built by build_posts.py. Anything listed here is not a vendor and is skipped.
NON_VENDOR_DIRS = {"posts"}

# Canonical key order for the emitted JSON, so the built file never reshuffles just
# because a contributor wrote the YAML keys in a different order. Keys not listed here
# are appended (sorted) rather than dropped - validate.py is what rejects unknown fields.
KEY_ORDER = [
    "id",
    "name",
    "abbr",
    "aliases",
    "category",
    "vendor",
    "what",
    "fact",
    "status",
    "releases",
    "introducedAt",
    "from",
    "to",
    "deprecatedAt",
    "removedAt",
    "successorId",
    "replacement",
    "occasion",
    "limitations",
    "links",
    "prediction",
    "source",
    "verified",
]


def order_keys(entry):
    """Reorder one entry's top-level keys into KEY_ORDER; unknown keys go last, sorted."""
    known = [k for k in KEY_ORDER if k in entry]
    extra = sorted(k for k in entry if k not in KEY_ORDER)
    return {k: entry[k] for k in known + extra}


def load_entry(path, errors):
    """Parse one kb/<vendor>/<id>.yaml into an entry dict, appending any problems."""
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        errors.append(f"{path.relative_to(ROOT)}: not valid YAML: {e}")
        return None
    if not isinstance(raw, dict):
        errors.append(f"{path.relative_to(ROOT)}: must be a YAML mapping (one entry per file)")
        return None
    # The filename *is* the id - that is what makes an entry findable, and ids are permanent.
    if raw.get("id") != path.stem:
        errors.append(
            f"{path.relative_to(ROOT)}: id {raw.get('id')!r} does not match the filename "
            f"(expected id: {path.stem!r}, or rename the file)"
        )
        return None
    return order_keys(raw)


def build_vendor(vendor_dir):
    """Build one vendor's JSON. Returns (out_path, count, errors)."""
    vendor = vendor_dir.name
    out = WWW / f"{vendor}.features.json"
    errors = []

    paths = sorted(vendor_dir.glob("*.yaml"))
    stray = sorted(p.name for p in vendor_dir.glob("*.yml"))
    if stray:
        errors.append(f"kb/{vendor}: use the .yaml extension, not .yml: {', '.join(stray)}")
    if not paths:
        errors.append(f"kb/{vendor}: no *.yaml entries found")
        return out, 0, errors

    entries = [e for e in (load_entry(p, errors) for p in paths) if e is not None]
    if errors:
        return out, len(entries), errors

    # newline="\n" so the output is identical on Windows and Linux - CI builds it too.
    out.write_text(
        json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )
    return out, len(entries), errors


def main():
    ap = argparse.ArgumentParser(
        description="Assemble www/<vendor>.features.json from the per-entry YAML in kb/<vendor>/."
    )
    ap.add_argument(
        "--check",
        action="store_true",
        help="don't write; fail if the built JSON would differ from what's on disk",
    )
    args = ap.parse_args()

    vendor_dirs = (
        sorted(d for d in KB.iterdir() if d.is_dir() and d.name not in NON_VENDOR_DIRS)
        if KB.is_dir()
        else []
    )
    if not vendor_dirs:
        sys.exit(f"FATAL: no vendor folders under {KB.relative_to(ROOT)}/")

    failed = False
    for vendor_dir in vendor_dirs:
        if args.check:
            out = WWW / f"{vendor_dir.name}.features.json"
            errors = []
            entries = [
                e
                for e in (load_entry(p, errors) for p in sorted(vendor_dir.glob("*.yaml")))
                if e is not None
            ]
            want = json.dumps(entries, indent=2, ensure_ascii=False) + "\n"
            have = out.read_text(encoding="utf-8") if out.exists() else None
            if have != want:
                errors.append(
                    f"{out.relative_to(ROOT)} is stale - run: python scripts/build_features.py"
                )
            for e in errors:
                print(f"ERROR {e}")
            if errors:
                failed = True
            else:
                print(f"OK    {out.relative_to(ROOT)} matches kb/{vendor_dir.name}/")
            continue

        out, count, errors = build_vendor(vendor_dir)
        for e in errors:
            print(f"ERROR {e}")
        if errors:
            failed = True
        else:
            print(f"OK    {out.relative_to(ROOT)} <- {count} entries from kb/{vendor_dir.name}/")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
