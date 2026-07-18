#!/usr/bin/env python3
"""Validate databricks.json against the rebricked field rules.

The one unforgivable bug is being confidently wrong. This gate keeps a
malformed or unsourced entry from ever reaching GitHub Pages.

Run locally:  python scripts/validate.py
"""
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "databricks.json"
APP_JS = ROOT / "app.js"

DATE_RE = re.compile(r"^\d{4}(-(0[1-9]|1[0-2]))?$")  # YYYY or YYYY-MM (real months only)
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
# "legacy" = docs call it legacy/unsupported but no formal deprecation date exists.
VALID_STATUSES = ("deprecated", "retired", "legacy")
VALID_FEATURE_STATUSES = ("ga", "preview")

# The category set the UI's chips are built from. A new category is allowed —
# add it here deliberately rather than by typo.
VALID_CATEGORIES = (
    "Data engineering",
    "Compute / BI",
    "Developer experience",
    "Data governance",
    "BI / Dashboards",
    "AI / BI",
    "AI / ML",
)


def ym(date_str):
    """'2024' -> (2024, None); '2024-03' -> (2024, 3). Assumes DATE_RE matched."""
    parts = str(date_str).split("-")
    return int(parts[0]), (int(parts[1]) if len(parts) > 1 else None)


def date_before(a, b):
    """True when date a is strictly before date b, at the precision both share."""
    ay, am = ym(a)
    by, bm = ym(b)
    if ay != by:
        return ay < by
    if am is None or bm is None:
        return False  # same year, mixed precision — can't call it out of order
    return am < bm

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

        # category must come from the deliberate allow-list
        cat = entry.get("category")
        if cat and cat not in VALID_CATEGORIES:
            err(eid, f"category must be one of {VALID_CATEGORIES}, got {cat!r}")

        # date formats (YYYY / YYYY-MM change dates; YYYY-MM-DD verified)
        for date_field in ("renamedAt", "deprecatedAt", "removedAt", "introducedAt"):
            v = entry.get(date_field)
            if v and not DATE_RE.match(str(v)):
                err(eid, f"{date_field} must be YYYY or YYYY-MM, got {v!r}")
        verified = entry.get("verified")
        if verified:
            if not VERIFIED_RE.match(str(verified)):
                err(eid, f"verified must be YYYY-MM-DD, got {verified!r}")
            else:
                try:
                    if datetime.date.fromisoformat(str(verified)) > datetime.date.today():
                        err(eid, f"verified date {verified!r} is in the future")
                except ValueError:
                    err(eid, f"verified is not a real date: {verified!r}")

        # deprecation-specific rules
        if kind == "deprecation":
            status = entry.get("status")
            if status and status not in VALID_STATUSES:
                err(eid, f"status must be one of {VALID_STATUSES}, got {status!r}")
            dep_at, rem_at = entry.get("deprecatedAt"), entry.get("removedAt")
            if dep_at and rem_at and DATE_RE.match(str(dep_at)) and DATE_RE.match(str(rem_at)):
                if date_before(rem_at, dep_at):
                    err(eid, f"removedAt ({rem_at}) is before deprecatedAt ({dep_at})")
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
                f, t = step.get("from"), step.get("to")
                if f and t and DATE_RE.match(str(f)) and DATE_RE.match(str(t)) and date_before(t, f):
                    err(eid, f"lineage step {step.get('name')!r}: to ({t}) is before from ({f})")
            # steps must be chronological: a step can't start before the previous one ended
            for prev, nxt in zip(lineage, lineage[1:]):
                if not (isinstance(prev, dict) and isinstance(nxt, dict)):
                    continue
                p_to, n_from = prev.get("to"), nxt.get("from")
                if p_to and n_from and DATE_RE.match(str(p_to)) and DATE_RE.match(str(n_from)):
                    if date_before(n_from, p_to):
                        err(eid, f"lineage out of order: {nxt.get('name')!r} starts ({n_from}) before {prev.get('name')!r} ends ({p_to})")

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

        # prediction (optional, clearly-fictional next name — powers the "New" gag
        # and the odds badge; renames/features only, retired things don't get renamed)
        if "prediction" in entry:
            pred = entry["prediction"]
            if not isinstance(pred, str) or not pred.strip():
                err(eid, "prediction must be a non-empty string when present")
            if kind == "deprecation":
                warn(eid, "deprecation has 'prediction'; retired things don't get renamed — it will be ignored")

    # cross-entry checks
    all_ids = {e.get("id") for e in data if isinstance(e, dict) and e.get("id")}
    for entry in data:
        if not isinstance(entry, dict):
            continue
        rid = entry.get("replacementId")
        if rid and rid not in all_ids:
            err(entry.get("id", "?"), f"replacementId {rid!r} does not match any entry id")

    # NAV coverage: every entry must be reachable from a rail section, and every id
    # the rail references must exist. app.js is the source of the NAV config.
    try:
        app_js = APP_JS.read_text(encoding="utf-8")
    except OSError:
        warn("nav", f"could not read {APP_JS}; skipping NAV coverage check")
    else:
        nav_ids = set()
        for group in re.findall(r"ids:\s*\[([^\]]*)\]", app_js):
            nav_ids.update(re.findall(r"\"([a-z0-9-]+)\"", group))
        for missing in sorted(nav_ids - all_ids):
            err(missing, "NAV in app.js references an id that is not in databricks.json")
        for unreachable in sorted(all_ids - nav_ids):
            err(unreachable, "entry appears in no NAV section in app.js — unreachable from the rail")

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
