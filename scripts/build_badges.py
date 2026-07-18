#!/usr/bin/env python3
"""Generate a shareable badge page for every quiz result (0..5 correct of 5).

Each combination of right answers gets its own folder, badges/<n>-of-5/index.html,
holding a funny, self-deprecating "achievement" for how well you kept up with the
renaming. These pages are what the quiz's LinkedIn button shares: the link resolves
to a real page with Open Graph tags, so the badge shows up in the preview, and its
"Take the quiz" button carries the score back as a ?quiz= challenge.

The quiz asks a random 5 of the eligible entries, so the meaningful outcome is the
count of correct answers, not which specific ones — hence one page per score (0..5).

Run:  python scripts/build_badges.py
It rewrites badges/ from scratch, so it's safe to run any time.
"""
import html
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "badges"
TOTAL = 5

# score -> (emoji, badge name, deadpan blurb)
BADGES = {
    0: ("🛌", "Rip Van Rebrand",
        "You dozed off at Delta Lake and woke up in the Lakeflow era. Everything is Genie now. Everything."),
    1: ("🫥", "Still Says “DLT”",
        "One right. You've heard a rumor that things got renamed. You have not yet investigated the rumor."),
    2: ("🐌", "Two Keynotes Behind",
        "You know some names. Regrettably, not the current ones."),
    3: ("🧱", "Passably Rebricked",
        "A coin-flip's worth of keeping up — respectable, given the release cadence."),
    4: ("📜", "Release-Notes Regular",
        "You lurk in the changelog and it shows. One rename got you. It always will."),
    5: ("🏆", "Keeper of the Renames",
        "Flawless. You either work there or you need a hobby. Possibly both."),
}

FAVICON = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' "
           "viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧱</text></svg>")

PAGE = """<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — Rebricked badge ({n}/{total})</title>
  <meta name="description" content="{blurb}" />
  <meta property="og:title" content="Rebricked: {title} ({n}/{total})" />
  <meta property="og:description" content="{blurb}" />
  <meta property="og:type" content="website" />
  <link rel="stylesheet" href="../../styles.css" />
  <link rel="icon" href="{favicon}" />
</head>

<body>
  <main class="badge-page">
    <div class="badge-card badge-tier-{n}">
      <div class="badge-emoji" aria-hidden="true">{emoji}</div>
      <div class="badge-score">{n} / {total} correct</div>
      <h1 class="badge-name">{title}</h1>
      <p class="badge-blurb">{blurb}</p>
      <div class="badge-meter"><span style="--w:{pct}%"></span></div>
      <div class="badge-actions">
        <a class="badge-btn" href="../../?quiz={n}-{total}">Take the quiz &rarr;</a>
        <a class="badge-link" href="../../">Back to Rebricked</a>
      </div>
      <p class="badge-fine">A Rebricked achievement. Not affiliated with Databricks; entirely made up, like the roadmap.</p>
    </div>
  </main>
</body>

</html>
"""


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for n in range(TOTAL + 1):
        emoji, title, blurb = BADGES[n]
        vals = {
            "n": n,
            "total": TOTAL,
            "pct": round(n / TOTAL * 100),
            "emoji": emoji,
            "title": html.escape(title),
            "blurb": html.escape(blurb),
            "favicon": FAVICON,
        }
        folder = OUT / f"{n}-of-{TOTAL}"
        folder.mkdir(parents=True)
        (folder / "index.html").write_text(PAGE.format(**vals), encoding="utf-8")

    print(f"OK: wrote {TOTAL + 1} badge pages to {OUT.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
