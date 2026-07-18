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

# Fields every entry needs, regardless of kind. `fact` is a real-but-fun one-liner
# about the feature — genuinely true, grounded in its history — so every entry carries one.
REQUIRED_COMMON = ("id", "category", "what", "fact", "source", "verified")
# Each name in a product's history is its own card, linked by `successorId`.
REQUIRED_RENAME = ("name", "state")
# A deprecation names the retired thing and when it was deprecated.
REQUIRED_DEPRECATION = ("name", "deprecatedAt", "status")
# A feature names a current, non-deprecated thing and when it landed.
REQUIRED_FEATURE = ("name", "introducedAt")

VALID_KINDS = ("rename", "deprecation", "feature")
# "legacy" = docs call it legacy/unsupported but no formal deprecation date exists.
VALID_STATUSES = ("deprecated", "retired", "legacy")
VALID_FEATURE_STATUSES = ("ga", "preview")
# A rename card is either the name in use now ("current") or a superseded one ("renamed").
VALID_RENAME_STATES = ("current", "renamed")
# Classified reference links: official docs, community (blogs/forums), or wider internet.
VALID_LINK_KINDS = ("official", "community", "internet")

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
        for date_field in ("from", "to", "deprecatedAt", "removedAt", "introducedAt"):
            v = entry.get(date_field)
            if v and not DATE_RE.match(str(v)):
                err(eid, f"{date_field} must be YYYY or YYYY-MM, got {v!r}")
        f, t = entry.get("from"), entry.get("to")
        if f and t and DATE_RE.match(str(f)) and DATE_RE.match(str(t)) and date_before(t, f):
            err(eid, f"to ({t}) is before from ({f})")
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
            for stray in ("lineage", "current", "renamedAt", "replacement"):
                if stray in entry:
                    warn(eid, f"feature has non-feature field {stray!r}; it will be ignored")

        # rename-specific rules: each name in a product's history is its own card
        if kind == "rename":
            state = entry.get("state")
            if state and state not in VALID_RENAME_STATES:
                err(eid, f"rename state must be one of {VALID_RENAME_STATES}, got {state!r}")
            # a superseded name points forward; the current name does not and is open-ended
            if state == "renamed":
                if not entry.get("successorId"):
                    err(eid, "a 'renamed' card needs a successorId (what it became)")
                if entry.get("to") in (None, ""):
                    err(eid, "a 'renamed' card needs a 'to' date (when it stopped being current)")
            if state == "current" and entry.get("to") not in (None, ""):
                err(eid, "a 'current' card must not have a 'to' date")
            for stray in ("lineage", "current", "renamedAt"):
                if stray in entry:
                    warn(eid, f"rename card has legacy field {stray!r}; it is no longer used")

        # aliases shape (optional field)
        if "aliases" in entry and not isinstance(entry["aliases"], list):
            err(eid, "aliases must be an array")

        # fact must be a non-empty string (the required-field check catches absence)
        if "fact" in entry and not (isinstance(entry["fact"], str) and entry["fact"].strip()):
            err(eid, "fact must be a non-empty string")

        # links (optional): extra classified references so claims are checkable.
        # `source` stays the canonical official link; these are additional.
        if "links" in entry:
            links = entry["links"]
            if not isinstance(links, list):
                err(eid, "links must be an array")
            else:
                for li in links:
                    if not isinstance(li, dict):
                        err(eid, "each link must be an object with url and kind")
                        continue
                    lurl = li.get("url")
                    if not (isinstance(lurl, str) and URL_RE.match(lurl)):
                        err(eid, f"link url must be an http(s) URL: {lurl!r}")
                    if li.get("kind") not in VALID_LINK_KINDS:
                        err(eid, f"link kind must be one of {VALID_LINK_KINDS}, got {li.get('kind')!r}")
                    if "label" in li and not isinstance(li["label"], str):
                        err(eid, "link label must be a string")

        # prediction (optional, clearly-fictional next names — funny alternatives that
        # power the "New" gag, the card's AI guesses, and the quiz's hardest distractors;
        # renames/features only, retired things don't get renamed)
        if "prediction" in entry:
            pred = entry["prediction"]
            if (not isinstance(pred, list) or not pred
                    or not all(isinstance(x, str) and x.strip() for x in pred)):
                err(eid, "prediction must be a non-empty array of non-empty strings when present")
            if kind == "deprecation":
                warn(eid, "deprecation has 'prediction'; retired things don't get renamed — it will be ignored")

    # cross-entry checks
    all_ids = {e.get("id") for e in data if isinstance(e, dict) and e.get("id")}
    for entry in data:
        if not isinstance(entry, dict):
            continue
        sid = entry.get("successorId")
        if sid and sid not in all_ids:
            err(entry.get("id", "?"), f"successorId {sid!r} does not match any entry id")
        if sid == entry.get("id"):
            err(entry.get("id", "?"), "successorId points at itself")

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
