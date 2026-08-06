# How to add a category

`category` is a **closed allow-list**. The validator rejects anything outside it, on purpose: the
list is what the UI's filter chips are built from, so a typo would silently create a chip
containing exactly one entry.

## The current list

```
Data engineering
Compute / BI
Developer experience
Data governance
BI / Dashboards
AI / BI
AI / ML
```

## First, try not to

Pick the closest existing fit. Seven chips is already near the limit of what reads as a filter
row rather than a wall, and a category with one member is worse than a slightly loose fit.

## If a new one is genuinely warranted

1. Add it to `VALID_CATEGORIES` in [`scripts/validate.py`](../../scripts/validate.py):

   ```python
   VALID_CATEGORIES = (
       "Data engineering",
       ...
       "Your New Category",
   )
   ```

2. Use it in the entry YAML in the **same commit**. A category added without a user is dead code
   in a tuple.
3. Re-run the gate and look at the chip row:

   ```bash
   python scripts/build_features.py && python scripts/validate.py
   python -m http.server 8777 -d www
   ```

4. Update [reference/entry-schema.md](../reference/entry-schema.md) with the new value.
5. Add a **why then what** [`CHANGELOG.md`](../../CHANGELOG.md) entry. The *why* matters here:
   record what could not be expressed with the existing seven, so the next person does not undo
   it.

## Guide categories are different

Guide front matter also has a `category` field, but
[`validate_posts.py`](../../scripts/validate_posts.py) does **not** enforce a closed list for it -
the existing guide uses `Compute`, which is not an entry category. Convention is to reuse an entry
category where one fits, but nothing will stop you if you do not. What *is* enforced on a guide is
`kind`, which must be `guide`, `explainer`, or `opinion`.
