# TDH

An open web app that publishes an artist-specific, abTDH-equivalent collector holding-time register from a Raster profile.

Working product name: **myTDH**

Production: **[mytdh.xyz](https://mytdh.xyz)**

## What it measures

The primary product is a collector-by-collector register: uninterrupted days held for every current eligible work, weighted inversely by indexed edition size and added for each collector address. It adapts the supply-resistance principle of AB5D's abTDH to one artist's Raster-indexed oeuvre. It is not oTDH.

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

Current foundation implemented:

- deterministic `artist-tdh/1` calculator;
- ERC-721 current-ownership reconstruction;
- reacquisition resets and declared-identity internal transfer preservation;
- artist, treasury, burn, and custody-address exclusions;
- Cloudflare Worker health, methodology, and calculation endpoints;
- Raster-profile collector register at `/calculate`, backed by published Raster-indexed oeuvre snapshots;
- public CORS-enabled JSON API, OpenAPI document, `llms.txt`, and stateless MCP server;
- Cloudflare deployment on the `mytdh.xyz` custom domain;
- hand-worked fixtures and failure-state tests.

Raster profiles without a published reproducible collector snapshot return an explicit uncovered result rather than a fabricated score.

- [Product specification](docs/product-spec.md)
- [Methodology](docs/methodology.md)
- [Architecture and delivery plan](docs/architecture.md)
- [Domain research](docs/domain-research.md)
- [Visual system and guardrails](docs/design-system.md)
- [Agent, API, and MCP access](docs/agent-api.md)

## Proposed stack

- React + TypeScript + Vite
- Cloudflare Worker for the API and static assets
- Cloudflare D1 for artist, oeuvre, transfer, job, and snapshot records
- Cloudflare Queues for bounded asynchronous indexing and calculation work
- Cron Trigger for refreshes of published profiles
- Ethereum adapter first; EVM, Tezos, and other chains behind a common adapter contract later

## Local development

```bash
npm install
npm run types:worker
npm run dev
```

Validation:

```bash
npm run check
npm run worker:startup
```

Local API routes:

- `GET /api/health`
- `GET /api/methodology`
- `GET /api/raster-collector-tdh?profile={raster_artist_profile_url}&offset=0&limit=100`
- `POST /api/calculate`
- `POST /mcp` (Streamable HTTP)

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
