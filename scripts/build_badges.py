#!/usr/bin/env python3
"""Generate a shareable badge page for every quiz result (0..5 correct of 5).

Each combination of right answers gets its own folder, badges/<n>-of-5/, holding:
  - index.html : the badge shown as a screen INSIDE the app chrome (sidebar rail +
                 top bar), with a funny "achievement" card and Open Graph tags
  - og.png     : a clean 1200x630 preview image (rendered from an inline card)

The page wraps the badge in a static snapshot of the app's rail/top bar so it looks
like a screen of Rebricked, and every rail item / the logo / search link back into the
real app. The quiz's LinkedIn button shares the folder URL; its OG tags (incl. og:image)
make the badge show in the preview, and "Take the quiz" carries the score back as ?quiz=.

The quiz asks a random 5 of the eligible entries, so the meaningful outcome is the
count of correct answers, not which specific ones - hence one page per score (0..5).

Keep the NAV/ICONS below roughly in sync with app.js - it's a static mirror of the rail.

Run:  python scripts/build_badges.py
Rewrites badges/ from scratch. Regenerating og.png needs a Chromium-based browser
(Edge or Chrome); the pages themselves are pure static files.
"""
import html
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "badges"
TOTAL = 5

# Absolute base URL of the deployed site - og:image / og:url must be absolute.
BASE_URL = "https://rebricked.org"

# score -> (emoji, badge name, deadpan blurb)
BADGES = {
    0: ("🛌", "Rip Van Rebrand",
        "You dozed off at Delta Lake and woke up in the Lakeflow era. Everything is Genie now. Everything."),
    1: ("🫥", "Still Says “DLT”",
        "One right. You've heard a rumor that things got renamed. You have not yet investigated the rumor."),
    2: ("🐌", "Two Keynotes Behind",
        "You know some names. Regrettably, not the current ones."),
    3: ("🧱", "Passably REbricked",
        "A coin-flip's worth of keeping up - respectable, given the release cadence."),
    4: ("📜", "Release-Notes Regular",
        "You lurk in the changelog and it shows. One rename got you. It always will."),
    5: ("🏆", "Keeper of the Renames",
        "Flawless. You either work there or you need a hobby. Possibly both."),
}

# One ascending tier ladder - the more you got right, the higher the metal.
# 0 Stone · 1 Bronze · 2 Silver · 3 Gold · 4 Platinum · 5 Diamond.
TIERS = {0: "#7C8792", 1: "#B87333", 2: "#98A0AC", 3: "#D6A419", 4: "#4CB7C9", 5: "#6E8BF5"}

# The Rebricked mark - the same stacked-brick logo used in the sidebar (index.html).
LOGO_PATHS = (
    "<path d=\"M2 11.2 16 4l14 7.2-3.1 1.6L16 7.2 5.1 12.8Z\" opacity=\".95\"/>"
    "<path d=\"M2 16 16 8.8 30 16l-3.1 1.6L16 12l-10.9 5.6Z\" opacity=\".8\"/>"
    "<path d=\"M2 20.8 16 13.6 30 20.8 16 28 2 20.8Zm3.1.1L16 26.4l10.9-5.5L16 16.8Z\" opacity=\".65\"/>"
)


def logo_svg(px):
    return f'<svg viewBox="0 0 32 32" width="{px}" height="{px}" aria-hidden="true"><g fill="#FF3621">{LOGO_PATHS}</g></svg>'


# Same mark as a favicon data URI (# must be %23 or it's read as a URL fragment).
FAVICON = (
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
    "<g fill='%23FF3621'>"
    "<path d='M2 11.2 16 4l14 7.2-3.1 1.6L16 7.2 5.1 12.8Z' opacity='.95'/>"
    "<path d='M2 16 16 8.8 30 16l-3.1 1.6L16 12l-10.9 5.6Z' opacity='.8'/>"
    "<path d='M2 20.8 16 13.6 30 20.8 16 28 2 20.8Zm3.1.1L16 26.4l10.9-5.5L16 16.8Z' opacity='.65'/>"
    "</g></svg>"
)

def badge_emblem(tier):
    """A stylized certification crest - a dark hexagon medallion with a ribbon,
    the brick mark, and 'REBRICKED CERTIFIED', ringed/accented in the tier colour."""
    return (
        '<svg class="emblem" viewBox="0 0 200 240" role="img" aria-label="REbricked Certified">'
        '<defs><linearGradient id="hexg" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#1B2230"/><stop offset="1" stop-color="#0E1116"/>'
        '</linearGradient></defs>'
        f'<path d="M74 150 H100 V236 L87 221 74 236 Z" fill="{tier}"/>'
        f'<path d="M126 150 H100 V236 L113 221 126 236 Z" fill="{tier}"/>'
        f'<path d="M100 14 167.5 53 167.5 131 100 170 32.5 131 32.5 53 Z" '
        f'fill="url(#hexg)" stroke="{tier}" stroke-width="5" stroke-linejoin="round"/>'
        f'<g transform="translate(77 28) scale(1.44)"><g fill="#FF3621">{LOGO_PATHS}</g></g>'
        '<text x="100" y="108" text-anchor="middle" fill="#EAECEF" '
        'font-family="Segoe UI, system-ui, sans-serif" font-size="15" font-weight="800" letter-spacing="2">REBRICKED</text>'
        f'<text x="100" y="127" text-anchor="middle" fill="{tier}" '
        'font-family="Segoe UI, system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="3">CERTIFIED</text>'
        '</svg>'
    )


def stars_html(n, filled=None):
    """Five stars, n filled. filled=None uses CSS classes (page); a hex uses inline
    colours (og card)."""
    out = []
    for i in range(5):
        on = i < n
        if filled is None:
            out.append(f'<span class="st{" on" if on else ""}">&#9733;</span>')
        else:
            out.append(f'<span style="color:{filled if on else "#D0D5DD"}">&#9733;</span>')
    return "".join(out)


def badge_card_html(n, title_e, blurb_e):
    """The achievement card - one source of truth shared by the badge page and the
    og.png, so the LinkedIn preview is the exact same card the visitor lands on."""
    return (
        f'<div class="badge-card badge-tier-{n}">'
        f'<div class="badge-emblem">{badge_emblem(TIERS[n])}</div>'
        f'<div class="badge-stars" role="img" aria-label="{n} out of {TOTAL} stars">{stars_html(n)}</div>'
        f'<div class="badge-score">{n} / {TOTAL} correct</div>'
        f'<h1 class="badge-name">{title_e}</h1>'
        f'<p class="badge-blurb">{blurb_e}</p>'
        '<div class="badge-actions">'
        f'<a class="badge-btn" href="../../?quiz={n}-{TOTAL}">Take the quiz &rarr;</a>'
        '</div>'
        '<p class="badge-fine">A REbricked achievement. Not affiliated with Databricks; '
        'entirely made up, like the roadmap.</p>'
        '</div>'
    )


# --- static mirror of the app rail (app.js NAV/ICONS) ---
ICONS = {
    "home": '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
    "learn": '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>',
    "workspace": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
    "recents": '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    "catalog": '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    "jobs": '<circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M6 8.3v1.7a3 3 0 0 0 3 3h.5M18 8.3v1.7a3 3 0 0 1-3 3h-.5M12 13v2.7"/>',
    "compute": '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    "discover": '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
    "marketplace": '<path d="M4 9h16l-1-4H5z"/><path d="M4.5 9v10h15V9"/><path d="M9 19v-5h6v5"/>',
    "sqlEditor": '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
    "queries": '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    "dashboards": '<rect x="3" y="3" width="7" height="9" rx="1.4"/><rect x="14" y="3" width="7" height="5" rx="1.4"/><rect x="14" y="12" width="7" height="9" rx="1.4"/><rect x="3" y="16" width="7" height="5" rx="1.4"/>',
    "genie": '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    "alerts": '<path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
    "history": '<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
    "warehouse": '<rect x="3" y="4.5" width="18" height="6.5" rx="1.4"/><rect x="3" y="13" width="18" height="6.5" rx="1.4"/><path d="M6.5 7.7h.01M6.5 16.2h.01"/>',
    "runs": '<path d="M6 4l13 8-13 8z"/>',
    "ingestion": '<path d="M12 3v10m0 0 4-4m-4 4-4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    "dataprep": '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    "playground": '<path d="M9 3l1.6 4.4L15 9l-4.4 1.6L9 15l-1.6-4.4L3 9l4.4-1.6z"/><path d="M17.5 13l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    "agents": '<rect x="5" y="8" width="14" height="10" rx="2.5"/><path d="M12 8V4.5M9 13h.01M15 13h.01"/><circle cx="12" cy="3.2" r="1.1"/>',
    "gateway": '<path d="M12 3 5 6v5c0 4.4 3 8 7 9 4-1 7-4.6 7-9V6z"/>',
    "experiments": '<path d="M9.5 3h5M10.5 3v5.5l-5.2 8.7A2 2 0 0 0 7 20h10a2 2 0 0 0 1.7-2.8L13.5 8.5V3"/><path d="M8 15h8"/>',
    "features": '<circle cx="7" cy="7" r="2.1"/><circle cx="17" cy="7" r="2.1"/><circle cx="7" cy="17" r="2.1"/><circle cx="17" cy="17" r="2.1"/>',
    "models": '<path d="M12 3 21 8v8l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    "serving": '<circle cx="12" cy="12" r="2.2"/><path d="M7.5 7.5a6.5 6.5 0 0 0 0 9M16.5 7.5a6.5 6.5 0 0 1 0 9M4.8 4.8a10 10 0 0 0 0 14.4M19.2 4.8a10 10 0 0 1 0 14.4"/>',
}

# (group label, [(item label, icon, has_changes)]) - has_changes gets the dot + a
# ?s= link into the app; the rest just link home.
NAV = [
    ("", [("Home", "home", None), ("Learn", "learn", False), ("Workspace", "workspace", True),
          ("Recents", "recents", False), ("Catalog", "catalog", True),
          ("Jobs & Pipelines", "jobs", True), ("Compute", "compute", True),
          ("Discover", "discover", False), ("Marketplace", "marketplace", False)]),
    ("SQL", [("SQL Editor", "sqlEditor", True), ("Queries", "queries", False),
             ("Dashboards", "dashboards", True), ("Genie Agents", "genie", True),
             ("Alerts", "alerts", True), ("Query History", "history", False),
             ("SQL Warehouses", "warehouse", True)]),
    ("Data Engineering", [("Runs", "runs", False), ("Data Ingestion", "ingestion", False),
                          ("Visual Data Prep", "dataprep", True)]),
    ("AI/ML", [("Playground", "playground", False), ("Agents", "agents", True),
               ("AI Gateway", "gateway", False), ("Experiments", "experiments", False),
               ("Features", "features", True), ("Models", "models", True),
               ("Serving", "serving", True)]),
]


def render_rail():
    groups = []
    for label, items in NAV:
        parts = []
        if label:
            parts.append(f'<div class="nav-group-label">{html.escape(label)}</div>')
        for it_label, icon, changed in items:
            svg = f'<svg class="ic" viewBox="0 0 24 24" width="18" height="18">{ICONS.get(icon, "")}</svg>'
            if changed is None:            # Home
                href = "../../"
                cls, dot = "nav-item", ""
            elif changed:                  # section with entries - dot + deep link
                href = "../../?s=" + quote(it_label)
                cls = "nav-item is-renamed"
                dot = '<span class="renamed-dot"></span>'
            else:                          # inert section - link home
                href = "../../"
                cls, dot = "nav-item", ""
            parts.append(
                f'<a class="{cls}" href="{href}"><span class="ic-wrap">{svg}</span>'
                f'<span class="label">{html.escape(it_label)}</span>{dot}</a>'
            )
        groups.append("".join(parts))
    return (
        '<aside class="sidebar" aria-label="Primary">'
        f'<a class="side-brand" href="../../"><span class="logo" aria-hidden="true">{logo_svg(26)}</span>'
        '<span class="brand-text"><span class="brand-name"><span class="brand-re">RE</span>bricked</span>'
        '<span class="brand-edition">latest edition</span></span></a>'
        '<a class="side-new" href="../../"><svg viewBox="0 0 24 24" width="18" height="18" class="ic">'
        '<path d="M12 5v14M5 12h14" /></svg><span>New</span></a>'
        f'<nav class="nav" aria-label="Databricks navigation">{"".join(groups)}</nav>'
        '<div class="side-foot"><span class="dot-legend"><i class="renamed-dot"></i> '
        'renamed or deprecated - open in the app</span></div>'
        '</aside>'
    )


TOPBAR = (
    '<header class="topbar">'
    '<button class="icon-btn menu-btn" id="menu-toggle" title="Open navigation" '
    'aria-label="Open navigation" aria-expanded="false">'
    '<svg viewBox="0 0 24 24" width="18" height="18" class="ic"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>'
    '<div class="topsearch"><svg viewBox="0 0 24 24" width="16" height="16" class="ic">'
    '<circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>'
    '<input type="text" id="search" class="search-input" placeholder="Search an old name - press Enter" '
    'aria-label="Search old Databricks names" autocomplete="off" spellcheck="false" />'
    '<kbd class="slash">/</kbd></div>'
    '<div class="topactions">'
    '<a class="quiz-cta" href="../../"><svg viewBox="0 0 24 24" width="16" height="16" class="ic">'
    '<path d="M9.2 9a2.8 2.8 0 1 1 3.9 2.6c-.9.4-1.6 1.1-1.6 2.1v.4" /><path d="M12 17.5h.01" /></svg>'
    '<span>Take the quiz</span></a>'
    '<button class="icon-btn" id="theme-toggle" title="Toggle light / dark" aria-label="Toggle theme">'
    '<svg viewBox="0 0 24 24" width="18" height="18" class="ic">'
    '<path d="M12 3a9 9 0 1 0 9 9c-4.97 0-9-4.03-9-9Z" /></svg></button>'
    '</div></header>'
)

# Small inline script so the chrome is alive: theme persistence, search -> app, mobile rail.
INLINE_JS = """<script>
(function () {
  try { var t = localStorage.getItem('rebricked-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  var tt = document.getElementById('theme-toggle');
  if (tt) tt.addEventListener('click', function () {
    var r = document.documentElement, c = r.dataset.theme || 'light', n = c === 'dark' ? 'light' : 'dark';
    r.dataset.theme = n; try { localStorage.setItem('rebricked-theme', n); } catch (e) {}
  });
  var s = document.getElementById('search');
  if (s) s.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var v = s.value.trim(); location.href = '../../' + (v ? ('?q=' + encodeURIComponent(v)) : ''); }
  });
  var mb = document.getElementById('menu-toggle'), sb = document.querySelector('.sidebar'), sc = document.getElementById('scrim');
  function setOpen(o) { if (sb) sb.classList.toggle('open', o); if (sc) sc.hidden = !o; if (mb) mb.setAttribute('aria-expanded', String(o)); }
  if (mb) mb.addEventListener('click', function () { setOpen(!(sb && sb.classList.contains('open'))); });
  if (sc) sc.addEventListener('click', function () { setOpen(false); });
})();
</script>"""

PAGE = """<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} - REbricked badge ({n}/{total})</title>
  <meta name="description" content="{blurb}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="REbricked Certified: {title} ({n}/{total})" />
  <meta property="og:description" content="{blurb}" />
  <meta property="og:url" content="{page_url}" />
  <meta property="og:image" content="{img_url}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="REbricked badge: {title}, {n} of {total} correct" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="{img_url}" />
  <link rel="stylesheet" href="../../styles.css" />
  <link rel="icon" href="{favicon}" />
</head>

<body>
  <div class="app">
    {rail}
    <div class="main">
      {topbar}
      <div class="content">
        <div class="badge-stage">
          {card}
        </div>
      </div>
    </div>
  </div>
  <div class="scrim" id="scrim" hidden></div>
  {js}
</body>

</html>
"""

# Source for the 1200x630 og:image. Rather than a bespoke design, it renders the EXACT
# same badge card the visitor lands on - same markup (badge_card_html) and the real
# styles.css - centered on the app background, so the LinkedIn preview matches the page.
OG_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link rel="stylesheet" href="{styles}" />
<style>
  html, body {{ margin: 0; width: 1200px; height: 630px; overflow: hidden; }}
  .og-canvas {{
    width: 1200px; height: 630px;
    display: flex; align-items: center; justify-content: center;
    background:
      radial-gradient(1100px 520px at 50% -10%, color-mix(in srgb, var(--accent) 11%, transparent), transparent),
      var(--bg);
  }}
  /* scale the 440px card up to fill the wide canvas, still pixel-identical to the page */
  .og-canvas .badge-card {{ transform: scale(1.15); }}
</style>
</head>
<body>
  <div class="og-canvas">{card}</div>
</body>
</html>
"""


def find_browser():
    for name in ("msedge", "chrome", "chromium", "google-chrome", "chromium-browser"):
        p = shutil.which(name)
        if p:
            return p
    pf = os.environ.get("ProgramFiles", r"C:\Program Files")
    pfx86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
    for base in (pfx86, pf):
        for rel in (r"Microsoft\Edge\Application\msedge.exe", r"Google\Chrome\Application\chrome.exe"):
            cand = Path(base) / rel
            if cand.exists():
                return str(cand)
    return None


def render_png(browser, html_path, png_path, profile_dir):
    cmd = [
        browser, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--force-device-scale-factor=1",
        "--no-first-run", "--no-default-browser-check",
        f"--user-data-dir={profile_dir}",
        "--window-size=1200,630",
        f"--screenshot={png_path}",
        Path(html_path).as_uri(),
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
    except (subprocess.SubprocessError, OSError):
        return False
    return Path(png_path).exists()


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    rail = render_rail()
    browser = find_browser()
    if not browser:
        print("WARNING: no Chromium-based browser found - og.png images will NOT be "
              "regenerated. Pages still reference og.png; install Edge/Chrome and re-run.")

    styles_uri = (ROOT / "styles.css").as_uri()
    made_images = 0
    with tempfile.TemporaryDirectory() as tmp:
        for n in range(TOTAL + 1):
            _emoji, title, blurb = BADGES[n]
            title_e = html.escape(title)
            blurb_e = html.escape(blurb)
            folder = OUT / f"{n}-of-{TOTAL}"
            folder.mkdir(parents=True)
            page_url = f"{BASE_URL}/badges/{n}-of-{TOTAL}/"
            card = badge_card_html(n, title_e, blurb_e)

            folder.joinpath("index.html").write_text(PAGE.format(
                n=n, total=TOTAL, pct=round(n / TOTAL * 100),
                card=card, title=title_e, blurb=blurb_e,
                favicon=FAVICON, rail=rail, topbar=TOPBAR, js=INLINE_JS,
                page_url=page_url, img_url=page_url + "og.png",
            ), encoding="utf-8")

            if browser:
                src = Path(tmp) / f"og-{n}.html"
                src.write_text(OG_PAGE.format(styles=styles_uri, card=card), encoding="utf-8")
                if render_png(browser, src, folder / "og.png", Path(tmp) / f"prof-{n}"):
                    made_images += 1

    print(f"OK: wrote {TOTAL + 1} badge pages to {OUT.relative_to(ROOT)}/"
          f" ({made_images} og.png image(s) rendered).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
