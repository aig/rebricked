#!/usr/bin/env python3
"""Validate databricks.features.json against the rebricked field rules.

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
DATA = ROOT / "databricks.features.json"
APP_JS = ROOT / "app.js"

DATE_RE = re.compile(r"^\d{4}(-(0[1-9]|1[0-2]))?$")  # YYYY or YYYY-MM (real months only)
VERIFIED_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")     # YYYY-MM-DD
URL_RE = re.compile(r"^https?://", re.IGNORECASE)

# Fields every entry needs. `fact` is a real-but-fun one-liner about the feature -
# genuinely true, grounded in its history - so every entry carries one. `status` is the
# sole discriminator (see below), so it is required on every card too.
REQUIRED_COMMON = ("id", "name", "category", "what", "fact", "source", "verified", "status")

# `status` is the SOLE discriminator - there is no separate `kind` field. Its value is
# limited to what is NOT derivable from the rest of the card:
DEPRECATION_STATUSES = ("deprecated", "retired", "legacy")  # a retired or replaced thing -
#   a human "a different thing took over" call, not derivable. "legacy" = docs call it
#   legacy/unsupported but no formal deprecation date exists.
LIVE_STATUS = "active"      # every name in use now - BOTH standalone features AND the
#   current tip of a rename chain. Which of the two a card is is NOT stored (it would be
#   redundant): it's calculated - a feature carries its own `introducedAt`; a rename tip
#   carries `from` (and has a `renamed` card pointing at it).
RENAMED_STATUS = "renamed"  # a superseded former name (needs `to` + `successorId`)
VALID_STATUSES = DEPRECATION_STATUSES + (LIVE_STATUS, RENAMED_STATUS)
# Release maturity is tracked SEPARATELY on the `release` axis below, so a thing can be
# e.g. legacy-but-Beta or active-but-Public-Preview.
# The MATURITY axis, orthogonal to status. Carried as `releases`: an ordered timeline of
# stages a thing passed through; the last is its current maturity. Each stage is either
# REACHED - {type, date} - or merely ANNOUNCED but not yet reached - {type, is_announced:
# true} (no date). The valid stage `type`s, in Databricks' own order:
#   private-preview -> beta -> public-preview -> ga
# (There is no "pre-ga"/"GA approaching soon" type: that is just GA announced-but-not-reached,
# i.e. {type: "ga", is_announced: true}.)
VALID_RELEASES = ("private-preview", "beta", "public-preview", "ga")
# Classified reference links: official docs, community (blogs/forums), or wider internet.
VALID_LINK_KINDS = ("official", "community", "internet")

# The category set the UI's chips are built from. A new category is allowed -
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


def name_slug(name):
    """The id convention: kebab-case slug of the entry's own name, with any
    parenthetical qualifier (version/abbreviation/disambiguator) dropped.
    'Unity Catalog Volumes' -> 'unity-catalog-volumes';
    'Attribute-based access control (ABAC)' -> 'attribute-based-access-control';
    'Databricks CLI (v0.205+)' -> 'databricks-cli'."""
    base = re.sub(r"\([^)]*\)", "", str(name))  # drop "(...)" qualifiers
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")


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
        return False  # same year, mixed precision - can't call it out of order
    return am < bm


def date_token(v):
    """Pull the date string out of a date field, whether it's the current { date, link }
    object shape (the date plus a URL confirming it) or a bare string (still tolerated
    for resilience). Returns the raw date token, or None."""
    return v.get("date") if isinstance(v, dict) else v


def status_group(s):
    """The lifecycle family a status belongs to. Returns "deprecation", "renamed",
    "active" (any live name), or None for an unknown status."""
    if s in DEPRECATION_STATUSES:
        return "deprecation"
    if s == RENAMED_STATUS:
        return "renamed"
    if s == LIVE_STATUS:
        return "active"
    return None

errors = []
warnings = []


def err(entry_id, msg):
    errors.append(f"[{entry_id}] {msg}")


def warn(entry_id, msg):
    warnings.append(f"[{entry_id}] {msg}")


def check_date_obj(eid, field, v):
    """A date field is now a { date, link } object - the date plus a URL confirming it
    (a bare string is still tolerated for resilience). Validate the confirmation link when
    present and return the extracted date token for the format/order checks."""
    if isinstance(v, dict):
        link = v.get("link")
        if link is not None and not (isinstance(link, str) and URL_RE.match(link)):
            err(eid, f"{field}.link must be an http(s) URL when present, got {link!r}")
        return v.get("date")
    return v


def main():
    try:
        raw = DATA.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"FATAL: {DATA} not found")
        return 1

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"FATAL: databricks.features.json is not valid JSON: {e}")
        return 1

    if not isinstance(data, list):
        print("FATAL: databricks.features.json must be a JSON array")
        return 1

    seen_ids = set()

    for i, entry in enumerate(data):
        eid = entry.get("id", f"index {i}") if isinstance(entry, dict) else f"index {i}"

        if not isinstance(entry, dict):
            err(eid, "entry is not an object")
            continue

        # `status` is the sole discriminator (no `kind` field). It decides both what the
        # card is and which extra fields are required.
        status = entry.get("status")
        if status is not None and status not in VALID_STATUSES:
            err(eid, f"status must be one of {VALID_STATUSES}, got {status!r}")
        grp = status_group(status)

        required = list(REQUIRED_COMMON)
        if grp == "deprecation":
            required.append("deprecatedAt")           # a retired thing: when it was deprecated
        # (An "active" card needs exactly one of introducedAt/from, and "renamed" needs
        # `to` + `successorId`; both enforced in the per-group blocks below.)
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
            # id follows the name: it is the name's slug (parentheticals dropped).
            # Existing ids are frozen - a rename adds a NEW card with the new name's
            # slug; it never mutates an id in place. New entries must conform.
            name = entry.get("name")
            if name:
                want = name_slug(name)
                if str(entry["id"]) != want:
                    err(eid, f"id must be the name slug {want!r} (from name {name!r}); "
                             "ids follow the name")

        # source must be a URL
        src = entry.get("source")
        if src and not URL_RE.match(str(src)):
            err(eid, f"source is not an http(s) URL: {src!r}")

        # category must come from the deliberate allow-list
        cat = entry.get("category")
        if cat and cat not in VALID_CATEGORIES:
            err(eid, f"category must be one of {VALID_CATEGORIES}, got {cat!r}")

        # release maturity (optional, any entry) - the axis orthogonal to lifecycle status.
        # `releases` is the stage timeline: each {type, date} is when the thing entered that
        # stage, in chronological order. The last entry is its current maturity.
        rels = entry.get("releases")
        if rels is not None:
            if not isinstance(rels, list) or not rels:
                err(eid, "releases must be a non-empty array when present")
            else:
                prev_date = None
                last_i = len(rels) - 1
                for i, r in enumerate(rels):
                    if not isinstance(r, dict):
                        err(eid, "each release must be an object {type, date} or {type, is_announced}")
                        continue
                    rtype, rdate, ann = r.get("type"), r.get("date"), r.get("is_announced")
                    if rtype not in VALID_RELEASES:
                        err(eid, f"release type must be one of {VALID_RELEASES}, got {rtype!r}")
                    # each stage now carries a URL confirming its date (optional)
                    rlink = r.get("link")
                    if rlink is not None and not (isinstance(rlink, str) and URL_RE.match(rlink)):
                        err(eid, f"release link must be an http(s) URL when present, got {rlink!r}")
                    if ann is not None:
                        # announced-but-not-yet-reached: no date, and only allowed as the last stage
                        if ann is not True:
                            err(eid, "is_announced must be true when present (else omit it and give a date)")
                        if rdate is not None:
                            err(eid, "a release stage has both date and is_announced - use one (date = reached, is_announced = announced only)")
                        if i != last_i:
                            err(eid, "only the last release stage may be is_announced (an announced-but-unreached stage can't precede a reached one)")
                    elif not (rdate and DATE_RE.match(str(rdate))):
                        err(eid, f"release date must be YYYY or YYYY-MM (or set is_announced: true if announced but not yet reached), got {rdate!r}")
                    elif prev_date and DATE_RE.match(str(prev_date)) and date_before(rdate, prev_date):
                        err(eid, f"releases must be in chronological order ({prev_date} then {rdate})")
                    if rdate and DATE_RE.match(str(rdate)):
                        prev_date = rdate

        # date formats (YYYY / YYYY-MM change dates; YYYY-MM-DD verified). Each of these is
        # now a { date, link } object - the date plus a URL confirming it; check_date_obj
        # validates the link and hands back the date token (a bare string is still accepted).
        for date_field in ("from", "to", "deprecatedAt", "removedAt", "introducedAt"):
            if date_field not in entry:
                continue
            tok = check_date_obj(eid, date_field, entry[date_field])
            if tok and not DATE_RE.match(str(tok)):
                err(eid, f"{date_field} must be YYYY or YYYY-MM, got {tok!r}")
        f, t = date_token(entry.get("from")), date_token(entry.get("to"))
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

        # deprecation-group rules (status deprecated / retired / legacy)
        if grp == "deprecation":
            dep_at, rem_at = date_token(entry.get("deprecatedAt")), date_token(entry.get("removedAt"))
            if dep_at and rem_at and DATE_RE.match(str(dep_at)) and DATE_RE.match(str(rem_at)):
                if date_before(rem_at, dep_at):
                    err(eid, f"removedAt ({rem_at}) is before deprecatedAt ({dep_at})")
            for stray in ("lineage", "renamedAt"):
                if stray in entry:
                    warn(eid, f"deprecation has rename-only field {stray!r}; it will be ignored")

        # live-name rules (status active): a card is a standalone feature XOR the current tip
        # of a rename chain, and which one it is is CALCULATED, not stored - a feature carries
        # its own `introducedAt`; a rename tip carries `from`. Exactly one must be present so
        # that distinction is unambiguous. A live name is open-ended, so it never has a `to`.
        if grp == "active":
            has_intro = bool(entry.get("introducedAt"))
            has_from = bool(entry.get("from"))
            if has_intro == has_from:
                err(eid, "an 'active' card needs exactly one of introducedAt (a standalone "
                         "feature) or from (the current name of a rename chain), not both/neither")
            if entry.get("to") not in (None, ""):
                err(eid, "an 'active' card must not have a 'to' date (it is open-ended)")
            for stray in ("lineage", "renamedAt"):
                if stray in entry:
                    warn(eid, f"active card has legacy field {stray!r}; it is no longer used")

        # renamed-name rules: a superseded former name points forward and is closed-ended.
        if grp == "renamed":
            if not entry.get("successorId"):
                err(eid, "a 'renamed' card needs a successorId (what it became)")
            if entry.get("to") in (None, ""):
                err(eid, "a 'renamed' card needs a 'to' date (when it stopped being current)")
            for stray in ("lineage", "renamedAt"):
                if stray in entry:
                    warn(eid, f"renamed card has legacy field {stray!r}; it is no longer used")

        # occasion (optional): a dated milestone { date, link, note } - e.g. the summit a
        # name debuted at - carrying its own confirmation link like the date fields do.
        occ = entry.get("occasion")
        if occ is not None:
            if not isinstance(occ, dict):
                err(eid, "occasion must be an object { date, link, note }")
            else:
                otok = check_date_obj(eid, "occasion", occ)
                if otok and not DATE_RE.match(str(otok)):
                    err(eid, f"occasion.date must be YYYY or YYYY-MM, got {otok!r}")
                if "note" in occ and not isinstance(occ.get("note"), str):
                    err(eid, "occasion.note must be a string")

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

        # prediction (optional, clearly-fictional next names - funny alternatives that
        # power the "New" gag, the card's AI guesses, and the quiz's hardest distractors;
        # renames/features only, retired things don't get renamed)
        if "prediction" in entry:
            pred = entry["prediction"]
            if (not isinstance(pred, list) or not pred
                    or not all(isinstance(x, str) and x.strip() for x in pred)):
                err(eid, "prediction must be a non-empty array of non-empty strings when present")
            if grp == "deprecation":
                warn(eid, "deprecation has 'prediction'; retired things don't get renamed - it will be ignored")

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
            err(missing, "NAV in app.js references an id that is not in databricks.features.json")
        for unreachable in sorted(all_ids - nav_ids):
            err(unreachable, "entry appears in no NAV section in app.js - unreachable from the rail")

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
