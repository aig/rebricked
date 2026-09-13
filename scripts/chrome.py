"""Per-vendor console chrome for the generated pages.

Every generated page wears the console of the vendor it is about: that homage is the whole
visual premise of the site, and a Snowflake entry framed in a Databricks rail reads as a
mistake. The Databricks chrome is the app's own - `render_rail()` parses `NAV`/`ICONS` straight
out of `www/app.js`, so the rail on a static page can never drift from the rail in the SPA.
A vendor with no SPA has no such source, so its rail is declared here instead.

What a vendor rail owes the rest of the build:

- **`VENDOR_RAILS[v]`** is the parsed-or-declared nav, shaped like `load_rail()`'s NAV:
  `[(group label, [(item label, icon key, ids)])]`. `ids` is `None` for an item that just goes
  home and a (possibly empty) tuple of entry ids otherwise, so an inert section renders
  without a dot.
- **`validate.py` reads it** for the rail-coverage check, which is why this is a Python module
  and not markup buried in a template: every entry of a vendor that has a rail must be
  reachable from one of that rail's sections.

Links are written at the `../../` depth the other templates use, and `chrome_for()` rewrites
that prefix to the caller's own root - the same trick `build_entries.chrome()` has always used.
"""

import html
import re
from urllib.parse import quote

from build_badges import APP_JS, INLINE_JS, TOPBAR, _app_js_block, render_rail

# Snowsight draws its own icon set; these are the same 24x24 single-stroke shapes app.js uses
# for the Databricks rail, so both rails share `.ic`'s stroke style and optical weight.
SNOWFLAKE_ICONS = {
    "home": '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    "projects": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9.5 9.5 12 7 14.5M12 15h5"/>',
    "ingestion": '<path d="M12 3v10m0 0 4-4m-4 4-4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    "transformation": '<circle cx="6" cy="7" r="2.4"/><circle cx="18" cy="17" r="2.4"/><path d="M8.4 7H14a2 2 0 0 1 2 2v6M15.6 17H10a2 2 0 0 1-2-2V9"/>',
    "aiml": '<path d="m12 3 1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 16.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>',
    "monitoring": '<path d="M3 12h3.5l2-5.5 3 11 2.5-7 1.6 3.5H21"/>',
    "marketplace": '<path d="M4 9h16l-1-4H5z"/><path d="M4.5 9v10h15V9"/><path d="M9 19v-5h6v5"/>',
    "catalog": '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    "sharing": '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6.5" r="2.4"/><circle cx="18" cy="17.5" r="2.4"/><path d="m8.2 10.9 7.6-3.3M8.2 13.1l7.6 3.3"/>',
    "governance": '<path d="M12 3 5 6v5.5c0 4.3 3 8.2 7 9.5 4-1.3 7-5.2 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    "compute": '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    "admin": '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
}

# The Snowsight rail, in Snowsight's own order and wording. `ids` lists the entries that
# section covers; an empty tuple is an honest inert section (Snowsight has the item, we track
# nothing under it yet). Snowsight has no "developer tools" item - the console, the CLI and
# the worksheet surfaces are all where you work, so they sit under Projects.
SNOWFLAKE_NAV = [
    ("Work with data", [
        ("Projects", "projects", (
            "workspaces", "legacy-worksheets", "snowflake-notebooks", "cortex-code",
            "snowsight", "classic-console", "snowflake-cli", "snowsql",
        )),
        ("Ingestion", "ingestion", ("snowflake-openflow",)),
        ("Transformation", "transformation", ("dynamic-tables", "materialized-tables")),
        ("AI & ML", "aiml", ("cortex-agents", "cortex-analyst", "cortex-search")),
        ("Monitoring", "monitoring", ()),
        ("Marketplace", "marketplace", ()),
    ]),
    ("Horizon Catalog", [
        ("Catalog", "catalog", ("semantic-views", "backups", "worm-snapshots")),
        ("Data sharing", "sharing", ()),
        ("Governance & security", "governance", ("polaris-catalog", "snowflake-open-catalog")),
    ]),
    ("Manage", [
        ("Compute", "compute", ("generation-2-standard-warehouses",)),
        ("Admin", "admin", ()),
    ]),
]


def _databricks_nav():
    """The Databricks rail, in VENDOR_RAILS' shape, read from app.js.

    `load_rail()` returns a has_changes boolean rather than the ids themselves (that is all the
    rail rendering needs), so the ids come from a second pass over the same source. Kept here
    so validate.py has one shape to check every vendor's coverage against."""
    src = APP_JS.read_text(encoding="utf-8")
    nav_src = _app_js_block(src, "const NAV = [", "\n  ];")
    nav = []
    for g in re.finditer(r'\{ label: "([^"]*)", items: \[(.*?)\n    \]\}', nav_src, re.S):
        items = []
        for m in re.finditer(r'^\s*\{ label: "([^"]*)", icon: "(\w+)"(.*?)\},?$', g.group(2), re.M):
            label, icon, rest = m.groups()
            if "home: true" in rest or 'href: "' in rest:
                items.append((label, icon, None))
                continue
            ids = re.search(r"ids: \[(.*?)\]", rest)
            found = tuple(re.findall(r'"([^"]+)"', ids.group(1))) if ids else ()
            items.append((label, icon, found))
        nav.append((g.group(1), items))
    return nav


# Every vendor whose pages wear their own rail. A vendor absent from this map renders in the
# Databricks chrome, which is also the site's own shell - the honest default for a vendor
# nobody has styled yet, not a claim about that vendor.
VENDOR_RAILS = {"databricks": _databricks_nav(), "snowflake": SNOWFLAKE_NAV}


def rail_ids(vendor):
    """Every entry id the vendor's rail reaches, for validate.py's coverage check."""
    out = set()
    for _, items in VENDOR_RAILS.get(vendor, ()):
        for _, _, ids in items:
            out.update(ids or ())
    return out


def _sf_icon(key, size=18):
    return (
        f'<svg class="ic" viewBox="0 0 24 24" width="{size}" height="{size}">'
        f'{SNOWFLAKE_ICONS.get(key, "")}</svg>'
    )


def snowflake_rail(active=None):
    """Snowsight's rail: a light panel, the wordmark over a home/new/search trio, then the
    three groups Snowsight itself uses. A section with entries deep-links into the hub's own
    filter (`#s=<section>`), the way the Databricks rail deep-links into the app's (`?s=`)."""
    hub = "../../snowflake/"
    groups = []
    for label, items in SNOWFLAKE_NAV:
        parts = [f'<div class="nav-group-label">{html.escape(label)}</div>'] if label else []
        for it_label, icon, ids in items:
            if ids:
                href = f"{hub}#s={quote(it_label)}"
                cls = "nav-item is-renamed"
                dot = '<span class="renamed-dot"></span>'
            else:
                href, cls, dot = hub, "nav-item", ""
            current = ""
            if active and it_label == active:
                cls += " active"
                current = ' aria-current="page"'
            parts.append(
                f'<a class="{cls}" href="{href}"{current}><span class="ic-wrap">{_sf_icon(icon)}</span>'
                f'<span class="label">{html.escape(it_label)}</span>{dot}</a>'
            )
        groups.append("".join(parts))
    return (
        '<aside class="sidebar sf-rail" aria-label="Primary">'
        '<a class="side-brand" href="../../">'
        '<span class="brand-re">RE</span>'
        '<span class="brand-tail"><span class="brand-word">bricked</span>'
        '<span class="brand-edition">snowflake edition</span></span></a>'
        # Snowsight stacks three round tool buttons under the logo instead of a "New" pill.
        '<div class="sf-tools">'
        f'<a class="sf-tool is-on" href="{hub}" title="Snowflake hub" aria-label="Snowflake hub">{_sf_icon("home", 17)}</a>'
        f'<a class="sf-tool" href="../../" title="Everything REbricked tracks" aria-label="Everything REbricked tracks">{_sf_icon("plus", 17)}</a>'
        f'<a class="sf-tool" href="{hub}#search" title="Search Snowflake names" aria-label="Search Snowflake names">{_sf_icon("search", 17)}</a>'
        '</div>'
        f'<nav class="nav" aria-label="Snowflake navigation">{"".join(groups)}</nav>'
        '<div class="side-foot"><span class="dot-legend"><i class="renamed-dot"></i> '
        'tracked names - filter the hub</span></div>'
        '</aside>'
    )


# The topbar is shared; only the words that name a vendor change, so a Snowflake page never
# invites the reader to search for a Databricks name.
SNOWFLAKE_TOPBAR = TOPBAR.replace(
    'aria-label="Search old Databricks names"', 'aria-label="Search old Snowflake names"'
)


def chrome_for(vendor, root, active=None):
    """(rail, topbar, js) for `vendor`, with the `../../` link prefix rewritten to `root`."""
    if vendor == "snowflake":
        rail, topbar = snowflake_rail(active), SNOWFLAKE_TOPBAR
    else:
        rail, topbar = render_rail(active), TOPBAR
    return (
        rail.replace("../../", root),
        topbar.replace("../../", root),
        INLINE_JS.replace("../../", root),
    )
