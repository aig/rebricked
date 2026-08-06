# Why citation rot has its own checker

`validate.py` never fetches a URL. It checks that a link *looks* like a link. That leaves one failure
mode wide open, and it is the one that matters most here:

**Databricks edits a doc page. The `#:~:text=` fragment stops matching. The card goes on looking
perfectly sourced.**

[`check_anchors.py`](../../scripts/check_anchors.py) exists for exactly that.

## Why text fragments, and why they are dangerous

A citation to a page is weak. Vendor doc pages are long, get restructured, and often do not contain the
claim you think they do by the time someone checks. So citations here point at a **sentence**, using the
`#:~:text=` URL fragment - the browser scrolls to and highlights the exact quote.

That is a genuine upgrade in accountability. It also introduces a uniquely nasty failure: **text
fragments fail silently.** If the quote no longer matches, the browser just loads the page normally. No
error, no warning, nothing in the console. The link still works, still goes somewhere plausible, and the
reader has no way to know the highlight did not happen. The rot is invisible from both ends - the reader
cannot see it, and the maintainer cannot see it by reading the YAML.

A silent failure that leaves the artifact looking *more* credible than it is is the worst kind of
failure for this project specifically, because the entire premise is that the cards are trustworthy.

## What the checker actually claims

Two kinds of URL, judged differently, because they claim different things:

| URL | Claim | What is checked |
|---|---|---|
| with `#:~:text=` | "this page contains this sentence" | the page is live **and** the quote is on it |
| plain | "this page exists" | liveness only |

Three verdicts, and the design decision is in the third:

- **`OK`** - live, and the quote was found if one was cited.
- **`DEAD`** - the page is gone (404/410/5xx/DNS), **or** it is readable and the cited text is not on
  it. A real problem either way.
- **`BLOCKED`** - the host refused a scripted request (403/429) or served no readable text.

**`BLOCKED` never fails the run.** That is deliberate, and it is a statement about what the tool knows: a
403 says something about the host's bot policy and nothing at all about the link. These hosts turn away
real headless Chrome and serve the same page fine to a person. A checker that treated bot-hostility as
citation rot would produce noise, and a noisy checker gets ignored, which costs you the DEAD findings
too.

So the tool separates *"this is wrong"* from *"I could not tell"*, and hands the second category back to
a human with `--list-blocked`. There are usually one or two, no `#:~:text=` quote in the dataset depends
on a blocked host, and the documented procedure is to finish them with a web-fetch tool that goes out
over a different path.

## Why a dead quote is often good news

Here is the part that makes this more than hygiene. The project's subject is Databricks renaming things.
So consider what a `DEAD` verdict on a *live* page means: the doc is still there, and the sentence that
described the product changed.

**That is frequently the first sign of a rename** - earlier than the release notes, earlier than anyone
reporting it. The checker built to protect the citations turns out to be a change detector for the thing
the site is about. Which is why the guidance is to read the page rather than mechanically re-quote it: a
reworded sentence is sometimes a copy edit and sometimes a product you now need a new card for.

The corollary is a rule with no exceptions: **never fix a DEAD quote by deleting the fragment.** That
converts a checkable claim into an unchecked one, silences the alarm, and leaves the card looking exactly
as sourced as before. It is the single change in this repo that most reduces trustworthiness while
appearing to fix something.

## Why it is not in the deploy gate

It needs the network and hits a few hundred third-party URLs. Rate limits and transient outages would
make it flaky, and a flaky gate is one people learn to re-run until it passes - at which point it stops
catching anything.

So the split is deliberate:

| | Deploy gate | Audit |
|---|---|---|
| Scripts | `validate.py`, `validate_posts.py` | `check_anchors.py` |
| Network | never | always |
| Deterministic | yes | no |
| Run by | CI, on every PR | a human, locally or on a schedule |
| Blocks a merge | yes | no |

The gate is fast and hermetic so it is always trusted. The audit is slow and judgement-requiring so it is
run by someone who can interpret a result. Both are necessary; conflating them would ruin the first.

## Guides are swept the same way

A guide's front-matter `sources` and every http(s) link in its body are checked under the id
`post:<slug>`. Guides cite the same way entries do, inline with text fragments, so they rot the same way
and get the same treatment. It also means `staleAfter` and the anchor check cover different things:
`staleAfter` asks "is this advice still current?", the anchor check asks "does the source still say
this?"
