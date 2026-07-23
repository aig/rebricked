#!/usr/bin/env python3
"""Static, crawlable pages per vendor and entry - the content SEO layer.

The app renders everything client-side from databricks.features.json, so to a crawler index.html is
an empty shell and the ?id= deep links are not distinct documents. This script emits real
HTML the crawlers can index:

  /{vendor}/            - a hub page listing every entry for that vendor, grouped by
                          category (a strong landing page; also guarantees no entry page
                          is orphaned).
  /{vendor}/{id}/       - one page per entry, with a unique <title>, description, canonical
                          URL, Open Graph/Twitter tags, JSON-LD, the full content, and
                          internal links to related entries.

The vendor segment future-proofs the URL scheme: today everything is `databricks`, but an
entry may carry a `vendor` field and new vendors slot in as new top-level namespaces
(/snowflake/..., /aws/...) with no structural change. It also (re)writes sitemap.xml and
feed.xml (an RSS 2.0 feed of every entry, newest tracked change first).

The visible chrome (sidebar rail + topbar) is reused verbatim from build_badges.py, with its
root-relative `../../` rewritten to match each page's depth.

Run:  python scripts/build_entries.py
"""

import html
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

# Reuse the exact app chrome + constants the badge pages use.
from build_badges import (
    BASE_URL,
    FAVICON,
    INLINE_JS,
    TOPBAR,
    render_rail,
)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "databricks.features.json"
SITEMAP = ROOT / "sitemap.xml"
FEED = ROOT / "feed.xml"
TOTAL_BADGES = 5

DEFAULT_VENDOR = "databricks"
VENDOR_LABEL = {"databricks": "Databricks"}

MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

REF_KINDS = {"official": "Official", "community": "Community", "internet": "Web"}


def esc(s):
    return html.escape(str(s if s is not None else ""))


def attr(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def fmt_date(s):
    """Mirror app.js fmtDate: 'YYYY-MM' -> 'Month YYYY'; anything else unchanged."""
    s = str(s or "").strip()
    m = re.match(r"^(\d{4})-(\d{1,2})$", s)
    if not m:
        return s
    idx = int(m.group(2)) - 1
    return f"{MONTHS[idx]} {m.group(1)}" if 0 <= idx < 12 else s


# Date fields are { date, link } objects (occasion also carries a `note`); a bare string is
# still accepted. These mirror app.js dateOf/linkOf/srcLink/dateLinkHTML.
def date_of(v):
    return str(v.get("date") or "") if isinstance(v, dict) else str(v or "")


def link_of(v):
    return str(v["link"]) if isinstance(v, dict) and v.get("link") else ""


def what_note(d):
    """`what` is a required { note, link } object; return just its note text.
    (Tolerates a legacy bare-string `what` so a half-migrated file still builds.)"""
    w = d.get("what")
    if isinstance(w, dict):
        return str(w.get("note") or "").strip()
    return str(w or "").strip()


def src_link(text, url, title=""):
    """Escaped text followed by a bare 🔗 anchor when a URL is given; plain text otherwise."""
    label = esc(text)
    if not url:
        return label
    aria = title or f"Source for {text}"
    tip = f' title="{attr(title)}"' if title else ""
    return (
        f'{label}<a class="date-src" href="{attr(url)}" target="_blank" rel="noopener"{tip} '
        f'aria-label="{attr(aria)}"><span class="date-src-mark" aria-hidden="true">🔗</span></a>'
    )


def date_link_html(v):
    """Formatted date rendered as a source-linked chip; plain '?' when the date is missing."""
    txt = fmt_date(date_of(v)) or "?"
    return src_link(txt, link_of(v), f"Source confirming {txt}")


def vendor_of(d):
    return d.get("vendor") or DEFAULT_VENDOR


def vendor_name(v):
    return VENDOR_LABEL.get(v, v.replace("-", " ").title())


def status_value(d):
    """`status` is a required { value, link, date } object; return its `value` string.
    Tolerates a legacy bare string so a half-migrated file still builds."""
    s = d.get("status")
    if isinstance(s, dict):
        return s.get("value") or ""
    return s if isinstance(s, str) else ""


def kind_of(d):
    # `status` is the sole discriminator (no `kind` field). "active" covers every live name;
    # whether it's a standalone feature or the current tip of a rename chain is calculated,
    # not stored - a feature has its own `introducedAt`, a rename tip carries `from`.
    s = status_value(d)
    if s in ("deprecated", "legacy", "retired"):
        return "deprecation"
    if s == "renamed":
        return "rename"
    return "feature" if d.get("introducedAt") else "rename"


def chrome(root):
    """The shared rail/topbar/js, with `../../` (their root-relative prefix) rewritten to
    `root` so the same chrome works at any directory depth."""
    return (
        render_rail().replace("../../", root),
        TOPBAR.replace("../../", root),
        INLINE_JS.replace("../../", root),
    )


def successors_of(d, by_id):
    """Walk successorId forward to the current tip; returns [next, ..., tip]."""
    out, seen, cur = [], {d["id"]}, d
    while cur and cur.get("successorId") and cur["successorId"] not in seen:
        nxt = by_id.get(cur["successorId"])
        if not nxt:
            break
        seen.add(nxt["id"])
        out.append(nxt)
        cur = nxt
    return out


def predecessors_of(d, data):
    """Everything that points here, walked back to the oldest name (oldest last)."""
    out, seen = [], {d["id"]}
    frontier = [x for x in data if x.get("successorId") == d["id"]]
    while frontier:
        nxt = []
        for p in frontier:
            if p["id"] in seen:
                continue
            seen.add(p["id"])
            out.append(p)
            nxt.extend(x for x in data if x.get("successorId") == p["id"])
        frontier = nxt
    return out


def status_word(d):
    s = status_value(d)
    return s if s in ("legacy", "retired") else "deprecated"


def rel_entry(from_vendor, other):
    """Relative link from an entry page (/{vendor}/{id}/) to another entry page."""
    ov = vendor_of(other)
    if ov == from_vendor:
        return f"../{attr(other['id'])}/"
    return f"../../{attr(ov)}/{attr(other['id'])}/"


def meta_for(d, by_id, data):
    """Return (title, description, kicker, lead) tuned to the entry's kind/status."""
    name = d["name"]
    cat = d.get("category", "")
    kind = kind_of(d)
    what = what_note(d)
    vlabel = vendor_name(vendor_of(d))

    if kind == "feature":
        when = fmt_date(date_of(d.get("introducedAt")))
        title = f"{name} - new in {vlabel}"
        lead = f"{name} is a {vlabel} {cat.lower()} capability" + (
            f", introduced {when}." if when else "."
        )
        kicker = "New feature"
    elif kind == "deprecation":
        word = status_word(d)
        succ = successors_of(d, by_id)
        repl = succ[-1]["name"] if succ else (d.get("replacement") or "")
        when = fmt_date(date_of(d.get("removedAt") or d.get("deprecatedAt")))
        verb = (
            "legacy since"
            if word == "legacy"
            else ("retired" if word == "retired" else "deprecated")
        )
        title = f"{name} is {word} in {vlabel}" + (f" - use {repl}" if repl else "")
        lead = (
            f"{name} is {word}"
            + (f", replaced by {repl}" if repl else "")
            + (f" ({verb} {when})." if when else ".")
        )
        kicker = word.capitalize()
    else:  # rename
        if status_value(d) == "renamed":
            succ = successors_of(d, by_id)
            current = succ[-1]["name"] if succ else None
            when = fmt_date(date_of(d.get("to")))
            if current:
                title = f"{name} is now {current} ({vlabel})"
                lead = f"{name} was renamed - {vlabel} now calls it {current}" + (
                    f", as of {when}." if when else "."
                )
            else:
                title = f"{name} - a former {vlabel} name"
                lead = f"{name} is a former {vlabel} name."
            kicker = "Renamed"
        else:
            preds = predecessors_of(d, data)
            former = preds[0]["name"] if preds else None
            when = fmt_date(date_of(d.get("from")))
            title = f"{name} ({vlabel})" + (f" - formerly {former}" if former else "")
            lead = (
                f"{name} is the current {vlabel} name"
                + (f", previously {former}" if former else "")
                + (f" (since {when})." if when else ".")
            )
            kicker = "Current name"

    title = f"{title} | REbricked"
    desc = (lead + " " + what).strip()
    if len(desc) > 300:
        desc = desc[:297].rstrip() + "…"
    return title, desc, kicker, lead


def lineage_html(d, by_id, data):
    """predecessors -> this -> successors, each other name linking to its own page."""
    v = vendor_of(d)
    preds = list(reversed(predecessors_of(d, data)))  # oldest first
    succs = successors_of(d, by_id)
    nodes = [f'<a href="{rel_entry(v, p)}">{esc(p["name"])}</a>' for p in preds]
    nodes.append(f'<strong aria-current="page">{esc(d["name"])}</strong>')
    nodes += [f'<a href="{rel_entry(v, s)}">{esc(s["name"])}</a>' for s in succs]
    if len(nodes) == 1:
        return ""
    return (
        '<p class="entry-lineage">'
        + ' <span class="arw" aria-hidden="true">&rarr;</span> '.join(nodes)
        + "</p>"
    )


def related_html(d, data):
    """Up to 5 other entries in the same category - internal links so no page is orphaned."""
    v = vendor_of(d)
    peers = [
        x
        for x in data
        if x.get("category") == d.get("category")
        and x["id"] != d["id"]
        and vendor_of(x) == v
    ]
    if not peers:
        return ""
    items = "".join(
        f'<li><a href="{rel_entry(v, p)}">{esc(p["name"])}</a></li>' for p in peers[:5]
    )
    return f'<section class="entry-related"><h2>Related in {esc(d.get("category",""))}</h2><ul>{items}</ul></section>'


def facts_html(d):
    rows = [("Category", esc(d.get("category", "")))]
    kind = kind_of(d)
    if d.get("abbr"):
        rows.append(("Abbreviation", esc(d["abbr"])))
    if kind == "feature" and d.get("introducedAt"):
        rows.append(("Introduced", date_link_html(d["introducedAt"])))
    if kind == "rename":
        if d.get("from"):
            rows.append(("In use from", date_link_html(d["from"])))
        if d.get("to"):
            rows.append(("Renamed", date_link_html(d["to"])))
    if kind == "deprecation":
        if d.get("deprecatedAt"):
            rows.append(("Deprecated", date_link_html(d["deprecatedAt"])))
        if d.get("removedAt"):
            rows.append(("Access ended", date_link_html(d["removedAt"])))
    if d.get("occasion"):
        occ = d["occasion"]
        occ_text = (occ.get("note") or "") if isinstance(occ, dict) else occ
        if occ_text:
            rows.append(("Announced at", src_link(occ_text, link_of(occ))))
    aliases = [a for a in (d.get("aliases") or []) if a]
    if aliases:
        rows.append(("Also known as", esc(", ".join(aliases))))
    if d.get("verified"):
        rows.append(("Verified", esc(fmt_date(d["verified"]))))
    body = "".join(
        f"<div class='fact-row'><dt>{k}</dt><dd>{v}</dd></div>" for k, v in rows if v
    )
    return f"<dl class='entry-facts'>{body}</dl>"


def sources_html(d):
    links = []
    if d.get("source"):
        links.append(
            {
                "url": d["source"],
                "kind": "official",
                "label": "Official Databricks / Microsoft docs",
            }
        )
    links += [l for l in (d.get("links") or []) if l.get("url")]
    if not links:
        return ""
    items = []
    for l in links:
        label = esc(l.get("label") or l["url"])
        k = REF_KINDS.get(l.get("kind"), "Source")
        items.append(
            f'<li><span class="src-kind src-{attr(l.get("kind","internet"))}">{esc(k)}</span> '
            f'<a href="{attr(l["url"])}" target="_blank" rel="noopener">{label}</a></li>'
        )
    return f'<section class="entry-sources"><h2>Sources</h2><ul>{"".join(items)}</ul></section>'


def fact_html(d):
    """`fact` is a required array of up to three { note, link } - sourced real-but-fun
    one-liners, each rendered as its own 💡 row with a link to its official source.
    (Tolerates a legacy bare string so a half-migrated file still builds.)"""
    facts = d.get("fact")
    if isinstance(facts, str):
        facts = [{"note": facts}] if facts.strip() else []
    if not isinstance(facts, list):
        return ""
    items = []
    for f in facts:
        if not isinstance(f, dict) or not f.get("note"):
            continue
        link = f.get("link") or ""
        src = f" {src_link('', link, 'Fun fact - source')}" if link else ""
        items.append(f'<li class="entry-fact-item">{esc(f["note"])}{src}</li>')
    if not items:
        return ""
    # A list; each item is bulleted with a 💡 marker (via CSS ::before).
    return '<ul class="entry-fact">' + "".join(items) + "</ul>"


def limitations_html(d):
    """Documented limitations, sourced: a single { note, link, date }. The date rides the
    source link's tooltip. No field -> nothing rendered (parity with app.js)."""
    lim = d.get("limitations")
    if not isinstance(lim, dict) or not lim.get("note"):
        return ""
    link = lim.get("link") or ""
    when = f"Limitations - official docs, checked {lim['date']}" if lim.get("date") else "Limitations - official docs"
    src = f" {src_link('', link, when)}" if link else ""
    return (
        f'<p class="entry-limitations"><span class="lim-icon" aria-hidden="true">&#9888;</span> '
        f'<span><span class="lim-label">Limitations:</span> {esc(lim["note"])}{src}</span></p>'
    )


# Release maturity (orthogonal to lifecycle status) - Databricks' own stages. `releases` is
# a stage timeline; the pill shows the LAST stage. A stage is reached (has a `date`) or only
# announced (`is_announced: true`, no date -> rendered "<Stage> soon", dashed). Entries with
# no `releases` show no pill.
RELEASE_LABELS = {
    "private-preview": "Private Preview",
    "beta": "Beta",
    "public-preview": "Public Preview",
    "ga": "GA",
}

# How each stage reads as a past-tense milestone in a feed item's description.
RELEASE_VERB = {
    "private-preview": "entered Private Preview",
    "beta": "entered Beta",
    "public-preview": "entered Public Preview",
    "ga": "reached general availability (GA)",
}


def release_pill(d):
    rels = d.get("releases")
    if not rels:
        return ""
    cur = rels[-1]  # last stage = current maturity
    label = RELEASE_LABELS.get(cur.get("type"))
    if not label:
        return ""
    announced = cur.get("is_announced") is True and cur.get("date") is None
    text = label + " soon" if announced else label
    hist = " -> ".join(f"{RELEASE_LABELS.get(r.get('type'), r.get('type'))} {r.get('date') or '(announced)'}" for r in rels)
    cls = f'badge-rel-{cur.get("type")}' + (" badge-rel-soon" if announced else "")
    return f' <span class="badge {attr(cls)} badge-release" title="{attr(hist)}">{esc(text)}</span>'


# The lifecycle badge shows the real `status` value. Each status maps to an existing
# color class (active reuses the green "current" look; renamed the slate "former" look).
STATUS_BADGE_CLASS = {
    "active": "badge-current",
    "renamed": "badge-former",
    "deprecated": "badge-deprecated",
    "legacy": "badge-legacy",
    "retired": "badge-retired",
}


def badge_html(d):
    s = status_value(d) or "active"
    # "active" is the default - don't render a status badge for it (release pill still shows).
    status_badge = "" if s == "active" else f'<span class="badge {STATUS_BADGE_CLASS.get(s, "badge-current")}">{esc(s)}</span>'
    return status_badge + release_pill(d)


def entry_jsonld(d, url, hub_url, title, desc):
    v = vendor_of(d)
    about_names = [d["name"]] + [a for a in (d.get("aliases") or []) if a]
    article = {
        "@type": "TechArticle",
        "@id": url + "#article",
        "headline": d["name"],
        "name": title.replace(" | REbricked", ""),
        "description": desc,
        "about": [{"@type": "Thing", "name": n} for n in about_names],
        "articleSection": d.get("category", ""),
        "inLanguage": "en",
        "url": url,
        "isPartOf": {"@id": f"{BASE_URL}/#website"},
        "publisher": {
            "@type": "Organization",
            "name": "REbricked",
            "url": f"{BASE_URL}/",
        },
    }
    if d.get("verified"):
        article["dateModified"] = d["verified"]
        article["datePublished"] = d["verified"]
    breadcrumb = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "REbricked",
                "item": f"{BASE_URL}/",
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": vendor_name(v),
                "item": hub_url,
            },
            {"@type": "ListItem", "position": 3, "name": d["name"], "item": url},
        ],
    }
    return json.dumps(
        {"@context": "https://schema.org", "@graph": [article, breadcrumb]},
        ensure_ascii=False,
        indent=2,
    )


ENTRY_STYLE = """  <style>
    .entry-doc, .hub-doc { max-width: 780px; margin: 0 auto; padding: 8px 4px 48px; }
    .entry-crumbs { font-size: 12px; color: var(--muted, #8a94a3); margin: 0 0 14px; }
    .entry-crumbs a { color: inherit; }
    .entry-kicker { text-transform: uppercase; letter-spacing: .12em; font-size: 11px; font-weight: 700; color: var(--muted, #8a94a3); }
    .entry-doc h1 { font-size: 30px; line-height: 1.15; margin: 6px 0 12px; }
    .entry-headrow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .entry-lead { font-size: 17px; line-height: 1.5; margin: 0 0 18px; }
    .entry-lineage { font-size: 14px; margin: 0 0 20px; padding: 10px 14px; background: var(--card, rgba(127,127,127,.06)); border-radius: 10px; }
    .entry-lineage .arw { opacity: .5; margin: 0 2px; }
    .entry-what { font-size: 15px; margin: 0 0 18px; }
    .entry-fact { font-size: 15px; margin: 0 0 18px; padding: 12px 14px; border-left: 3px solid var(--accent, #FF3621); background: var(--card, rgba(127,127,127,.06)); border-radius: 0 10px 10px 0; list-style: none; }
    .entry-fact-item { padding-left: 1.8em; }
    .entry-fact-item::before { content: "💡"; display: inline-block; width: 1.8em; margin-left: -1.8em; }
    .entry-fact-item + .entry-fact-item { margin-top: 8px; }
    .entry-limitations { font-size: 14px; color: var(--muted, #8a94a3); margin: 0 0 18px; display: flex; gap: 8px; align-items: baseline; }
    .entry-limitations .lim-icon { flex: none; color: var(--c-deprecated, #B45309); }
    .entry-limitations .lim-label { font-weight: 600; color: var(--c-deprecated-ink, #92430A); }
    .entry-facts { margin: 0 0 22px; border-top: 1px solid var(--rail-line, rgba(127,127,127,.2)); }
    .fact-row { display: grid; grid-template-columns: 180px 1fr; gap: 12px; padding: 9px 2px; border-bottom: 1px solid var(--rail-line, rgba(127,127,127,.2)); }
    .fact-row dt { color: var(--muted, #8a94a3); font-weight: 600; margin: 0; }
    .fact-row dd { margin: 0; }
    /* The date's confirmation mark: a quiet 🔗 that lifts on hover, never browser-blue. */
    .date-src { text-decoration: none; margin-left: 5px; opacity: .5; transition: opacity .15s; }
    .date-src:hover { opacity: 1; }
    .date-src-mark { font-size: 11px; }
    .entry-sources h2, .entry-related h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted, #8a94a3); margin: 0 0 10px; }
    .entry-sources ul { list-style: none; padding: 0; margin: 0 0 24px; }
    .entry-sources li { margin: 0 0 8px; font-size: 14px; }
    /* Content links carry the brand ink, not the default browser blue. */
    .entry-sources a, .entry-lineage a { color: var(--accent-ink, #C4260F); text-decoration: none; }
    .entry-sources a:hover, .entry-lineage a:hover { text-decoration: underline; }
    .src-kind { display: inline-block; min-width: 68px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--muted, #8a94a3); }
    /* Related peers read as rounded chips that light up in the accent on hover. */
    .entry-related ul { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-wrap: wrap; gap: 8px; }
    .entry-related li { margin: 0; }
    .entry-related a { display: inline-block; text-decoration: none; color: var(--ink, #11171C); border: 1px solid var(--line, #E2E6EB); border-radius: 999px; padding: 5px 13px; font-size: 13px; background: var(--panel, #fff); transition: border-color .15s, color .15s, background .15s; }
    .entry-related a:hover { border-color: var(--accent, #FF3621); color: var(--accent-ink, #C4260F); background: color-mix(in srgb, var(--accent) 6%, var(--panel, #fff)); }
    .entry-cta { display: inline-flex; align-items: center; gap: 8px; margin: 4px 0 26px; padding: 11px 18px; border-radius: 10px; background: var(--accent, #FF3621); color: #fff; font-weight: 700; text-decoration: none; transition: filter .15s, box-shadow .15s; }
    .entry-cta:hover { filter: brightness(1.05); box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 30%, transparent); }
    .hub-doc h1 { font-size: 30px; margin: 6px 0 10px; }
    .hub-lead { font-size: 16px; color: var(--muted, #8a94a3); margin: 0 0 26px; }
    .hub-cat { font-size: 13px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted, #8a94a3); margin: 26px 0 10px; }
    .hub-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 22px; }
    /* Each hub row: name + a color-coded lifecycle pill so the list scans by status. */
    .hub-item { display: flex; align-items: baseline; gap: 8px; padding: 3px 0; }
    .hub-link { text-decoration: none; color: var(--ink, #11171C); font-weight: 500; }
    .hub-link:hover { color: var(--accent-ink, #C4260F); text-decoration: underline; }
    .hub-badge { flex: none; font-family: var(--mono); font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 2px 8px; border-radius: 999px; white-space: nowrap; color: var(--c-legacy-ink); background: color-mix(in srgb, var(--c-legacy) 15%, transparent); }
    .hub-badge.s-active { color: var(--c-active-ink); background: color-mix(in srgb, var(--c-active) 15%, transparent); }
    .hub-badge.s-renamed { color: var(--c-renamed-ink); background: color-mix(in srgb, var(--c-renamed) 15%, transparent); }
    .hub-badge.s-deprecated { color: var(--c-deprecated-ink); background: color-mix(in srgb, var(--c-deprecated) 16%, transparent); }
    .hub-badge.s-legacy { color: var(--c-legacy-ink); background: color-mix(in srgb, var(--c-legacy) 15%, transparent); }
    .hub-badge.s-retired { color: var(--c-retired-fg); background: var(--c-deprecated); }
    @media (max-width: 560px) { .fact-row, .hub-list { grid-template-columns: 1fr; } .entry-doc h1, .hub-doc h1 { font-size: 24px; } }
  </style>"""

HEAD = """<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{url}" />
  <link rel="alternate" type="application/rss+xml" title="REbricked - Databricks renames, deprecations &amp; new features" href="/feed.xml" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:site_name" content="REbricked" />
  <meta property="og:title" content="{og_title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{base}/assets/social-preview.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="REbricked - a lookup for renamed and deprecated product names." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{og_title}" />
  <meta name="twitter:description" content="{desc}" />
  <meta name="twitter:image" content="{base}/assets/social-preview.png" />
  <script type="application/ld+json">
{jsonld}
  </script>
  <link rel="stylesheet" href="{root}styles.css" />
  <link rel="icon" href="/assets/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png" />
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
{style}
</head>
"""

ENTRY_BODY = """
<body>
  <div class="app">
    {rail}
    <div class="main">
      {topbar}
      <div class="content">
        <article class="entry-doc">
          <nav class="entry-crumbs" aria-label="Breadcrumb">
            <a href="{root}">REbricked</a> <span aria-hidden="true">/</span>
            <a href="{hub_rel}">{vendor}</a> <span aria-hidden="true">/</span> {category}
          </nav>
          <div class="entry-headrow">
            <span class="entry-kicker">{kicker}</span>
            {badge}
          </div>
          <h1>{name}{abbr}</h1>
          <p class="entry-lead">{lead}</p>
          {lineage}
          <p class="entry-what">{what}</p>
          {fact}
          {limitations}
          <a class="entry-cta" href="{root}?id={id}">Open in REbricked &rarr;</a>
          {facts}
          {sources}
          {related}
        </article>
        <footer class="footer" style="max-width:780px;margin:0 auto;">
          <p class="disclaimer">Not affiliated with {vendor}. Console chrome is an homage; every entry is sourced and dated.</p>
          <p class="disclaimer">Spotted an error or an out-of-date name?
            <a href="https://github.com/aig/rebricked" target="_blank" rel="noopener">Contribute a fix on GitHub &nearr;</a>.
          </p>
        </footer>
      </div>
    </div>
  </div>
  <div class="scrim" id="scrim" hidden></div>
  {js}
</body>

</html>
"""

HUB_BODY = """
<body>
  <div class="app">
    {rail}
    <div class="main">
      {topbar}
      <div class="content">
        <div class="hub-doc">
          <nav class="entry-crumbs" aria-label="Breadcrumb">
            <a href="{root}">REbricked</a> <span aria-hidden="true">/</span> {vendor}
          </nav>
          <h1>{vendor} product name changes</h1>
          <p class="hub-lead">Every {vendor} product and feature that's been renamed, deprecated, or newly shipped - sourced, dated, and linked. {count} entries.</p>
          {sections}
        </div>
        <footer class="footer" style="max-width:780px;margin:0 auto;">
          <p class="disclaimer">Not affiliated with {vendor}. Console chrome is an homage; every entry is sourced and dated.</p>
        </footer>
      </div>
    </div>
  </div>
  <div class="scrim" id="scrim" hidden></div>
  {js}
</body>

</html>
"""


def render_entry(d, by_id, data):
    v = vendor_of(d)
    url = f"{BASE_URL}/{v}/{d['id']}/"
    hub_url = f"{BASE_URL}/{v}/"
    root = "../../"  # /{vendor}/{id}/ is two levels deep
    hub_rel = "../"  # -> /{vendor}/
    title, desc, kicker, lead = meta_for(d, by_id, data)
    og_title = title.replace(" | REbricked", "")
    rail, topbar, js = chrome(root)
    head = HEAD.format(
        title=attr(title),
        desc=attr(desc),
        url=url,
        base=BASE_URL,
        og_type="article",
        og_title=attr(og_title),
        jsonld=entry_jsonld(d, url, hub_url, title, desc),
        root=root,
        favicon=FAVICON,
        style=ENTRY_STYLE,
    )
    body = ENTRY_BODY.format(
        rail=rail,
        topbar=topbar,
        js=js,
        root=root,
        hub_rel=hub_rel,
        vendor=esc(vendor_name(v)),
        category=esc(d.get("category", "")),
        kicker=esc(kicker),
        badge=badge_html(d),
        name=esc(d["name"]),
        abbr=(
            f' <span style="color:var(--muted,#8a94a3);font-weight:400">({esc(d["abbr"])})</span>'
            if d.get("abbr")
            else ""
        ),
        lead=esc(lead),
        lineage=lineage_html(d, by_id, data),
        what=esc(what_note(d)),
        fact=fact_html(d),
        limitations=limitations_html(d),
        id=attr(d["id"]),
        facts=facts_html(d),
        sources=sources_html(d),
        related=related_html(d, data),
    )
    return head + body


def render_hub(v, entries):
    url = f"{BASE_URL}/{v}/"
    root = "../"  # /{vendor}/ is one level deep
    vlabel = vendor_name(v)
    title = f"{vlabel} renamed, deprecated & new product names | REbricked"
    desc = (
        f"Every {vlabel} product and feature that's been renamed, deprecated, or newly shipped "
        f"- the full list, sourced and dated. {len(entries)} entries."
    )
    # Group by category, preserving first-seen order.
    cats = {}
    for d in entries:
        cats.setdefault(d.get("category", "Other"), []).append(d)
    sections = []
    item_list = []
    pos = 1
    for cat, items in cats.items():
        lis = []
        for d in items:
            status = badge_label(d)
            lis.append(
                f'<li class="hub-item"><a class="hub-link" href="{attr(d["id"])}/">{esc(d["name"])}</a>'
                f'<span class="hub-badge s-{attr(status)}">{esc(status)}</span></li>'
            )
            item_list.append(
                {
                    "@type": "ListItem",
                    "position": pos,
                    "name": d["name"],
                    "item": f"{BASE_URL}/{v}/{d['id']}/",
                }
            )
            pos += 1
        sections.append(
            f'<h2 class="hub-cat">{esc(cat)}</h2><ul class="hub-list">{"".join(lis)}</ul>'
        )

    jsonld = json.dumps(
        {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "CollectionPage",
                    "@id": url + "#page",
                    "url": url,
                    "name": title.replace(" | REbricked", ""),
                    "description": desc,
                    "inLanguage": "en",
                    "isPartOf": {"@id": f"{BASE_URL}/#website"},
                    "mainEntity": {
                        "@type": "ItemList",
                        "numberOfItems": len(entries),
                        "itemListElement": item_list,
                    },
                },
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "REbricked",
                            "item": f"{BASE_URL}/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": vlabel,
                            "item": url,
                        },
                    ],
                },
            ],
        },
        ensure_ascii=False,
        indent=2,
    )

    rail, topbar, js = chrome(root)
    head = HEAD.format(
        title=attr(title),
        desc=attr(desc),
        url=url,
        base=BASE_URL,
        og_type="website",
        og_title=attr(title.replace(" | REbricked", "")),
        jsonld=jsonld,
        root=root,
        favicon=FAVICON,
        style=ENTRY_STYLE,
    )
    body = HUB_BODY.format(
        rail=rail,
        topbar=topbar,
        js=js,
        root=root,
        vendor=esc(vlabel),
        count=len(entries),
        sections="".join(sections),
    )
    return head + body


def badge_label(d):
    # The compact hub-list label is just the real status value.
    return status_value(d) or "active"


def write_sitemap(data):
    urls = [(f"{BASE_URL}/", "weekly", "1.0")]
    urls.append((f"{BASE_URL}/subscribe/", "monthly", "0.5"))
    urls.append((f"{BASE_URL}/disclaimer/", "yearly", "0.3"))
    for n in range(TOTAL_BADGES + 1):
        urls.append((f"{BASE_URL}/badges/{n}-of-{TOTAL_BADGES}/", "yearly", "0.3"))
    vendors = []
    for d in data:
        v = vendor_of(d)
        if v not in vendors:
            vendors.append(v)
    for v in vendors:
        urls.append((f"{BASE_URL}/{v}/", "weekly", "0.9"))
    for d in data:
        urls.append((f"{BASE_URL}/{vendor_of(d)}/{d['id']}/", "monthly", "0.8"))
    body = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <changefreq>{cf}</changefreq>\n    <priority>{p}</priority>\n  </url>"
        for u, cf, p in urls
    )
    SITEMAP.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n</urlset>\n",
        encoding="utf-8",
    )
    return vendors


FEED_TITLE = "REbricked - Databricks renames, deprecations & new features"
FEED_DESC = (
    "Databricks product and feature renames, deprecations, new features, and "
    "release milestones (Private Preview through GA) - sourced and dated, newest first."
)
_WDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
_MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def parse_date(s):
    """'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' -> a UTC datetime (missing parts default to 1);
    None for anything unrecognised."""
    s = str(s or "").strip()
    m = re.match(r"^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$", s)
    if not m:
        return None
    y, mo, da = int(m.group(1)), int(m.group(2) or 1), int(m.group(3) or 1)
    if not (1 <= mo <= 12 and 1 <= da <= 31):
        return None
    try:
        return datetime(y, mo, da, tzinfo=timezone.utc)
    except ValueError:
        return None


def rfc822(dt):
    """RFC-822 date string, locale-independent (RSS pubDate format)."""
    return (
        f"{_WDAYS[dt.weekday()]}, {dt.day:02d} {_MONS[dt.month - 1]} {dt.year} "
        f"{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d} +0000"
    )


def feed_date(d):
    """The date a tracked change happened, by kind - the item's pubDate.
    Falls back through related dates, then to `verified`."""
    kind = kind_of(d)
    if kind == "feature":
        cands = [d.get("introducedAt"), d.get("from")]
    elif kind == "deprecation":
        cands = [d.get("removedAt"), d.get("deprecatedAt"), d.get("to")]
    elif status_value(d) == "renamed":
        cands = [d.get("to"), d.get("from")]
    else:  # current name of a rename chain
        cands = [d.get("from"), d.get("to")]
    cands.append(d.get("verified"))
    for c in cands:
        dt = parse_date(date_of(c))
        if dt:
            return dt
    return None


def release_feed_items(d):
    """One feed item per *dated* release stage (Private Preview -> ... -> GA).
    Announced-but-undated stages have no pubDate, so they are skipped. Yields
    (dt, sort_id, title, guid, is_permalink, description) tuples."""
    rels = d.get("releases")
    if not rels:
        return
    url = f"{BASE_URL}/{vendor_of(d)}/{d['id']}/"
    vlabel = vendor_name(vendor_of(d))
    what = what_note(d)
    for r in rels:
        rtype = r.get("type")
        label = RELEASE_LABELS.get(rtype)
        verb = RELEASE_VERB.get(rtype)
        dt = parse_date(date_of(r))
        if not label or not verb or dt is None:
            continue
        when = fmt_date(date_of(r))
        title = f"[{label}] {d['name']}"
        desc = f"{d['name']} {verb} in {vlabel}" + (f" - {when}." if when else ".")
        desc = (desc + " " + what).strip()
        if len(desc) > 300:
            desc = desc[:297].rstrip() + "…"
        # guid must be unique per item; the fragment distinguishes each stage and is
        # not a real page anchor, so isPermaLink is false.
        guid = f"{url}#release-{rtype}"
        yield (dt, f"{d['id']}#release-{rtype}", title, guid, False, desc)


def write_feed(data, by_id):
    """RSS 2.0 feed of every entry, newest tracked change first. Each entry contributes
    its primary lifecycle change plus one item per dated release-maturity milestone."""
    # Each item: (dt, sort_id, title, guid, is_permalink, description, category).
    items = []
    for d in data:
        cat = d.get("category", "")
        dt = feed_date(d)
        if dt is not None:
            url = f"{BASE_URL}/{vendor_of(d)}/{d['id']}/"
            _title, desc, kicker, _lead = meta_for(d, by_id, data)
            # meta_for's title carries a " | REbricked" suffix meant for <title>; the feed
            # prefixes the change kind instead, which reads better in a reader's item list.
            # "Current name" (the active tip of a rename chain) reads as "New name" in a feed.
            tag = "New name" if kicker == "Current name" else kicker
            items.append((dt, d["id"], f"[{tag}] {d['name']}", url, True, desc, cat))
        for rel in release_feed_items(d):
            items.append(rel + (cat,))
    # Newest first; stable tie-break on sort_id keeps output deterministic.
    items.sort(key=lambda t: (t[0], t[1]), reverse=True)

    built = rfc822(datetime.now(timezone.utc))
    body = []
    for dt, _sid, item_title, guid, is_permalink, desc, cat in items:
        link = guid.split("#", 1)[0]
        body.append(
            "    <item>\n"
            f"      <title>{esc(item_title)}</title>\n"
            f"      <link>{esc(link)}</link>\n"
            f'      <guid isPermaLink="{"true" if is_permalink else "false"}">{esc(guid)}</guid>\n'
            f"      <category>{esc(cat)}</category>\n"
            f"      <pubDate>{rfc822(dt)}</pubDate>\n"
            f"      <description>{esc(desc)}</description>\n"
            "    </item>"
        )

    FEED.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        f"    <title>{esc(FEED_TITLE)}</title>\n"
        f"    <link>{BASE_URL}/</link>\n"
        f"    <description>{esc(FEED_DESC)}</description>\n"
        "    <language>en</language>\n"
        f"    <lastBuildDate>{built}</lastBuildDate>\n"
        f'    <atom:link href="{BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n'
        f"{chr(10).join(body)}\n"
        "  </channel>\n"
        "</rss>\n",
        encoding="utf-8",
    )
    return len(items)


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {d["id"]: d for d in data}

    # Group entries by vendor; wipe and rebuild each vendor namespace dir.
    by_vendor = {}
    for d in data:
        by_vendor.setdefault(vendor_of(d), []).append(d)

    shutil.rmtree(
        ROOT / "e", ignore_errors=True
    )  # remove the pre-vendor layout, if present
    for v, entries in by_vendor.items():
        vdir = ROOT / v
        shutil.rmtree(vdir, ignore_errors=True)
        vdir.mkdir(parents=True)
        vdir.joinpath("index.html").write_text(render_hub(v, entries), encoding="utf-8")
        for d in entries:
            folder = vdir / d["id"]
            folder.mkdir(parents=True)
            folder.joinpath("index.html").write_text(
                render_entry(d, by_id, data), encoding="utf-8"
            )

    vendors = write_sitemap(data)
    feed_items = write_feed(data, by_id)
    total = len(data) + len(vendors) + TOTAL_BADGES + 2
    print(
        f"OK: wrote {len(data)} entry pages across {len(vendors)} vendor hub(s) "
        f"({', '.join(vendors)}); sitemap.xml has {total} URLs; "
        f"feed.xml has {feed_items} items."
    )


if __name__ == "__main__":
    main()
