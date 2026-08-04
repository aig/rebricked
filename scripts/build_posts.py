#!/usr/bin/env python3
"""Build the Guides layer: kb/posts/<slug>/ -> www/learn/ + www/learn/<slug>/ + www/posts.json.

Guides are the repo's second content type. Entries (kb/<vendor>/<id>.yaml) record what a name
did; a guide argues about what to do, which entries are not allowed to do. Same discipline
either way - every fact carries an official link and a `verified` date - so guides live in kb/
beside the data and build into www/ as untracked output.

One folder per post, because a post has assets:

    kb/posts/<slug>/
      index.md      YAML front matter + Markdown body (the source of truth)
      images/       figures, copied to www/learn/<slug>/images/ on build
      materials/    working material (PDFs, transcripts) - never deployed

Two things here are deliberate and worth knowing before you edit:

1. **No Markdown dependency.** The site has no runtime dependencies and PyYAML is the only
   dev one, so rather than add `markdown` this file carries a small renderer covering exactly
   what a guide needs (headings, paragraphs, lists, tables, fenced code, figures, callouts,
   inline emphasis/code/links). It is intentionally not general-purpose. If a guide ever needs
   real Markdown, swap `md_to_html` for the library rather than growing this.

2. **`{{entry:<id>}}` resolves at build time** to the entry's *current* name plus a link to its
   page. Product names in prose therefore cannot go stale: the next rename re-resolves them on
   the next build. An unknown id is a hard build error, never a silent broken link.

Run after build_features.py (it reads the built JSON to resolve entry ids) and before
build_entries.py (which reads posts.json to render the reverse "Guides that mention this"
links and to add guides to sitemap.xml / feed.xml):

    python scripts/build_features.py && python scripts/build_posts.py && python scripts/build_entries.py
"""

import html
import json
import re
import shutil
import sys
from pathlib import Path

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover - same single dev dependency as the data build
    sys.exit(
        "FATAL: PyYAML is required to build the guides.\n"
        "       pip install pyyaml   (CI does this too; the site itself stays dependency-free)"
    )

# The chrome and page head come from the existing generators, so a guide can never drift
# from the console shell the rest of the site renders.
from build_badges import BASE_URL, FAVICON, INLINE_JS, TOPBAR, render_rail
from build_entries import ENTRY_STYLE, HEAD, attr, esc, fmt_date

ROOT = Path(__file__).resolve().parents[1]
KB_POSTS = ROOT / "kb" / "posts"
WWW = ROOT / "www"
DATA = WWW / "databricks.features.json"
LEARN = WWW / "learn"
POSTS_JSON = WWW / "posts.json"

# Everything a guide page needs from the front matter. `readingMinutes` is computed, never
# authored, so it cannot disagree with the body.
REQUIRED = ("slug", "title", "description", "kind", "category", "author", "published", "verified", "sources")

WORDS_PER_MINUTE = 220

KIND_LABEL = {"guide": "Guide", "explainer": "Explainer", "opinion": "Opinion"}

REF_KINDS = {"official": "Official", "community": "Community", "internet": "Web"}

# Callout types available as ::: fences in the body. The keys are the fence names; each maps to
# a CSS modifier, an icon, and the bold lead-in the reader sees.
CALLOUTS = {
    "note": ("is-note", "&#9432;", ""),
    "warning": ("is-warning", "&#9888;", "Undocumented territory."),
    "judgement": ("is-judgement", "&#9878;", "Judgement, not doc."),
}


# --------------------------------------------------------------------------- loading


def split_front_matter(text, rel):
    """Return (front_matter_dict, body). The file must open with a --- fenced YAML block."""
    if not text.startswith("---"):
        raise ValueError(f"{rel}: must start with a '---' YAML front-matter block")
    end = text.find("\n---", 3)
    if end == -1:
        raise ValueError(f"{rel}: front-matter block is never closed with '---'")
    raw = text[3:end]
    body = text[end + 4 :].lstrip("\n")
    fm = yaml.safe_load(raw)
    if not isinstance(fm, dict):
        raise ValueError(f"{rel}: front matter must be a YAML mapping")
    return fm, body


def reading_minutes(body):
    """Rounded reading time from the prose alone - fences, shortcodes and image syntax out."""
    text = re.sub(r"```.*?```", " ", body, flags=re.S)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\{\{entry:[^}]+\}\}", " x ", text)
    text = re.sub(r"[#>|`*_\[\]()-]", " ", text)
    words = len(text.split())
    return max(1, round(words / WORDS_PER_MINUTE))


def load_posts():
    """Parse every kb/posts/<slug>/index.md. Returns (posts, errors)."""
    posts, errors = [], []
    if not KB_POSTS.is_dir():
        return posts, errors
    for folder in sorted(p for p in KB_POSTS.iterdir() if p.is_dir()):
        src = folder / "index.md"
        rel = src.relative_to(ROOT)
        if not src.exists():
            errors.append(f"{folder.relative_to(ROOT)}: no index.md")
            continue
        try:
            fm, body = split_front_matter(src.read_text(encoding="utf-8"), rel)
        except (ValueError, yaml.YAMLError) as e:
            errors.append(str(e))
            continue
        # The folder name *is* the slug - that is what makes the URL permanent.
        if fm.get("slug") != folder.name:
            errors.append(
                f"{rel}: slug {fm.get('slug')!r} does not match the folder name "
                f"(expected {folder.name!r}, or rename the folder)"
            )
            continue
        missing = [k for k in REQUIRED if not fm.get(k)]
        if missing:
            errors.append(f"{rel}: missing required front matter: {', '.join(missing)}")
            continue
        if not body.strip():
            errors.append(f"{rel}: body is empty")
            continue
        fm["body"] = body
        fm["dir"] = folder
        fm["readingMinutes"] = reading_minutes(body)
        posts.append(fm)
    # Newest first, stable on slug so the build is deterministic.
    posts.sort(key=lambda p: (str(p.get("published", "")), p["slug"]), reverse=True)
    return posts, errors


# ------------------------------------------------------------------- markdown subset


def slugify(text):
    s = re.sub(r"<[^>]+>", "", text).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "section"


def inline(text, entry_name, entry_href, used):
    """Inline pass: escape, then code spans, links, emphasis and {{entry:id}} chips.

    Code spans are pulled out into placeholders *first* so that identifiers like
    `SPARK_WORKER_CORES` or `local[*, 4]` can never be eaten by the emphasis rules.
    """
    out = html.escape(text)

    spans = []

    def stash(m):
        spans.append(m.group(1))
        return f"\x00{len(spans) - 1}\x00"

    out = re.sub(r"`([^`]+)`", stash, out)

    # {{entry:<id>}} -> the entry's current name, linked to its page.
    def ref(m):
        eid = m.group(1).strip()
        name = entry_name(eid)
        used.add(eid)
        return (
            f'<a class="entry-ref" href="{attr(entry_href(eid))}" '
            f'title="{attr(name)} on REbricked">{esc(name)}</a>'
        )

    out = re.sub(r"\{\{entry:([a-z0-9-]+)\}\}", ref, out)

    # [text](url) - external links open in a new tab, internal ones do not.
    def link(m):
        label, url = m.group(1), m.group(2)
        ext = url.startswith("http")
        rel = ' target="_blank" rel="noopener"' if ext else ""
        return f'<a href="{attr(url)}"{rel}>{label}</a>'

    out = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", out)

    for i, code in enumerate(spans):
        out = out.replace(f"\x00{i}\x00", f"<code>{code}</code>")
    return out


def md_to_html(body, entry_name, entry_href, used, headings):
    """Render the Markdown subset a guide uses. Appends (id, text) pairs to `headings`."""
    lines = body.split("\n")
    out = []
    i = 0
    n = len(lines)

    def inl(s):
        return inline(s, entry_name, entry_href, used)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # fenced code
        if stripped.startswith("```"):
            lang = stripped[3:].strip()
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            cls = f' class="lang-{attr(lang)}"' if lang else ""
            out.append(
                f'<pre class="post-code"><code{cls}>' + html.escape("\n".join(buf)) + "</code></pre>"
            )
            continue

        # ::: callout
        if stripped.startswith(":::"):
            kind = stripped[3:].strip() or "note"
            cls, icon, lead = CALLOUTS.get(kind, CALLOUTS["note"])
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith(":::"):
                buf.append(lines[i])
                i += 1
            i += 1
            text = inl(" ".join(x.strip() for x in buf if x.strip()))
            leadhtml = f"<b>{esc(lead)}</b> " if lead else ""
            out.append(
                f'<aside class="post-note {cls}" role="note">'
                f'<span class="pn-i" aria-hidden="true">{icon}</span>'
                f"<span>{leadhtml}{text}</span></aside>"
            )
            continue

        # standalone image -> <figure> with the title as the caption
        m = re.match(r'^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$', stripped)
        if m:
            alt, src, cap = m.group(1), m.group(2), m.group(3)
            fig = (
                f'<figure class="post-fig"><img src="{attr(src)}" alt="{attr(alt)}" loading="lazy" decoding="async" />'
            )
            if cap:
                fig += f"<figcaption>{inl(cap)}</figcaption>"
            out.append(fig + "</figure>")
            i += 1
            continue

        # heading
        m = re.match(r"^(#{2,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text = inl(m.group(2))
            hid = slugify(m.group(2))
            if level == 2:
                headings.append((hid, m.group(2)))
            out.append(f'<h{level} id="{attr(hid)}" class="post-h{level}">{text}</h{level}>')
            i += 1
            continue

        # thematic break
        if re.match(r"^-{3,}$", stripped):
            out.append('<hr class="post-hr" />')
            i += 1
            continue

        # pipe table: header row, separator, body rows
        if stripped.startswith("|") and i + 1 < n and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            def cells(row):
                return [c.strip() for c in row.strip().strip("|").split("|")]

            head = cells(lines[i])
            i += 2
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(cells(lines[i]))
                i += 1
            thead = "".join(f'<th scope="col">{inl(c)}</th>' for c in head)
            tbody = "".join(
                "<tr>" + "".join(f"<td>{inl(c)}</td>" for c in r) + "</tr>" for r in rows
            )
            out.append(
                '<div class="post-tablewrap"><table class="post-table">'
                f"<thead><tr>{thead}</tr></thead><tbody>{tbody}</tbody></table></div>"
            )
            continue

        # blockquote
        if stripped.startswith(">"):
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip()[1:].strip())
                i += 1
            out.append(f'<blockquote class="post-quote">{inl(" ".join(buf))}</blockquote>')
            continue

        # lists (a blank line or any non-item line ends them)
        m = re.match(r"^([-*]|\d+\.)\s+(.*)$", stripped)
        if m:
            ordered = not m.group(1) in ("-", "*")
            items = []
            while i < n:
                mm = re.match(r"^([-*]|\d+\.)\s+(.*)$", lines[i].strip())
                if not mm:
                    break
                text = mm.group(2)
                i += 1
                # fold continuation lines into the current item
                while i < n and lines[i].strip() and not re.match(r"^([-*]|\d+\.)\s+", lines[i].strip()):
                    text += " " + lines[i].strip()
                    i += 1
                items.append(f"<li>{inl(text)}</li>")
            tag = "ol" if ordered else "ul"
            out.append(f'<{tag} class="post-list">{"".join(items)}</{tag}>')
            continue

        # paragraph: consume until a blank line or the start of another block
        buf = [stripped]
        i += 1
        while i < n:
            nxt = lines[i].strip()
            if not nxt or re.match(r"^(#{2,4}\s|```|:::|>|\||-{3,}$|([-*]|\d+\.)\s)", nxt):
                break
            if re.match(r'^!\[[^\]]*\]\([^)\s]+', nxt):
                break
            buf.append(nxt)
            i += 1
        out.append(f'<p class="post-p">{inl(" ".join(buf))}</p>')

    return "\n".join(out)


# ------------------------------------------------------------------------- rendering


POST_STYLE = """  <style>
    /* ===== Guides: the reading canvas =====
       Console chrome stays; the canvas swaps. Structure keeps the UI face, prose moves to a
       locally-resolvable serif - the site ships no webfont, so the reading voice has to come
       from the machine. Every colour below is an existing token from styles.css. */
    :root {
      --read: "Iowan Old Style", "Charter", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
    }
    .post-doc { max-width: 680px; margin: 0 auto; padding: 8px 4px 48px; }
    .post-headrow { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-bottom: 10px; }
    /* The kicker occupies the exact slot an entry page prints New feature / Renamed in. */
    .post-kicker { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--accent-ink); border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent); background: color-mix(in srgb, var(--accent) 9%, transparent); border-radius: 999px; padding: 3px 9px; }
    .post-cat { font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; }
    .post-doc h1 { font-family: var(--read); font-size: 34px; font-weight: 600; line-height: 1.13; letter-spacing: -.018em; text-wrap: balance; margin: 0 0 12px; }
    .post-meta { font-family: var(--mono); font-size: 10.5px; letter-spacing: .05em; text-transform: uppercase; color: var(--faint); font-variant-numeric: tabular-nums; margin: 0 0 16px; }
    .post-lead { font-family: var(--read); font-size: 19px; line-height: 1.55; color: var(--muted); margin: 0 0 22px; max-width: 58ch; }
    .post-hr, .post-sep { height: 1px; background: var(--line); border: 0; margin: 26px 0; }
    /* Prose. 66ch measure, 17.5/1.68 - the whole point of a separate canvas. */
    .post-body { font-family: var(--read); font-size: 17.5px; line-height: 1.68; }
    .post-p { margin: 0 0 18px; max-width: 66ch; }
    /* Headings stay in the console voice against the serif body. */
    .post-h2 { font-family: var(--sans); font-size: 21px; font-weight: 700; letter-spacing: -.012em; margin: 32px 0 12px; text-wrap: balance; scroll-margin-top: 72px; }
    .post-h3 { font-family: var(--sans); font-size: 17px; font-weight: 700; margin: 24px 0 10px; scroll-margin-top: 72px; }
    .post-h4 { font-family: var(--sans); font-size: 15px; font-weight: 700; margin: 20px 0 8px; scroll-margin-top: 72px; }
    .post-list { margin: 0 0 18px; padding-left: 1.5em; max-width: 66ch; }
    .post-list li { margin-bottom: 6px; }
    .post-quote { margin: 0 0 20px; padding: 4px 0 4px 16px; border-left: 3px solid var(--line); color: var(--muted); max-width: 64ch; }
    .post-body code { font-family: var(--mono); font-size: .84em; background: var(--card, rgba(127,127,127,.09)); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
    .post-code { margin: 0 0 20px; padding: 13px 15px; overflow-x: auto; background: var(--card, rgba(127,127,127,.07)); border: 1px solid var(--line); border-radius: 10px; }
    .post-code code { font-family: var(--mono); font-size: 13px; background: none; border: 0; padding: 0; line-height: 1.6; }
    /* Figures. Screenshots carry their own dark chrome, so the frame stays quiet. */
    .post-fig { margin: 0 0 22px; }
    .post-fig img { display: block; width: 100%; height: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
    .post-fig figcaption { font-family: var(--sans); font-size: 12.5px; color: var(--faint); margin-top: 8px; line-height: 1.5; }
    /* The callout family: one shape, three jobs, distinguished by the left rule's token.
       This is where the site's one rule becomes visual - facts read as prose, advice is
       boxed and labelled. */
    .post-note { display: flex; gap: 10px; padding: 11px 14px; border-radius: 10px; font-size: 15px; line-height: 1.55; background: var(--card, rgba(127,127,127,.06)); border-left: 3px solid var(--c-legacy); color: var(--muted); margin: 0 0 20px; max-width: 66ch; }
    .post-note .pn-i { flex: none; font-size: 14px; line-height: 1.5; }
    .post-note b { color: var(--ink); font-weight: 650; }
    .post-note.is-note { border-left-color: var(--c-active); }
    .post-note.is-judgement { border-left-color: var(--c-legacy); }
    .post-note.is-warning { border-left-color: var(--c-deprecated); background: color-mix(in srgb, var(--c-deprecated) 11%, transparent); color: var(--c-deprecated-ink); }
    .post-note.is-warning b { color: var(--c-deprecated-ink); }
    /* Verified / stale strips. The stale one is generated once staleAfter passes, never authored. */
    .post-strip { display: flex; gap: 10px; padding: 11px 14px; border-radius: 10px; font-size: 13.5px; line-height: 1.55; background: var(--card, rgba(127,127,127,.06)); border-left: 3px solid var(--c-active); color: var(--muted); margin: 0 0 20px; }
    .post-strip b { color: var(--ink); font-weight: 650; }
    .post-strip.is-stale { border-left-color: var(--c-deprecated); background: color-mix(in srgb, var(--c-deprecated) 11%, transparent); color: var(--c-deprecated-ink); }
    .post-strip.is-stale b { color: var(--c-deprecated-ink); }
    /* Citation links. The claim's own words are the anchor text, so they have to read as
       prose first and as a link second - the browser default (blue, purple once visited,
       a thick underline) fights the serif body and shouts louder than the sentence. Body
       ink, a thin tinted rule underneath, brand colour only on hover. Deliberately quieter
       than .entry-ref below: outbound proof reads calm, inbound links to our own data
       advertise themselves. */
    .post-body a:not(.entry-ref) { color: inherit; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--accent) 42%, transparent); transition: color .15s, text-decoration-color .15s; }
    .post-body a:not(.entry-ref):hover { color: var(--accent-ink); text-decoration-color: var(--accent); }
    /* A code chip inside a citation must not double up as a second box: it takes the
       link's colour and a tinted border so chip and underline read as one anchor. */
    .post-body a:not(.entry-ref) code { color: inherit; border-color: color-mix(in srgb, var(--accent) 30%, var(--line)); }
    /* Prose that links into the dataset - the one thing a guide here can do that a post
       elsewhere cannot. Resolved from {{entry:id}}, so a rename can never strand it. */
    .entry-ref { font-family: var(--sans); font-size: .92em; font-weight: 550; color: var(--accent-ink); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--accent) 38%, transparent); white-space: nowrap; }
    .entry-ref::after { content: " \\2197"; font-size: .7em; opacity: .75; }
    .entry-ref:hover { border-bottom-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
    /* Inline TOC: a plain list, no sticky third column, works with JS off. */
    .post-toc { margin: 0 0 26px; }
    .post-toc-t { font-family: var(--mono); font-size: 9.5px; letter-spacing: .15em; text-transform: uppercase; color: var(--faint); margin-bottom: 8px; }
    .post-toc ol { margin: 0; padding-left: 1.4em; font-family: var(--read); font-size: 15.5px; }
    .post-toc li { margin-bottom: 3px; }
    .post-toc a { color: var(--accent-ink); text-decoration: none; }
    .post-toc a:hover { text-decoration: underline; }
    .post-tablewrap { overflow-x: auto; margin: 0 0 22px; border: 1px solid var(--line); border-radius: 10px; }
    .post-table { border-collapse: collapse; width: 100%; min-width: 460px; }
    .post-table th { font-family: var(--mono); font-size: 9.5px; letter-spacing: .11em; text-transform: uppercase; color: var(--faint); text-align: left; padding: 9px 13px; border-bottom: 1px solid var(--line); background: var(--card, rgba(127,127,127,.06)); font-weight: 700; }
    .post-table td { font-family: var(--read); font-size: 15px; padding: 9px 13px; border-bottom: 1px solid var(--line); color: var(--muted); vertical-align: top; }
    .post-table tr:last-child td { border-bottom: 0; }
    .post-table td:first-child { color: var(--ink); }
    .post-prevnext { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 28px 0 22px; }
    .post-pn { border: 1px solid var(--line); border-radius: 10px; padding: 11px 14px; background: var(--panel); display: flex; flex-direction: column; gap: 3px; text-decoration: none; }
    .post-pn:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); }
    .post-pn-k { font-family: var(--mono); font-size: 9px; letter-spacing: .13em; text-transform: uppercase; color: var(--faint); }
    .post-pn-t { font-family: var(--read); font-size: 14.5px; color: var(--ink); line-height: 1.35; }
    .post-pn.is-next { text-align: right; }
    /* Learn index: rows, not tiles. Reads the same at 3 guides and at 30. */
    .learn-doc { max-width: 720px; margin: 0 auto; padding: 8px 4px 48px; }
    .learn-doc h1 { font-family: var(--read); font-size: 30px; font-weight: 600; letter-spacing: -.015em; margin: 6px 0 8px; }
    .learn-lead { font-family: var(--read); font-size: 16.5px; color: var(--muted); margin: 0 0 26px; max-width: 58ch; }
    .learn-rows { display: flex; flex-direction: column; gap: 10px; }
    .learn-row { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; transition: border-color .15s; }
    .learn-row:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); }
    .learn-row-top { display: flex; align-items: center; gap: 10px; }
    .learn-row-cat { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: var(--faint); }
    .learn-row-len { margin-left: auto; font-family: var(--mono); font-size: 10px; color: var(--faint); font-variant-numeric: tabular-nums; }
    .learn-row h2 { font-family: var(--read); font-size: 19px; font-weight: 600; line-height: 1.25; letter-spacing: -.012em; margin: 0; }
    .learn-row h2 a { color: var(--ink); text-decoration: none; }
    .learn-row h2 a:hover { color: var(--accent-ink); }
    .learn-row-d { font-family: var(--read); font-size: 15px; color: var(--muted); margin: 0; }
    .learn-row-f { font-family: var(--mono); font-size: 10px; color: var(--faint); letter-spacing: .05em; display: flex; gap: 8px; flex-wrap: wrap; }
    .learn-row-f .mentions { color: var(--c-active-ink); }
    .learn-empty { font-family: var(--read); font-size: 16.5px; color: var(--muted); padding: 22px 0; }
    @media (max-width: 560px) {
      .post-doc h1 { font-size: 24px; }
      .post-body { font-size: 16px; line-height: 1.7; }
      .post-h2 { font-size: 18px; }
      .post-lead { font-size: 16.5px; }
      .post-prevnext { grid-template-columns: 1fr; }
      .post-pn.is-next { text-align: left; }
    }
  </style>"""


def chrome(root):
    """Rail/topbar/js with their root-relative `../../` rewritten for this page's depth.

    Guides are what the rail's Learn item leads to, so every page built here marks it active."""
    return (
        render_rail(active="Learn").replace("../../", root),
        TOPBAR.replace("../../", root),
        INLINE_JS.replace("../../", root),
    )


POST_BODY = """
<body>
  <div class="app">
    {rail}
    <div class="main">
      {topbar}
      <div class="content">
        <article class="post-doc">
          <nav class="entry-crumbs" aria-label="Breadcrumb">
            <a href="{root}">REbricked</a> <span aria-hidden="true">/</span>
            <a href="{learn_rel}">Learn</a> <span aria-hidden="true">/</span> {category}
          </nav>
          <div class="post-headrow">
            <span class="post-kicker">{kicker}</span>
            <span class="post-cat">{category}</span>
          </div>
          <h1>{title}</h1>
          <p class="post-meta">{minutes} min read &nbsp;&middot;&nbsp; by {author} &nbsp;&middot;&nbsp; {published}</p>
          {strip}
          <p class="post-lead">{description}</p>
          <hr class="post-sep" />
          {toc}
          <div class="post-body">
{body}
          </div>
          {entries}
          {sources}
          {prevnext}
          <a class="entry-cta" href="{learn_rel}">Browse all guides &rarr;</a>
        </article>
        <footer class="footer" style="max-width:680px;margin:0 auto;">
          <p class="disclaimer">Guides are opinionated; entries are not. Every fact above is
            sourced, and the judgement is labelled as judgement.</p>
          <p class="disclaimer">Not affiliated with Databricks. Databricks and related names are
            trademarks of Databricks, Inc., used for identification only.
            <a href="{root}disclaimer/">Full legal notice</a>.</p>
        </footer>
      </div>
    </div>
  </div>
  <div class="scrim" id="scrim" hidden></div>
  {js}
</body>

</html>
"""

LEARN_BODY = """
<body>
  <div class="app">
    {rail}
    <div class="main">
      {topbar}
      <div class="content">
        <div class="learn-doc">
          <nav class="entry-crumbs" aria-label="Breadcrumb">
            <a href="{root}">REbricked</a> <span aria-hidden="true">/</span> Learn
          </nav>
          <h1>Guides</h1>
          <p class="learn-lead">Opinionated, sourced writing about the platform whose names keep
            moving. {count_line} Facts cited, judgement labelled.</p>
          {rows}
          <p class="learn-lead" style="margin:30px 0 0">Looking for a name instead of an argument?
            <a href="{root}databricks/" style="color:var(--accent-ink)">Browse every rename and
            deprecation &rarr;</a></p>
        </div>
        <footer class="footer" style="max-width:720px;margin:0 auto;">
          <p class="disclaimer">Not affiliated with Databricks. Console chrome is an homage; every
            entry is sourced and dated.</p>
        </footer>
      </div>
    </div>
  </div>
  <div class="scrim" id="scrim" hidden></div>
  {js}
</body>

</html>
"""


def strip_html(post, today):
    """The honesty strip: verified normally, amber and self-announcing once staleAfter passes."""
    when = fmt_date(str(post["verified"])[:7])
    stale = post.get("staleAfter") and str(post["staleAfter"]) < today
    if stale:
        return (
            '<p class="post-strip is-stale"><span aria-hidden="true">&#9888;</span>'
            f"<span><b>Past its review date.</b> Verified {esc(when)} and due a re-check. "
            "Rates, defaults and product behaviour may have moved since.</span></p>"
        )
    return (
        '<p class="post-strip"><span aria-hidden="true">&#9432;</span>'
        f"<span><b>Verified {esc(when)}</b> against the official docs linked below. "
        "Platform defaults move; re-check any number before you act on it.</span></p>"
    )


def toc_html(headings):
    if len(headings) < 2:
        return ""
    items = "".join(f'<li><a href="#{attr(h)}">{esc(t)}</a></li>' for h, t in headings)
    return f'<nav class="post-toc"><div class="post-toc-t">On this page</div><ol>{items}</ol></nav>'


def entries_html(post, by_id, used):
    """Referenced entries, as the chip list the entry pages already use. Front-matter order,
    with anything the prose linked but did not declare appended - so the block can never
    under-report what the guide actually points at."""
    ids = [e for e in (post.get("entries") or []) if e in by_id]
    ids += [e for e in sorted(used) if e not in ids and e in by_id]
    if not ids:
        return ""
    # Same markup as build_entries.py's related_html, so ENTRY_STYLE's chip styling applies.
    items = "".join(
        f'<li><a href="/databricks/{attr(i)}/">{esc(by_id[i]["name"])}</a></li>' for i in ids
    )
    return (
        '<section class="entry-related"><h2>Referenced entries</h2>'
        f"<ul>{items}</ul></section>"
    )


def sources_html(post):
    items = []
    for s in post.get("sources") or []:
        if not s.get("url"):
            continue
        label = esc(s.get("label") or s["url"])
        kind = REF_KINDS.get(s.get("kind"), "Source")
        items.append(
            f'<li><span class="src-kind src-{attr(s.get("kind","official"))}">{esc(kind)}</span> '
            f'<a href="{attr(s["url"])}" target="_blank" rel="noopener">{label} &nearr;</a></li>'
        )
    if not items:
        return ""
    return f'<section class="entry-sources"><h2>Sources</h2><ul>{"".join(items)}</ul></section>'


def prevnext_html(posts, idx):
    """posts is newest-first, so the *next* one chronologically sits at a lower index."""
    older = posts[idx + 1] if idx + 1 < len(posts) else None
    newer = posts[idx - 1] if idx > 0 else None
    if not older and not newer:
        return ""
    cells = []
    if older:
        cells.append(
            f'<a class="post-pn" href="../{attr(older["slug"])}/">'
            f'<span class="post-pn-k">&larr; Older</span>'
            f'<span class="post-pn-t">{esc(older["title"])}</span></a>'
        )
    if newer:
        cells.append(
            f'<a class="post-pn is-next" href="../{attr(newer["slug"])}/">'
            f'<span class="post-pn-k">Newer &rarr;</span>'
            f'<span class="post-pn-t">{esc(newer["title"])}</span></a>'
        )
    return f'<div class="post-prevnext">{"".join(cells)}</div>'


def post_jsonld(post, url, title, desc):
    article = {
        "@type": "BlogPosting",
        "@id": url + "#post",
        "headline": post["title"],
        "name": title.replace(" | REbricked", ""),
        "description": desc,
        "articleSection": post.get("category", ""),
        "inLanguage": "en",
        "url": url,
        "datePublished": str(post["published"]),
        "dateModified": str(post.get("updated") or post["published"]),
        "author": {"@type": "Person", "name": str(post["author"])},
        "keywords": ", ".join(post.get("tags") or []),
        "isPartOf": {"@id": f"{BASE_URL}/#website"},
        "publisher": {"@type": "Organization", "name": "REbricked", "url": f"{BASE_URL}/"},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
    }
    crumbs = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "REbricked", "item": f"{BASE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": "Learn", "item": f"{BASE_URL}/learn/"},
            {"@type": "ListItem", "position": 3, "name": post["title"], "item": url},
        ],
    }
    return json.dumps(
        {"@context": "https://schema.org", "@graph": [article, crumbs]},
        ensure_ascii=False,
        indent=2,
    )


def render_post(post, idx, posts, by_id, entry_count, today):
    url = f"{BASE_URL}/learn/{post['slug']}/"
    root = "../../"  # /learn/<slug>/ is two levels deep
    title = f"{post['title']} | REbricked"
    desc = " ".join(str(post["description"]).split())

    used = set()
    headings = []
    body = md_to_html(
        post["body"],
        lambda i: by_id[i]["name"] if i in by_id else i,
        lambda i: f"/databricks/{i}/",
        used,
        headings,
    )
    post["_used"] = used

    rail, topbar, js = chrome(root)
    head = HEAD.format(
        title=attr(title),
        desc=attr(desc),
        url=url,
        base=BASE_URL,
        og_type="article",
        og_title=attr(post["title"]),
        jsonld=post_jsonld(post, url, title, desc),
        root=root,
        favicon=FAVICON,
        style=ENTRY_STYLE + "\n" + POST_STYLE,
    )
    return head + POST_BODY.format(
        rail=rail,
        topbar=topbar,
        js=js,
        root=root,
        learn_rel="../",
        category=esc(post.get("category", "")),
        kicker=esc(KIND_LABEL.get(post.get("kind"), "Guide")),
        title=esc(post["title"]),
        minutes=post["readingMinutes"],
        author=esc(post["author"]),
        published=esc(fmt_date(str(post["published"])[:7])),
        strip=strip_html(post, today),
        description=esc(desc),
        toc=toc_html(headings),
        body=body,
        entries=entries_html(post, by_id, used),
        sources=sources_html(post),
        prevnext=prevnext_html(posts, idx),
        count=entry_count,
    )


def render_index(posts, by_id):
    url = f"{BASE_URL}/learn/"
    root = "../"
    title = "Guides - Databricks cost, compute and naming, explained | REbricked"
    desc = (
        "Opinionated, sourced guides on running Databricks: cost and cluster utilization, "
        "compute choices, and the naming churn behind them. Facts cited, judgement labelled."
    )

    if posts:
        rows = []
        for p in posts:
            mentioned = [e for e in (p.get("entries") or []) if e in by_id]
            mentioned += [e for e in sorted(p.get("_used", set())) if e not in mentioned and e in by_id]
            mention = (
                f'<span class="mentions">mentions {len(mentioned)} '
                f'{"entry" if len(mentioned) == 1 else "entries"}</span>'
                if mentioned
                else ""
            )
            rows.append(
                '<article class="learn-row">'
                f'<div class="learn-row-top"><span class="learn-row-cat">{esc(p.get("category",""))}</span>'
                f'<span class="learn-row-len">{p["readingMinutes"]} min</span></div>'
                f'<h2><a href="{attr(p["slug"])}/">{esc(p["title"])}</a></h2>'
                f'<p class="learn-row-d">{esc(" ".join(str(p["description"]).split()))}</p>'
                f'<div class="learn-row-f"><span>{esc(fmt_date(str(p["published"])[:7]))}</span>'
                f'<span aria-hidden="true">&middot;</span>'
                f'<span>verified {esc(fmt_date(str(p["verified"])[:7]))}</span>'
                + (f'<span aria-hidden="true">&middot;</span>{mention}' if mention else "")
                + "</div></article>"
            )
        rows_html = f'<div class="learn-rows">{"".join(rows)}</div>'
        count_line = f'{len(posts)} {"guide" if len(posts) == 1 else "guides"}.'
    else:
        rows_html = (
            '<p class="learn-empty">Nothing to read yet. The names are still moving; '
            "we're still writing.</p>"
        )
        count_line = ""

    item_list = [
        {
            "@type": "ListItem",
            "position": i + 1,
            "name": p["title"],
            "item": f"{BASE_URL}/learn/{p['slug']}/",
        }
        for i, p in enumerate(posts)
    ]
    jsonld = json.dumps(
        {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Blog",
                    "@id": url + "#blog",
                    "url": url,
                    "name": "REbricked Guides",
                    "description": desc,
                    "inLanguage": "en",
                    "isPartOf": {"@id": f"{BASE_URL}/#website"},
                    "mainEntity": {
                        "@type": "ItemList",
                        "numberOfItems": len(posts),
                        "itemListElement": item_list,
                    },
                },
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": 1, "name": "REbricked", "item": f"{BASE_URL}/"},
                        {"@type": "ListItem", "position": 2, "name": "Learn", "item": url},
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
        style=ENTRY_STYLE + "\n" + POST_STYLE,
    )
    return head + LEARN_BODY.format(
        rail=rail, topbar=topbar, js=js, root=root, count_line=count_line, rows=rows_html
    )


# ------------------------------------------------------------------------------ main


def main():
    if not DATA.exists():
        sys.exit(
            f"FATAL: {DATA.relative_to(ROOT)} is missing - run scripts/build_features.py first "
            "(guides resolve {{entry:id}} against the built data)."
        )
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {d["id"]: d for d in data}
    today = __import__("datetime").date.today().isoformat()

    posts, errors = load_posts()

    # Every {{entry:id}} and every declared entry must exist. A guide pointing at a name the
    # dataset does not have is a broken promise, so it fails the build rather than the reader.
    for p in posts:
        for eid in p.get("entries") or []:
            if eid not in by_id:
                errors.append(
                    f"kb/posts/{p['slug']}/index.md: entries lists unknown id {eid!r}"
                )
        for m in re.finditer(r"\{\{entry:([a-z0-9-]+)\}\}", p["body"]):
            if m.group(1) not in by_id:
                errors.append(
                    f"kb/posts/{p['slug']}/index.md: {{{{entry:{m.group(1)}}}}} is not an entry id"
                )

    for e in errors:
        print(f"ERROR {e}")
    if errors:
        sys.exit(1)

    shutil.rmtree(LEARN, ignore_errors=True)
    LEARN.mkdir(parents=True)

    for i, p in enumerate(posts):
        folder = LEARN / p["slug"]
        folder.mkdir(parents=True)
        folder.joinpath("index.html").write_text(
            render_post(p, i, posts, by_id, len(data), today), encoding="utf-8"
        )
        # Figures ride along; `materials/` deliberately does not - it is working source.
        imgs = p["dir"] / "images"
        if imgs.is_dir():
            shutil.copytree(imgs, folder / "images")

    # The index is rendered last so it can use the resolved {{entry:}} sets from each post.
    LEARN.joinpath("index.html").write_text(render_index(posts, by_id), encoding="utf-8")

    # posts.json is what build_entries.py reads to render reverse links and to add guides to
    # sitemap.xml / feed.xml. Untracked build output, like every other generated file.
    out = []
    for p in posts:
        mentioned = [e for e in (p.get("entries") or []) if e in by_id]
        mentioned += [e for e in sorted(p.get("_used", set())) if e not in mentioned and e in by_id]
        out.append(
            {
                "slug": p["slug"],
                "title": p["title"],
                "description": " ".join(str(p["description"]).split()),
                "kind": p.get("kind", "guide"),
                "category": p.get("category", ""),
                "author": str(p["author"]),
                "published": str(p["published"]),
                "updated": str(p.get("updated") or p["published"]),
                "verified": str(p["verified"]),
                "readingMinutes": p["readingMinutes"],
                "entries": mentioned,
                "tags": p.get("tags") or [],
                "url": f"/learn/{p['slug']}/",
            }
        )
    POSTS_JSON.write_text(
        json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )

    figs = sum(1 for p in posts for _ in (p["dir"] / "images").glob("*") if (p["dir"] / "images").is_dir())
    print(
        f"OK    www/learn/ <- {len(posts)} guide(s) from kb/posts/ "
        f"({figs} figure(s)); posts.json written."
    )


if __name__ == "__main__":
    main()
