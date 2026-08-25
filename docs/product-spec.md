# Product specification

## Product statement

myTDH gives a digital artist a self-service, evidence-led view of the duration and breadth of current collecting across a declared on-chain oeuvre.

The product should answer three questions without requiring the artist to understand blockchain indexing:

1. What works and projects did the calculation include?
2. How long and how broadly are those works being held now?
3. Can another person reproduce or audit the result?

## Audience

### Primary

- Artists with one or more on-chain contracts or platform releases
- Artist studios and estates maintaining a verified oeuvre

### Secondary

- Collectors inspecting the composition of an artist's result
- Researchers comparing holding behaviour across a declared corpus
- Platforms embedding a versioned TDH snapshot through an API

## MVP scope

### Included

- Ethereum mainnet
- ERC-721 contracts
- ERC-1155 contracts where supply and transfer coverage can be reconciled
- Manual project/series grouping
- Manual artist/treasury exclusion addresses
- Current ownership and current uninterrupted holding periods
- Project-level and artist-level component measures
- Background calculation status and retry-safe jobs
- JSON and CSV export
- Immutable public snapshots with a methodology version and checksum

### Explicitly excluded from the MVP

- Price, floor, sales volume, rarity, bids, or social engagement
- Ranking artists by default
- Automatic wallet clustering beyond explicit artist declarations
- Cross-chain calculation
- Historical holding intervals after a work has been disposed
- Governance or eligibility based on a score
- Claims that TDH measures artistic merit

## Core screens

### 1. Landing / calculator

- A one-sentence definition
- Artist name
- Contract address input with chain fixed to Ethereum for the MVP
- `Add another contract`
- `Calculate preview`
- A visible methodology and privacy note

### 2. Oeuvre review

- Discovered contracts, token standards, total supply, and transfer coverage
- Project/series grouping editor
- Token-range inclusion and exclusion controls
- Artist-controlled and treasury wallet exclusions
- Custody and burned-token warnings
- A blocking state when supply or pagination cannot be reconciled

### 3. Calculation progress

- Stages: discover, index, reconcile, calculate, publish preview
- Counts rather than an indefinite spinner
- Recoverable errors and a calculation ID

### 4. Result

- TDH score and plain-language definition
- Snapshot timestamp and formula version
- Independent collector identities
- Eligible projects and works
- Raw collector-days
- Median project holding duration
- Coverage and exclusion notices
- Project breakdown with the inputs to each project score
- Download JSON/CSV

### 5. Claimed artist profile (post-MVP)

- Wallet-signed ownership or creator proof
- Saved oeuvre manifest
- Refresh cadence
- Public/private visibility
- Immutable history of previously published snapshots

## Trust model

An unclaimed result means only that someone entered a set of contracts. It must not imply artist endorsement.

A canonical artist page requires a signed claim from a verified creator address or a documented manual verification route. Claims prove control of a profile; they do not automatically prove authorship of every included work. The oeuvre manifest therefore retains per-entry attribution evidence.

## Success criteria for the first public beta

- A single-project ERC-721 artist can reach a reproducible result in under five minutes after indexing completes.
- The app refuses to publish partial pagination or unreconciled supply as a complete result.
- Re-running the same manifest, formula version, and snapshot boundary produces the same result.
- Every displayed aggregate can be traced to a project component and source block range.
- The methodology and all public snapshot schemas are documented in the repository.

## Product decisions still open

- Whether the public label is `TDH`, `artist TDH`, `aTDH`, or `oTDH`
- Whether signed claims use SIWE only or also platform verification
- Which indexer provides production-grade backfill after the no-key prototype
- Whether public profiles refresh daily or weekly
- Whether future cross-artist comparison is opt-in only
