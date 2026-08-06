# Why `status` is the sole discriminator

There is no `kind` field. An entry's `status.value` decides what the card is, which extra fields are
required, and how it renders. This page explains the principle behind that, because it is the design
decision the rest of the schema hangs off.

## The principle: store only what cannot be calculated

Every redundant field is a field that can disagree with another field. Two things that describe the
same fact will eventually drift, and when they do, nothing in the file tells you which one is right.
So the schema stores the minimum and derives everything else.

Three things are therefore **not** stored:

**1. Feature versus rename tip.** Both are `status.value: active`, because both are names in use now.
Which one a card is comes from which date field it carries: `introducedAt` for a standalone feature,
`from` for the current name of something renamed. The validator requires exactly one, which is what
makes the distinction unambiguous rather than merely conventional.

**2. Predecessors.** Only the forward link exists. A card says `successorId: x`; nothing says
`predecessorId`. "What came before this" is computed by scanning for cards whose `successorId` points
here. A backward link would be a second copy of the same edge, and a chain with one broken direction
is a bug that is invisible until someone reads the card.

**3. "Is this a rename?"** Nowhere in the data. A card reads as a rename tip because some other card
points at it. Add a `renamed` card pointing at an existing `active` card and the `active` card becomes
a rename tip with no edit to it at all.

## What *is* stored, and why it has to be

`status.value` holds the calls that genuinely cannot be derived:

| Value | The judgement it encodes |
|---|---|
| `active` | this name is in use now |
| `renamed` | this name was superseded by another name for the same thing |
| `deprecated` | Databricks announced a deprecation, with a date or timeline |
| `retired` | it is gone; access has ended |
| `legacy` | the docs call it legacy or unsupported, but **no formal deprecation date exists** |

The rename-versus-deprecation distinction is the interesting one. "Did the same thing get a new name,
or did a different thing take over?" is a **human judgement about product identity**, not a fact
derivable from the docs. `dbx` -> Asset Bundles is a deprecation: different tool, different config
format, same job. Delta Live Tables -> Lakeflow Declarative Pipelines is a rename: your 2021 code
still runs. No algorithm gets that right, so it is stored, and it is stored with a `link` and a `date`
so the call itself is sourced.

The `deprecated` / `legacy` split exists for the same reason. Both mean "do not build new things on
this", but only `deprecated` claims Databricks committed to a timeline. Collapsing them would put words
in the vendor's mouth, which is the confidently-wrong failure in miniature.

## Why maturity is a separate axis

`releases` is orthogonal to `status`, and the reason is that the two answer different questions:

- **`status`** - is this name the current one?
- **`releases`** - how finished is the thing?

Any combination is possible, and real examples exist for the awkward ones. A card can be `active` but
only `public-preview`. A card can be `legacy` but `beta` - shipped as Beta, later marked legacy without
ever reaching GA, which is what happened to Agent Bricks Custom LLM. If maturity lived inside `status`
you would need a value for every pair, and "legacy-but-beta" would either be unrepresentable or a
seventh enum member.

`releases` is a **timeline**, not a single value, for a related reason: the history is interesting and
the current state is recoverable from it. Store the stages, take the last one as current. Nothing to
keep in sync.

## What this buys you day to day

- **A rename is additive.** New file, plus one `successorId` edit on the predecessor. The old card is
  frozen, not mutated, so its history stays true.
- **Inserting a missed middle name touches one neighbour.** Repoint the predecessor. See
  [how-to/insert-a-name-in-a-rename-chain.md](../how-to/insert-a-name-in-a-rename-chain.md).
- **The validator can be strict**, because with no redundant fields there are no combinations it has to
  tolerate. `active` with a `to` date is unambiguously an error, not a style choice.
- **The UI derives the interesting parts.** Lineage chains, predecessor lists, filter buckets, timeline
  segments, the "days since the last change" counter - all computed from the same minimal edges.

## The cost

Derivation means the *interesting* structure is not visible in any single file. Reading
`kb/databricks/genie.yaml` does not tell you what preceded it; you have to grep for who points at it.
That is a real ergonomic loss, paid deliberately in exchange for chains that cannot be half-updated.
The UI's lineage line is the compensation: it shows the whole chain in one place, computed fresh every
time.
