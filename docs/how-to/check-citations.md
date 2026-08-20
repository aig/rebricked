# How to check that citations still resolve

`validate.py` checks a link's *shape*. It never fetches anything, so it cannot see the failure
that matters most here: Databricks edits a doc, the `#:~:text=` fragment stops matching, and the
card goes on looking perfectly sourced. Text fragments fail **silently** - a browser just loads
the page without highlighting - so the rot is invisible from both ends.

[`scripts/check_anchors.py`](../../scripts/check_anchors.py) is the fix. It needs the network, so
it is a local or scheduled audit and deliberately **not** part of the deploy gate.

## Run it

```bash
python scripts/check_anchors.py                        # every entry and every guide
python scripts/check_anchors.py delta-live-tables      # one or more entry ids
python scripts/check_anchors.py post:my-guide          # one guide, by slug
python scripts/check_anchors.py --list-blocked         # print only the blocked URLs
python scripts/check_anchors.py --fail-on-blocked      # treat BLOCKED as failure too
```

Build the data first - it reads `www/databricks.features.json`:

```bash
python scripts/build_features.py && python scripts/check_anchors.py <ids>
```

## Read the verdicts

| Verdict | Meaning | Action |
|---|---|---|
| **`OK`** | Live, and the cited quote was found if one was cited | none |
| **`DEAD`** | The page is gone (404/410/5xx/DNS), **or** it is readable and the cited text is *not* on it | fix it - see below |
| **`BLOCKED`** | The host refused a scripted request (403/429) or served no readable text | finish by hand - see below |

Two kinds of URL are judged differently. A URL with `#:~:text=` claims a specific sentence exists,
so the quote must actually be on the page. A plain URL only claims the page exists, so only
liveness is checked.

Every URL in an entry is swept: values under `link`, `url`, **and `source`**, at any depth. If you
are reading an older run and wondering why the canonical `source` never appeared, that is why - it
was added to the collected keys in August 2026.

## Fixing DEAD

A dead quote has three possible causes, in increasing order of importance:

1. **Your quote is wrong** - a paraphrase, or the encoding mangled it. Fix the fragment.
2. **The page was reworded** - update the fragment to the new exact sentence.
3. **The claim is no longer true.** This is the one that matters. A dead quote on a *live* vendor
   doc is often the first sign of a rename, which is this project's entire subject. Read the page
   before assuming it was a copy edit, then follow
   [re-verify-an-entry.md](re-verify-an-entry.md).

Never fix a DEAD quote by deleting the fragment. That silently downgrades a checkable claim to an
unchecked one.

## Fixing BLOCKED

`BLOCKED` says **nothing** about the link. The host refused a scripted request (403/429) or served
no readable text. It never fails the run unless you pass `--fail-on-blocked`.

Finish the job with a real browser, which these hosts serve normally:

```bash
python scripts/check_anchors.py --chrome            # retry every blocked page
python scripts/check_anchors.py --chrome <ids>      # or just the ones you touched
```

`--chrome` drives headless Edge or Chrome (whichever is installed) against only the pages already
judged `BLOCKED`, then re-checks their quotes exactly as it would for any other page - so a
recovered page becomes a normal `OK` or a normal `DEAD`, not a shrug. It is serial and slow, which
is why it is opt-in rather than the default.

If no browser is installed it says so and leaves the pages blocked. In that case list them and read
each one with your agent's own web-fetch tool instead:

```bash
python scripts/check_anchors.py --list-blocked
```

Historical note: this page used to claim these hosts turn away headless Chrome as well. They do
not - Medium's bot wall in particular yields immediately to `--headless=new --dump-dom`, which is
what prompted the flag.

## When to run it

- **After adding or editing any entry** - on just the ids you touched. Cheap and it is the only
  thing that proves your fragments work.
- **After writing or editing a guide** - `post:<slug>`.
- **Periodically over everything.** The dataset is a few hundred URLs against a vendor that
  rewrites its docs continuously; a full sweep is the routine audit that catches renames before
  anyone reports them.
