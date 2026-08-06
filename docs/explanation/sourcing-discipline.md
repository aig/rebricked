# The one rule, and what it costs

> **Real, sourced changes only. Never be confidently wrong.**
>
> The joke tolerates being late. It does not tolerate being wrong.

Every other decision in this repo is downstream of that sentence, so it is worth being precise about
what it means and what it costs.

## Why the bar is this high

The site is a joke about Databricks renaming things. That framing is exactly what makes accuracy
non-negotiable: a humour site people *use as a reference* has all the authority of documentation and
none of the accountability. Someone will paste a card into a Slack thread to settle an argument. If
the card is wrong, the site is worse than not existing, because being confidently wrong is more
expensive than being silent.

Note the asymmetry in the rule. **Late is fine.** A rename that shipped last week and is not here yet
costs a reader nothing; they simply do not find it. A rename recorded with the wrong date, or a
deprecation that never happened, costs them a wrong decision. So the project optimises hard against
one failure mode and shrugs at the other.

## What follows from it

Almost every field rule is this rule made mechanical:

| Rule | The failure it prevents |
|---|---|
| `source` required on every entry | an unsourced claim cannot exist |
| `verified` required, never a future date | you can always see how old the confirmation is |
| `status` carries its own `link` and `date` | the lifecycle call is itself sourced, not asserted |
| every date field is `{ date, link }` | a date is a claim too, and gets its own evidence |
| `what` and every `fact` carry a `link` | the description and the fun facts are held to the same bar as the status |
| dates are only `YYYY` or `YYYY-MM` | false precision is a lie about what you know |
| `limitations` omitted when the docs list none | inventing a limitation is worse than omitting the field |
| `#:~:text=` fragments on citations | the claim points at a *sentence*, not a page |
| `check_anchors.py` fetching every URL | a quote that stopped matching is a claim that stopped being sourced |

## The one deliberately fictional field

`prediction` is invented on purpose: made-up plausible *next* names, powering the "New" gag, the
card's AI-guess reveal, and the quiz's hardest distractors. It works precisely *because* everything
around it is real. The UI always labels it invented, and it is the only field allowed to be fiction.

`fact` is the field people misread as licence to be funny. **Only the tone is ours.** A fact must be
true and sourceable: what the thing actually does, how it works underneath, a URL that still betrays
the old name, an acronym kept through a rebrand, an engine codename, a documented quirk. The fun comes
from the framing, never from the content.

## Where judgement is allowed

Nowhere in an entry. An entry records what a name did; it has no opinion about whether you should use
the thing.

Guides are the exception, and they are hedged. A guide may argue, rank, and recommend, but:

- every *fact* still carries an inline citation with a text fragment
- every *judgement* sits in a `:::judgement` callout, so the reader sees the seam
- undocumented or unsupported territory sits in a `:::warning`
- `staleAfter` is a dated promise to re-verify, because cost advice rots in a way historical facts do
  not

That structure is the whole reason guides can live next to the data without eroding it. Remove the
callouts and you have a blog with a dataset attached, which is a different and less trustworthy thing.

## What "validate" means here

When someone asks to *validate the list*, they mean **fact-check each entry against its cited source
and current Databricks naming**. Running the schema gate is not validation; it checks shape, and a
perfectly-shaped entry can be entirely false. The two live in different scripts for that reason:
`validate.py` never touches the network, and `check_anchors.py` exists because shape checking is not
enough.

## The costs, stated plainly

This discipline is not free, and pretending otherwise leads people to quietly abandon it:

- **Adding an entry takes 30 minutes, not 3.** Most of it is reading vendor docs to find the sentence
  that actually states the date.
- **Coverage lags.** [`COVERAGE-GAPS.md`](../../COVERAGE-GAPS.md) exists because there are more
  products in the release notes than in the dataset, and that is the accepted trade.
- **Citations rot** and someone has to sweep them. See [citation-rot.md](citation-rot.md).
- **Some things simply cannot be added.** If a rename is real but nobody documented it, it does not go
  in. The right output is a report of what could not be confirmed, not a card with a guess in it.

The correct response to a claim you cannot verify is always the same: **do not add it, and say what
you could not confirm.**
