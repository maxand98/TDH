# TDH

An open web app that lets any digital artist calculate a transparent Total Days Held signal for their own oeuvre.

Working product name: **myTDH**

Provisional domain: **mytdh.xyz** (available on Cloudflare Registrar on 25 August 2026; not purchased)

## What it measures

The first product is an artist-side TDH calculation: how long independent collector identities have continuously held the artist's currently held works, with controls for supply, duplicate ownership, self-holding, and prolific release schedules.

It is a holding-behaviour signal, not a price, sales, fame, quality, governance, or reputation score.

Every result must show its formula version, snapshot time, declared oeuvre, chain coverage, raw component measures, and exclusions. A score without its provenance is not a valid TDH result.

## MVP user journey

1. Enter an artist name and one or more Ethereum contracts.
2. Group contracts or token ranges into projects/series.
3. Declare artist-controlled and treasury wallets to exclude.
4. Preview the discovered supply, current holders, transfer coverage, and unresolved custody.
5. Run a calculation in the background.
6. Review the score with its components and an auditable project breakdown.
7. Export a versioned JSON result or share a permanent snapshot URL.

Wallet connection is not required for an exploratory calculation. A signed claim is introduced later for saving an artist profile and publishing a canonical result.

## Repository status

This repository currently contains the product, methodology, architecture, and delivery plan. It does not yet contain a deployed application.

- [Product specification](docs/product-spec.md)
- [Methodology](docs/methodology.md)
- [Architecture and delivery plan](docs/architecture.md)
- [Domain research](docs/domain-research.md)

## Proposed stack

- React + TypeScript + Vite
- Cloudflare Worker for the API and static assets
- Cloudflare D1 for artist, oeuvre, transfer, job, and snapshot records
- Cloudflare Queues for bounded asynchronous indexing and calculation work
- Cron Trigger for refreshes of published profiles
- Ethereum adapter first; EVM, Tezos, and other chains behind a common adapter contract later

## Principles

- Transparent before impressive
- Current uninterrupted holding periods, not trading volume
- One collector identity is one observation per project
- No market-price inputs
- Explicit coverage and incomplete-data failure states
- Versioned formulas and immutable published snapshots
- Exploratory calculations can be unclaimed; canonical profiles require proof

## License

Planning material and future source code are released under the MIT License.
