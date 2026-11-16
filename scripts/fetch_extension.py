#!/usr/bin/env python3
"""Download a Chrome Web Store extension package (.crx) and unpack it for reading.

Some things an entry tracks ship as a browser extension rather than as a docs page - the
Genie One Chrome extension is the first. The package is the primary source for what such
an extension really asks for (its manifest: permissions, host patterns, version), so this
fetches it the same way the reference mirror fetches docs: into reference/, gitignored.

    python scripts/fetch_extension.py https://chromewebstore.google.com/detail/genie-one/jpoejhieekdpiibhkkpmmcalkkffemlf
    python scripts/fetch_extension.py jpoejhieekdpiibhkkpmmcalkkffemlf --out some/dir

Writes, under reference/extensions/<id>/ by default:
    <id>-<version>.crx    the package exactly as the store served it
    <id>-<version>.zip    the same bytes with the CRX header stripped (a plain zip)
    <version>/            the unpacked files (skip with --no-unpack)

Nothing downloaded is executed: the package is only saved and unzipped. Standard library
only. Needs the network.
"""
import argparse
import io
import json
import re
import struct
import sys
import zipfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "reference" / "extensions"

# The store's update service: the same endpoint Chrome itself asks for a package. It only
# answers for a Chrome version it considers current, so bump --prodversion if it returns
# an empty 204.
UPDATE_URL = (
    "https://clients2.google.com/service/update2/crx"
    "?response=redirect&prodversion={prodversion}&acceptformat=crx2,crx3&x={x}"
)
DEFAULT_PRODVERSION = "131.0.0.0"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
TIMEOUT = 60

# An extension id is 32 characters from a-p (a hex digest spelled with a different alphabet).
ID_RE = re.compile(r"(?<![a-p])[a-p]{32}(?![a-p])")


def extension_id(arg):
    """Pull the 32-character id out of a store URL, or accept a bare id."""
    m = ID_RE.search(arg.strip())
    if not m:
        raise SystemExit(f"no extension id found in {arg!r} (expected 32 letters a-p)")
    return m.group(0)


def download(ext_id, prodversion):
    url = UPDATE_URL.format(prodversion=prodversion, x=quote(f"id={ext_id}&uc", safe=""))
    try:
        with urlopen(Request(url, headers={"User-Agent": UA}), timeout=TIMEOUT) as resp:
            status, body = resp.status, resp.read()
    except HTTPError as e:
        raise SystemExit(f"download failed: HTTP {e.code} for {ext_id}")
    except (URLError, TimeoutError, OSError) as e:
        raise SystemExit(f"download failed: {e}")
    if status == 204 or not body:
        raise SystemExit(
            f"the store returned no package for {ext_id}. The id may be wrong, the extension "
            f"unpublished, or --prodversion {prodversion} too old for it."
        )
    return body


def zip_offset(crx):
    """Where the zip starts inside a CRX. CRX is a small signed header glued onto a zip."""
    if crx[:4] == b"PK\x03\x04":
        return 0  # already a plain zip
    if crx[:4] != b"Cr24":
        raise SystemExit("not a CRX package (missing the Cr24 magic)")
    version = struct.unpack("<I", crx[4:8])[0]
    if version == 3:
        return 12 + struct.unpack("<I", crx[8:12])[0]
    if version == 2:
        key_len, sig_len = struct.unpack("<II", crx[8:16])
        return 16 + key_len + sig_len
    raise SystemExit(f"unsupported CRX version {version}")


def unpack(zf, dest):
    """Extract every member, refusing any path that would land outside dest."""
    dest = dest.resolve()
    count = 0
    for info in zf.infolist():
        target = (dest / info.filename).resolve()
        if dest != target and dest not in target.parents:
            raise SystemExit(f"refusing to unpack {info.filename!r}: it escapes {dest}")
        if info.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(zf.read(info))
        count += 1
    return count


def rel(path):
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Download and unpack a Chrome Web Store extension.")
    ap.add_argument("extension", help="Chrome Web Store URL or the 32-character extension id")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT,
                    help="directory to write into (default: reference/extensions/); a folder named for the id is created inside it")
    ap.add_argument("--no-unpack", action="store_true", help="keep the .crx and .zip only")
    ap.add_argument("--prodversion", default=DEFAULT_PRODVERSION,
                    help=f"Chrome version to ask as (default: {DEFAULT_PRODVERSION})")
    args = ap.parse_args(argv)

    ext_id = extension_id(args.extension)
    crx = download(ext_id, args.prodversion)
    payload = crx[zip_offset(crx):]
    try:
        zf = zipfile.ZipFile(io.BytesIO(payload))
        manifest = json.loads(zf.read("manifest.json").decode("utf-8-sig"))
    except (zipfile.BadZipFile, KeyError, ValueError) as e:
        raise SystemExit(f"the package is not a readable extension zip: {e}")

    version = re.sub(r"[^0-9A-Za-z._-]", "_", str(manifest.get("version", "unknown")))
    folder = args.out / ext_id
    folder.mkdir(parents=True, exist_ok=True)
    crx_path = folder / f"{ext_id}-{version}.crx"
    zip_path = folder / f"{ext_id}-{version}.zip"
    crx_path.write_bytes(crx)
    zip_path.write_bytes(payload)

    print(f"OK    {rel(crx_path)} ({len(crx):,} B)")
    print(f"OK    {rel(zip_path)}")
    if not args.no_unpack:
        n = unpack(zf, folder / version)
        print(f"OK    {rel(folder / version)}/ <- {n} file(s)")

    hosts = manifest.get("host_permissions") or []
    print(f"\nname:             {manifest.get('name')}")
    print(f"version:          {manifest.get('version')}  (manifest v{manifest.get('manifest_version')})")
    print(f"permissions:      {', '.join(manifest.get('permissions') or []) or '(none)'}")
    print(f"host_permissions: {', '.join(hosts) or '(none)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
