#!/usr/bin/env python3
"""Incrementally fetch external reference docs (e.g. Databricks release notes).

The rebricked data (databricks.features.json) is sourced from official docs; this keeps a
local mirror of those docs so entries can be checked and new renames spotted as
release notes ship.

Sources live in scripts/sources.json - add an entry there to track another site,
no code change needed. Each source discovers page URLs either from a `sitemap`
(filtered by `include` / `exclude` regexes over the <loc> entries) or from an
explicit `urls` list.

Files mirror the URL path, so the local tree reads like the site (wget -r style):

  reference/<host>/<path>.html   raw HTML - the source of truth
  reference/<host>/<path>.md      extracted <article> as readable Markdown

e.g. https://docs.databricks.com/aws/en/release-notes/product/2026/may ->
     reference/docs.databricks.com/aws/en/release-notes/product/2026/may.{html,md}

Fetching is INCREMENTAL. Every page's ETag and Last-Modified are recorded in
reference/manifest.json; the next run sends them as If-None-Match /
If-Modified-Since so unchanged pages return 304 and are skipped. New pages (a
fresh month appearing in the sitemap) and changed pages (the current month
getting more entries) are the only things actually downloaded.

Run:
  python scripts/fetch_reference.py                     # all sources
  python scripts/fetch_reference.py databricks-release-notes   # one source by id
  python scripts/fetch_reference.py --force             # ignore 304, re-fetch all
  python scripts/fetch_reference.py --list              # show sources, fetch nothing

Standard library only - no pip installs.
"""
import argparse
import gzip
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "scripts" / "sources.json"
OUT_ROOT = ROOT / "reference"
MANIFEST_PATH = OUT_ROOT / "manifest.json"
UA = "rebricked-reference-fetcher/1.0 (+https://rebricked.org)"
TIMEOUT = 30
RETRIES = 3
POLITE_DELAY = 0.3  # seconds between page downloads, to be a good citizen


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #
def http_get(url, headers=None):
    """GET a URL following redirects. Returns (status, headers, body_bytes).

    A 304 comes back as status 304 with an empty body. Transient network errors
    and 5xx are retried with backoff; a 304/4xx returns immediately.
    """
    hdrs = {"User-Agent": UA, "Accept-Encoding": "gzip"}
    if headers:
        hdrs.update(headers)
    last_err = None
    for attempt in range(RETRIES):
        try:
            req = Request(url, headers=hdrs)
            with urlopen(req, timeout=TIMEOUT) as resp:
                body = resp.read()
                if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                    body = gzip.decompress(body)
                return resp.status, dict(resp.headers), body
        except HTTPError as e:
            if e.code == 304:
                return 304, dict(e.headers or {}), b""
            if e.code < 500:  # 4xx won't fix itself - don't retry
                return e.code, dict(e.headers or {}), b""
            last_err = e
        except (URLError, TimeoutError, OSError) as e:
            last_err = e
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"GET failed after {RETRIES} tries: {url} ({last_err})")


# --------------------------------------------------------------------------- #
# Sitemap parsing (handles plain and .gz, and nested sitemap indexes)
# --------------------------------------------------------------------------- #
def sitemap_locs(url, _seen=None):
    """Yield every <loc> URL from a sitemap, recursing into sitemap indexes."""
    _seen = _seen if _seen is not None else set()
    if url in _seen:
        return
    _seen.add(url)
    status, _, body = http_get(url)
    if status != 200 or not body:
        print(f"  ! sitemap {url} -> HTTP {status}", file=sys.stderr)
        return
    if url.endswith(".gz"):
        body = gzip.decompress(body)
    text = body.decode("utf-8", "replace")
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", text)
    is_index = "<sitemapindex" in text
    for loc in locs:
        if is_index:
            yield from sitemap_locs(loc, _seen)
        else:
            yield loc


def discover_urls(source):
    """Resolve a source's page URLs from its sitemap (+regex filters) or url list."""
    if source.get("urls"):
        return list(dict.fromkeys(source["urls"]))
    sm = source.get("sitemap")
    if not sm:
        raise ValueError(f"source {source['id']} has neither 'sitemap' nor 'urls'")
    inc = [re.compile(p) for p in source.get("include", [])]
    exc = [re.compile(p) for p in source.get("exclude", [])]
    out = []
    for loc in sitemap_locs(sm):
        if inc and not any(r.search(loc) for r in inc):
            continue
        if any(r.search(loc) for r in exc):
            continue
        out.append(loc)
    return sorted(dict.fromkeys(out))


# --------------------------------------------------------------------------- #
# HTML -> Markdown extraction (only the <article>, stdlib parser)
# --------------------------------------------------------------------------- #
class ArticleToMarkdown(HTMLParser):
    """Extract the page's main <article> (fallback <main>) as plain Markdown.

    Deliberately small: headings, paragraphs, lists, links, inline/block code,
    bold/italic, blockquotes, hr, and tables (flattened). Anything it doesn't know
    becomes its text content, which is the right default for prose docs.
    """
    SKIP = {"script", "style", "svg", "nav", "noscript", "button", "form", "aside"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.depth_article = 0     # >0 once inside <article> (or <main> fallback)
        self.saw_article = False
        self.skip = 0             # >0 while inside a SKIP element
        self.list_stack = []      # 'ul' / 'ol' with running counter
        self.pre = 0              # >0 inside <pre> (preserve whitespace)
        self.href = None
        self.link_text = []

    def emit(self, s):
        if self.depth_article > 0 and self.skip == 0:
            self.out.append(s)

    def newline(self, n=1):
        self.emit("\n" * n)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("article", "main"):
            # Prefer a real <article>; only use <main> if no article shows up.
            if tag == "article" or (tag == "main" and not self.saw_article):
                self.depth_article += 1
                self.saw_article = self.saw_article or tag == "article"
            return
        if self.depth_article == 0:
            return
        if tag in self.SKIP:
            self.skip += 1
            return
        if self.skip:
            return
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.newline(2)
            self.emit("#" * int(tag[1]) + " ")
        elif tag == "p":
            self.newline(2)
        elif tag == "br":
            self.newline(1)
        elif tag == "hr":
            self.newline(2)
            self.emit("---")
            self.newline(2)
        elif tag in ("ul", "ol"):
            self.list_stack.append([tag, 0])
            self.newline(1)
        elif tag == "li":
            self.newline(1)
            indent = "  " * (len(self.list_stack) - 1)
            if self.list_stack and self.list_stack[-1][0] == "ol":
                self.list_stack[-1][1] += 1
                self.emit(f"{indent}{self.list_stack[-1][1]}. ")
            else:
                self.emit(f"{indent}- ")
        elif tag in ("strong", "b"):
            self.emit("**")
        elif tag in ("em", "i"):
            self.emit("*")
        elif tag == "code" and self.pre == 0:
            self.emit("`")
        elif tag == "pre":
            self.pre += 1
            self.newline(2)
            self.emit("```\n")
        elif tag == "blockquote":
            self.newline(2)
            self.emit("> ")
        elif tag == "a":
            self.href = a.get("href")
            self.link_text = []
        elif tag in ("td", "th"):
            self.emit(" | ")

    def handle_endtag(self, tag):
        if tag in ("article", "main"):
            if self.depth_article > 0:
                self.depth_article = max(0, self.depth_article - 1)
            return
        if self.depth_article == 0:
            return
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if tag in ("strong", "b"):
            self.emit("**")
        elif tag in ("em", "i"):
            self.emit("*")
        elif tag == "code" and self.pre == 0:
            self.emit("`")
        elif tag == "pre":
            self.pre = max(0, self.pre - 1)
            self.emit("\n```")
            self.newline(2)
        elif tag in ("ul", "ol"):
            if self.list_stack:
                self.list_stack.pop()
            self.newline(1)
        elif tag in ("p", "div", "section", "blockquote"):
            self.newline(1)
        elif tag == "tr":
            self.emit(" |")
            self.newline(1)
        elif tag == "a":
            text = "".join(self.link_text).strip()
            href = self.href or ""
            if text and href and not href.startswith("#"):
                self.emit(f"[{text}]({href})")
            else:
                self.emit(text)
            self.href = None
            self.link_text = []

    def handle_data(self, data):
        if self.depth_article == 0 or self.skip:
            return
        if self.pre == 0:
            data = re.sub(r"\s+", " ", data)  # collapse whitespace in prose
            if data == " " and (not self.out or self.out[-1].endswith((" ", "\n"))):
                return
        if self.href is not None:
            self.link_text.append(data)
        else:
            self.emit(data)

    def markdown(self):
        md = "".join(self.out)
        md = re.sub(r"[ \t]+\n", "\n", md)      # trailing spaces
        md = re.sub(r"\n{3,}", "\n\n", md)      # collapse blank runs
        return md.strip() + "\n"


def extract_markdown(html_bytes):
    parser = ArticleToMarkdown()
    try:
        parser.feed(html_bytes.decode("utf-8", "replace"))
    except Exception:  # a malformed page shouldn't kill the whole run
        pass
    return parser.markdown()


# --------------------------------------------------------------------------- #
# URL -> local path (mirror the site tree: reference/<host>/<path>.{html,md})
# --------------------------------------------------------------------------- #
_ILLEGAL = re.compile(r'[<>:"|?*\\]')  # characters not allowed in Windows names


def local_stem(url):
    """Relative path (no extension) mirroring the URL: host + cleaned path.

    A path ending in '/' (or empty) maps to '<dir>/index' so it stays a file.
    """
    parts = urlsplit(url)
    path = parts.path
    if path.endswith("/") or path == "":
        path += "index"
    segments = [_ILLEGAL.sub("-", s) for s in path.strip("/").split("/") if s]
    rel = Path(_ILLEGAL.sub("-", parts.netloc), *segments)
    return rel


def rel_str(path):
    """Repo-relative POSIX string for storing in the manifest."""
    return str(path.relative_to(ROOT)).replace("\\", "/")


# --------------------------------------------------------------------------- #
# Manifest
# --------------------------------------------------------------------------- #
def load_manifest():
    if MANIFEST_PATH.exists():
        try:
            data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            data.setdefault("pages", {})
            return data
        except (json.JSONDecodeError, OSError):
            print(f"  ! manifest unreadable, starting fresh: {MANIFEST_PATH}",
                  file=sys.stderr)
    return {"pages": {}}


def save_manifest(manifest):
    manifest["updated_at"] = now_iso()
    manifest["page_count"] = len(manifest["pages"])
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# --------------------------------------------------------------------------- #
# Per-source run
# --------------------------------------------------------------------------- #
def fetch_source(source, manifest, force=False):
    sid = source["id"]
    pages = manifest["pages"]
    print(f"\n== {sid} :: {source.get('name', sid)}")
    urls = discover_urls(source)
    print(f"   discovered {len(urls)} page(s)")

    counts = {"new": 0, "updated": 0, "unchanged": 0, "error": 0}
    for i, url in enumerate(urls, 1):
        stem = OUT_ROOT / local_stem(url)
        rel = rel_str(stem)
        rec = pages.get(url, {})
        cond = {}
        if not force and rec:
            if rec.get("etag"):
                cond["If-None-Match"] = rec["etag"]
            if rec.get("last_modified"):
                cond["If-Modified-Since"] = rec["last_modified"]

        try:
            status, hdrs, body = http_get(url, cond)
        except RuntimeError as e:
            counts["error"] += 1
            print(f"   [{i}/{len(urls)}] ERROR {rel}: {e}", file=sys.stderr)
            continue

        if status == 304:
            counts["unchanged"] += 1
            rec["checked_at"] = now_iso()
            pages[url] = rec
            continue
        if status != 200 or not body:
            counts["error"] += 1
            print(f"   [{i}/{len(urls)}] HTTP {status} {url}", file=sys.stderr)
            continue

        digest = hashlib.sha256(body).hexdigest()
        is_new = url not in pages or "sha256" not in rec
        # A 200 with an unchanged body can happen on servers that ignore
        # conditional headers - treat it as unchanged to avoid churn.
        if not force and rec.get("sha256") == digest:
            counts["unchanged"] += 1
            rec["checked_at"] = now_iso()
            pages[url] = rec
            continue

        stem.parent.mkdir(parents=True, exist_ok=True)
        html_path = stem.with_suffix(".html")
        md_path = stem.with_suffix(".md")
        html_path.write_bytes(body)
        md_path.write_text(extract_markdown(body), encoding="utf-8")

        pages[url] = {
            "source": sid,
            "etag": hdrs.get("ETag"),
            "last_modified": hdrs.get("Last-Modified"),
            "sha256": digest,
            "bytes": len(body),
            "html": rel_str(html_path),
            "md": rel_str(md_path),
            "fetched_at": now_iso(),
            "checked_at": now_iso(),
        }
        counts["updated" if not is_new else "new"] += 1
        tag = "NEW" if is_new else "UPD"
        print(f"   [{i}/{len(urls)}] {tag} {rel} ({len(body):,} B)")
        time.sleep(POLITE_DELAY)

    print(f"   done: {counts['new']} new, {counts['updated']} updated, "
          f"{counts['unchanged']} unchanged, {counts['error']} error(s)")
    return counts


# --------------------------------------------------------------------------- #
def main(argv=None):
    ap = argparse.ArgumentParser(description="Incrementally fetch reference docs.")
    ap.add_argument("ids", nargs="*", help="source id(s) to fetch (default: all)")
    ap.add_argument("--force", action="store_true",
                    help="ignore conditional caching and re-fetch every page")
    ap.add_argument("--list", action="store_true",
                    help="list configured sources and exit")
    args = ap.parse_args(argv)

    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    sources = config.get("sources", [])
    by_id = {s["id"]: s for s in sources}

    if args.list:
        for s in sources:
            how = s.get("sitemap") or f"{len(s.get('urls', []))} explicit url(s)"
            print(f"{s['id']:36} {s.get('name', '')}\n{'':36} {how}")
        return 0

    selected = sources
    if args.ids:
        missing = [i for i in args.ids if i not in by_id]
        if missing:
            print(f"unknown source id(s): {', '.join(missing)}", file=sys.stderr)
            print(f"available: {', '.join(by_id)}", file=sys.stderr)
            return 2
        selected = [by_id[i] for i in args.ids]

    manifest = load_manifest()
    totals = {"new": 0, "updated": 0, "unchanged": 0, "error": 0}
    try:
        for s in selected:
            c = fetch_source(s, manifest, force=args.force)
            for k in totals:
                totals[k] += c[k]
            save_manifest(manifest)  # persist after each source, so a crash keeps progress
    finally:
        save_manifest(manifest)

    print(f"\nAll done: {totals['new']} new, {totals['updated']} updated, "
          f"{totals['unchanged']} unchanged, {totals['error']} error(s).")
    return 1 if totals["error"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
