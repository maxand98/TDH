# Methodology

## Terminology

Collector-side TDH normally sums the full days for which an identity has held works it still owns. This project transposes that holding-age principle to an artist's declared oeuvre.

The repository uses `artist-tdh/1` as the provisional machine-readable methodology identifier. The final public label remains a product decision.

## Formula

For an artist `a`:

- `P(a)` is the set of eligible projects in the declared oeuvre.
- `I(p)` is the set of eligible consolidated collector identities currently holding project `p`.
- `d(i,p)` is the mean uninterrupted full days for the eligible copies of `p` currently held by identity `i`.
- `n(p)` is the number of eligible collector identities currently holding `p`.

Each project score is:

```text
Q(p) = median over i in I(p) of d(i,p) * log2(1 + n(p))
```

The artist result is:

```text
artistTDH(a) = sum over p in P(a) of Q(p) / sqrt(|P(a)|)
```

## Required behaviours

- Only current uninterrupted holding periods contribute.
- Disposal ends a contribution; reacquisition starts a new period.
- Transfers inside an explicitly consolidated identity preserve the acquisition date.
- Multiple copies held by one identity are averaged into one project observation.
- Artist-controlled wallets, treasuries, burns, and unresolved custody are excluded or clearly flagged.
- Complete days use a declared UTC snapshot boundary.
- Price and transaction value have zero weight.
- Calculate at full precision and round published numeric components to six decimal places only after aggregation.
- Every formula change creates a new methodology version.

## Required published components

A score is incomplete unless published with:

- methodology and schema version;
- snapshot timestamp and source block boundary;
- declared corpus or oeuvre manifest hash;
- raw current collector-days;
- independent collector identities;
- eligible projects and works;
- median project holding duration;
- chain and indexing coverage;
- exclusions and unresolved custody count;
- per-project component scores.

## Snapshot schema sketch

```json
{
  "schema": "mytdh-snapshot/1",
  "methodology": "artist-tdh/1",
  "artist_id": "example-artist",
  "snapshot_at": "2026-08-25T00:00:00Z",
  "source_block": 0,
  "manifest_sha256": "...",
  "tdh": 0,
  "raw_collector_days": 0,
  "collector_identities": 0,
  "eligible_projects": 0,
  "eligible_works": 0,
  "median_project_hold_days": 0,
  "coverage": {
    "chains": ["ethereum"],
    "unresolved_custody": 0,
    "complete": true
  },
  "projects": []
}
```

Illustrative values are not real artist results.

## Validation fixtures

Before production, fixtures must cover:

- mint directly to current owner;
- transfer and reacquisition;
- internal transfer within a consolidated identity;
- one identity holding duplicate copies;
- ERC-1155 quantity changes;
- burn, treasury, escrow, and bridge addresses;
- paginated history ending exactly at a boundary;
- events after the snapshot block;
- chain reorganisation/finality boundary;
- incomplete history that returns `incomplete`, never a partial score.
