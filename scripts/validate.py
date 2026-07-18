#!/usr/bin/env python3
"""Validate databricks.json against the rebricked field rules.

The one unforgivable bug is being confidently wrong. This gate keeps a
malformed or unsourced entry from ever reaching GitHub Pages.

Run locally:  python scripts/validate.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "databricks.json"

DATE_RE = re.compile(r"^\d{4}(-\d{2})?$")            # YYYY or YYYY-MM
VERIFIED_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")     # YYYY-MM-DD
URL_RE = re.compile(r"^https?://", re.IGNORECASE)

# Fields every entry needs, regardless of kind.
REQUIRED_COMMON = ("id", "category", "what", "source", "verified")
# A rename tells a lineage story ending in the current name.
REQUIRED_RENAME = ("current", "lineage", "renamedAt")
# A deprecation names the retired thing and when it was deprecated.
REQUIRED_DEPRECATION = ("name", "deprecatedAt", "status")
# A feature names a current, non-deprecated thing and when it landed.
REQUIRED_FEATURE = ("name", "introducedAt")

VALID_KINDS = ("rename", "deprecation", "feature")
VALID_STATUSES = ("deprecated", "retired")
VALID_FEATURE_STATUSES = ("ga", "preview")

errors = []
warnings = []


def err(entry_id, msg):
    errors.append(f"[{entry_id}] {msg}")


def warn(entry_id, msg):
    warnings.append(f"[{entry_id}] {msg}")


def main():
    try:
        raw = DATA.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"FATAL: {DATA} not found")
        return 1

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"FATAL: databricks.json is not valid JSON: {e}")
        return 1

    if not isinstance(data, list):
        print("FATAL: databricks.json must be a JSON array")
        return 1

    seen_ids = set()

    for i, entry in enumerate(data):
        eid = entry.get("id", f"index {i}") if isinstance(entry, dict) else f"index {i}"

        if not isinstance(entry, dict):
            err(eid, "entry is not an object")
            continue

        # kind decides which fields are required. Default (absent) is a rename.
        kind = entry.get("kind", "rename")
        if kind not in VALID_KINDS:
            err(eid, f"kind must be one of {VALID_KINDS}, got {kind!r}")
            kind = "rename"  # validate the rest against the safest shape

        per_kind = {
            "deprecation": REQUIRED_DEPRECATION,
            "feature": REQUIRED_FEATURE,
        }.get(kind, REQUIRED_RENAME)
        required = REQUIRED_COMMON + per_kind
        for field in required:
            if field not in entry or entry[field] in (None, "", []):
                err(eid, f"missing required field: {field}")

        # id uniqueness + shape
        if "id" in entry:
            if entry["id"] in seen_ids:
                err(eid, "duplicate id")
            seen_ids.add(entry["id"])
            if not re.match(r"^[a-z0-9-]+$", str(entry["id"])):
                err(eid, "id must be kebab-case [a-z0-9-]")

        # source must be a URL
        src = entry.get("source")
        if src and not URL_RE.match(str(src)):
            err(eid, f"source is not an http(s) URL: {src!r}")

        # date formats (YYYY / YYYY-MM change dates; YYYY-MM-DD verified)
        for date_field in ("renamedAt", "deprecatedAt", "removedAt", "introducedAt"):
            v = entry.get(date_field)
            if v and not DATE_RE.match(str(v)):
                err(eid, f"{date_field} must be YYYY or YYYY-MM, got {v!r}")
        if "verified" in entry and entry["verified"] and not VERIFIED_RE.match(str(entry["verified"])):
            err(eid, f"verified must be YYYY-MM-DD, got {entry['verified']!r}")

        # deprecation-specific rules
        if kind == "deprecation":
            status = entry.get("status")
            if status and status not in VALID_STATUSES:
                err(eid, f"status must be one of {VALID_STATUSES}, got {status!r}")
            for stray in ("lineage", "current", "renamedAt"):
                if stray in entry:
                    warn(eid, f"deprecation has rename-only field {stray!r}; it will be ignored")

        # feature-specific rules
        if kind == "feature":
            status = entry.get("status")
            if status and status not in VALID_FEATURE_STATUSES:
                err(eid, f"feature status must be one of {VALID_FEATURE_STATUSES}, got {status!r}")
            for stray in ("lineage", "current", "renamedAt", "deprecatedAt", "removedAt", "replacement"):
                if stray in entry:
                    warn(eid, f"feature has non-feature field {stray!r}; it will be ignored")

        # lineage rules (renames only)
        lineage = entry.get("lineage")
        if isinstance(lineage, list) and lineage:
            for step in lineage:
                if not isinstance(step, dict) or not step.get("name"):
                    err(eid, "each lineage step needs a name")
                    continue
                for k in ("from", "to"):
                    v = step.get(k)
                    if v not in (None,) and v != "" and not DATE_RE.match(str(v)):
                        err(eid, f"lineage {k} must be YYYY/YYYY-MM or null, got {v!r}")

            last = lineage[-1]
            if isinstance(last, dict):
                if last.get("to") is not None:
                    err(eid, "the last lineage step must have \"to\": null")
                if last.get("name") != entry.get("current"):
                    err(eid, f"current ({entry.get('current')!r}) must equal the last lineage name ({last.get('name')!r})")
            # only the last step may be open-ended
            for step in lineage[:-1]:
                if isinstance(step, dict) and step.get("to") is None:
                    err(eid, f"non-final lineage step {step.get('name')!r} must have a \"to\" date")
        elif "lineage" in entry:
            err(eid, "lineage must be a non-empty array")

        # aliases shape (optional field)
        if "aliases" in entry and not isinstance(entry["aliases"], list):
            err(eid, "aliases must be an array")

    # report
    for w in warnings:
        print(f"warning: {w}")
    if errors:
        print()
        for e in errors:
            print(f"error: {e}")
        print(f"\n{len(errors)} error(s) in {len(data)} entr{'y' if len(data)==1 else 'ies'}. Not publishing.")
        return 1

    print(f"OK: {len(data)} entr{'y' if len(data)==1 else 'ies'} valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
