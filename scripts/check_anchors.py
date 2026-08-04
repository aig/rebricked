#!/usr/bin/env python3
"""Check every URL in databricks.features.json and kb/posts/: links live, quotes real.

`validate.py` checks a link's *shape* - that it is an http(s) URL, that dates parse.
It never fetches, so it cannot see the failure this catches: Databricks edits a doc
page, the `#:~:text=` fragment stops matching, and the card goes on looking sourced.
Text fragments fail silently - a browser just loads the page without highlighting -
so the rot is invisible from both ends. Guides cite the same way (inline `[🔗]` links
whose fragment selects the backing sentence), so their front-matter sources and every
http(s) link in each body are swept too, under the id `post:<slug>`.

Two kinds of URL, judged differently:

  with `#:~:text=`   the quote must actually be on the page. 675 of the file's URLs
                     are these, and 669 of them point at docs.databricks.com,
                     www.databricks.com, or learn.microsoft.com - all readable.
  plain URL          only liveness is claimed, so only liveness is checked.

Three verdicts:

  OK        live, and the quote was found if one was cited.
  DEAD      a real problem. Either the page is gone (404/410/5xx/DNS) or it is
            readable and the cited text is NOT on it - meaning the quote needs
            fixing, or the vendor reworded something and the claim itself needs
            re-checking. A dead quote on a live vendor doc is often the first sign
            of a rename, which is this project's whole subject.
  BLOCKED   the host refused a scripted request (403/429) or served no readable
            text. Says nothing about the link: these hosts turn away real headless
            Chrome too, yet serve the same page fine to a person. Never fails the
            run unless you ask it to.

            Only plain links land here - no `#:~:text=` quote in the file depends on
            a blocked host - and there are usually one or two. **The procedure is to
            finish them off with a web-fetch tool:** run `--list-blocked`, then fetch
            each URL with your agent's standard web-fetch (Claude Code's `WebFetch`
            or equivalent), which goes out over a different path and reads these
            pages normally. Confirm the page is real and still says what the card
            cites it for. On 2026-08-03 that cleared both of the remaining two
            (www.datacamp.com, www.techzine.eu) as live and on-topic.

            Do not try to defeat these walls in this script; that is evasion, it is
            fragile, and a two-line manual step already covers the handful involved.

Two details matter for not raising false alarms:

* Matching mirrors how a browser resolves a text fragment - case-insensitively and
  across inline markup - so `[open protocol](url)`, `*multi-file editor*` and a
  capitalised heading all still match. Naive matching invents breakage that isn't
  there, which is worse than not checking.
* Text extraction is deliberately generic (all visible text, minus script/style/nav).
  `fetch_reference.extract_markdown` is scoped to `<article>`/`<main>` because it
  mirrors docs pages; pointed at a blog or forum it returns nothing, which looks
  exactly like a bot wall and isn't.

Needs the network, so this is a scheduled or local audit - keep `validate.py` as the
gate CI blocks on.

Run locally:
    python scripts/check_anchors.py                    # everything
    python scripts/check_anchors.py unity-catalog       # just these entry ids
    python scripts/check_anchors.py post:databricks-task-slots-not-more-nodes
    python scripts/check_anchors.py --list-blocked
"""
import argparse
import concurrent.futures
import gzip
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "www" / "databricks.features.json"
POSTS = ROOT / "kb" / "posts"

FRAGMENT = "#:~:text="
TIMEOUT = 45
WORKERS = 8
# A 200 carrying less text than this is a challenge page or an empty shell, not
# something we can honestly search for a quote.
MIN_READABLE = 200

# Plain browser headers. Not evasion - community.databricks.com simply 403s an
# unfamiliar User-Agent and serves the page fine to a normal one.
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip",
}

# Tags whose boundaries are a word break; inline tags deliberately are not, so a
# quote spanning <a> or <em> still reads as continuous text.
BLOCK = {
    "p", "div", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "td", "th",
    "br", "hr", "section", "article", "main", "header", "footer", "blockquote", "pre",
    "table", "figure", "figcaption", "dd", "dt", "dl", "nav", "aside", "details",
    "summary", "form", "option",
}
SKIP = {"script", "style", "svg", "noscript", "template", "iframe", "head", "button"}


class PageText(HTMLParser):
    """All visible text on a page, whatever the site's markup looks like."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, _attrs):
        if tag in SKIP:
            self.skip += 1
        elif tag in BLOCK and self.skip == 0:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in SKIP and self.skip:
            self.skip -= 1
        elif tag in BLOCK and self.skip == 0:
            self.parts.append("\n")

    def handle_data(self, data):
        if self.skip == 0:
            self.parts.append(data)


def page_text(body):
    parser = PageText()
    try:
        parser.feed(body.decode("utf-8", "replace"))
    except Exception:  # a malformed page shouldn't kill the run
        pass
    return "".join(parser.parts)


def norm(s):
    """Normalise the way a browser's text-fragment match effectively does:
    case-insensitively, and across inline markup and typographic punctuation."""
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)   # [text](url) -> text
    s = re.sub(r"[*`_​]", "", s)                # emphasis, code, zero-width space
    s = s.replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip().lower()


def fetch(url):
    """(verdict, text) where verdict is None when the page was read successfully,
    otherwise a short human reason. Never raises."""
    for attempt in range(2):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=TIMEOUT) as resp:
                body = resp.read()
                if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                    body = gzip.decompress(body)
                text = page_text(body)
                if len(text.strip()) < MIN_READABLE:
                    return f"HTTP 200 but only {len(text.strip())}B of text", text
                return None, text
        except HTTPError as e:
            if e.code in (403, 429):
                return f"HTTP {e.code} (refuses scripted requests)", ""
            if e.code < 500:
                return f"HTTP {e.code}", ""
            if attempt:
                return f"HTTP {e.code}", ""
        except (URLError, TimeoutError, OSError) as e:
            if attempt:
                return f"{type(e).__name__}", ""
    return "unreachable", ""


def anchors_of(entry):
    """Every ('field.path', url) pair in an entry, however deeply nested."""
    found = []

    def walk(node, path=""):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in ("link", "url") and isinstance(value, str):
                    found.append((path or key, value))
                else:
                    walk(value, f"{path}.{key}" if path else key)
        elif isinstance(node, list):
            for i, item in enumerate(node):
                walk(item, f"{path}[{i}]")

    walk(entry)
    return found


def post_anchors():
    """Every ('post:<slug>', field, url) triple across kb/posts/*/index.md.

    Reads the *source* Markdown, not the built page: front-matter `url:` lines (house
    style is one URL per line) plus every inline `[text](http...)` link in the body.
    """
    found = []
    for md in sorted(POSTS.glob("*/index.md")):
        pid = f"post:{md.parent.name}"
        text = md.read_text(encoding="utf-8")
        for url in re.findall(r"^\s*(?:-\s*)?url:\s*(\S+)\s*$", text, flags=re.M):
            found.append((pid, "sources", url))
        for url in re.findall(r"\]\((https?://[^)\s]+)\)", text):
            found.append((pid, "body", url))
    return found


def main(argv=None):
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if reconfigure:  # quoted text is often non-ASCII; don't die on a cp1252 console
        reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser(
        description="Verify every URL in databricks.features.json still resolves, and "
                    "every #:~:text= quote is still on its page.")
    ap.add_argument("ids", nargs="*", help="entry id(s) to check (default: all)")
    ap.add_argument("--list-blocked", action="store_true",
                    help="list the hosts that refused a scripted request")
    ap.add_argument("--fail-on-blocked", action="store_true",
                    help="exit non-zero for blocked pages too (off by default: a bot "
                         "wall is not evidence that a link is broken)")
    args = ap.parse_args(argv)

    try:
        data = json.loads(DATA.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"FATAL: {DATA.name} not found - it is built from kb/. Run first:")
        print("       python scripts/build_features.py")
        return 1
    posts = post_anchors()
    wanted = set(args.ids)
    if wanted:
        known = {e.get("id") for e in data} | {pid for pid, _, _ in posts}
        unknown = sorted(wanted - known)
        if unknown:
            print(f"unknown entry/post id(s): {', '.join(unknown)}", file=sys.stderr)
            return 2

    todo = []  # (entry_id, field, base, fragment)
    for entry in data:
        eid = entry.get("id", "?")
        if wanted and eid not in wanted:
            continue
        for field, url in anchors_of(entry):
            base, _, frag = url.partition(FRAGMENT)
            todo.append((eid, field, base, frag))
    for pid, field, url in posts:
        if wanted and pid not in wanted:
            continue
        base, _, frag = url.partition(FRAGMENT)
        todo.append((pid, field, base, frag))

    bases = sorted({b for _, _, b, _ in todo})
    print(f"checking {len(todo)} URL(s) across {len(bases)} page(s)...")
    pages = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for base, result in zip(bases, pool.map(fetch, bases)):
            pages[base] = result

    ok, dead, blocked = 0, [], {}
    for eid, field, base, frag in todo:
        why, text = pages[base]
        if why:
            if why.startswith(("HTTP 403", "HTTP 429")) or "only" in why:
                blocked[base] = why
            else:
                dead.append((eid, field, None, base, why))
            continue
        if not frag:
            ok += 1  # plain URL: it is live, which is all it claimed
        elif norm(unquote(frag)) in norm(text):
            ok += 1
        else:
            dead.append((eid, field, unquote(frag), base, "cited text not on page"))

    n_blocked = sum(1 for _, _, b, _ in todo if b in blocked)
    print(f"\nOK {ok} | DEAD {len(dead)} | BLOCKED {n_blocked} "
          f"({len(blocked)} host page(s))")

    if dead:
        print("\nDEAD:")
        for eid, field, quoted, base, why in dead:
            print(f"  [{eid}] {field} - {why}")
            if quoted:
                print(f"      cites: {quoted!r}")
            print(f"      page:  {base}")
        print("\nFix the quote, or re-check the claim: the vendor may have reworded "
              "or renamed something.")

    if blocked:
        hosts = sorted({urlsplit(b).netloc for b in blocked})
        if args.list_blocked or args.fail_on_blocked:
            print("\nBLOCKED (cannot assess; not evidence of breakage):")
            for base, why in sorted(blocked.items()):
                print(f"  [{why}] {base}")
        else:
            print(f"\nBLOCKED by {', '.join(hosts)} - "
                  f"re-run with --list-blocked for the URLs.")

    if dead:
        return 1
    if blocked and args.fail_on_blocked:
        return 1
    print("\nEvery reachable URL resolves and every readable quote still matches.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
