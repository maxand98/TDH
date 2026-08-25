# Architecture and delivery plan

## Recommended shape

Use a React + TypeScript SPA and an API Worker in one Cloudflare Workers deployment. Static assets and `/api/*` routes ship as a single version. Keep chain indexing asynchronous so a long contract history never depends on a browser request remaining open.

```text
Browser
  -> Worker API
      -> D1 (manifests, normalized events, jobs, snapshots)
      -> Queue (discovery and indexing work)
          -> RPC/indexer adapters
      -> scheduled refresh for published profiles
```

## Components

### Web client

- React, TypeScript, Vite
- Accessible form-first calculator
- Polling or server-sent progress for background jobs
- Read-only result routes that render without wallet software
- viem for address validation, signatures, and chain types

### API Worker

Proposed routes:

```text
POST /api/calculations
GET  /api/calculations/:id
GET  /api/calculations/:id/result
POST /api/claims/nonce
POST /api/claims/verify
GET  /api/artists/:slug
GET  /api/snapshots/:id.json
```

The create endpoint validates and stores a manifest, returns a job ID, and enqueues bounded work. It must not calculate a large oeuvre synchronously.

### D1 data model

Minimum tables:

- `artists`: profile and claim state
- `artist_wallets`: declared creator, treasury, and exclusion addresses
- `contracts`: chain, address, standard, deployment block, coverage state
- `projects`: grouping and attribution metadata
- `project_tokens`: eligible token ranges or explicit token IDs
- `transfer_events`: normalized immutable chain events
- `current_holdings`: derived current owner and acquisition boundary
- `identity_wallets`: explicit wallet consolidation records
- `calculation_jobs`: stage, cursor, attempts, error, timestamps
- `snapshots`: manifest hash, methodology, components, checksum
- `snapshot_projects`: reproducible project-level components

All chain-specific payloads should be retained only where needed for audit and adapter debugging. The calculation operates on normalized events.

### Queue jobs

Jobs are small, idempotent, and cursor-based:

1. discover contract metadata;
2. establish deployment and snapshot block;
3. backfill a bounded event range;
4. reconcile supply and current owners;
5. classify exclusions/custody;
6. calculate project components;
7. aggregate and write an immutable snapshot.

Retrying a message must not duplicate events or snapshots. Unfinished pagination remains a job state, not a score.

### Chain adapter contract

```ts
interface ChainAdapter {
  discoverContract(input: ContractInput): Promise<ContractMetadata>;
  getSnapshotBoundary(at: Date): Promise<BlockBoundary>;
  fetchTransferPage(cursor: TransferCursor): Promise<TransferPage>;
  reconcileSupply(contract: ContractRef, at: BlockBoundary): Promise<SupplyCheck>;
}
```

Ethereum is the only MVP adapter. Additional EVM chains can reuse event normalization. Tezos and platform APIs should be separate adapters rather than conditionals inside the Ethereum path.

## Security and abuse controls

- Accept only checksummed or valid normalized addresses.
- Put strict limits on contracts, token ranges, pagination, and concurrent jobs.
- Rate-limit anonymous calculations by coarse request identity.
- Add Turnstile only when observed abuse warrants it.
- Never accept client-supplied totals, timestamps, holder lists, or completed status.
- Verify SIWE nonces server-side and bind claims to exact chain, domain, and expiry.
- Separate an unclaimed calculation from a verified artist profile in UI and schema.
- Escape token metadata and proxy or validate remote media.
- Keep provider keys in Worker secrets, never frontend variables.

## Delivery phases

### Phase 0: definition and fixtures

- Freeze `artist-tdh/1` and snapshot schema.
- Create hand-worked fixtures with expected project scores.
- Decide the public name and claim semantics.

Exit: formula tests and JSON schema tests pass.

### Phase 1: local calculator prototype

- Scaffold React/Worker application.
- Implement one Ethereum ERC-721 contract input.
- Backfill transfers from a no-key source for a deliberately small fixture.
- Produce a local auditable result without profiles or auth.

Exit: known fixture matches an independently calculated result.

### Phase 2: asynchronous MVP

- Add D1 schema and migrations.
- Add queue-backed backfill, cursors, retry safety, and supply reconciliation.
- Support multiple contracts, project grouping, exclusions, and ERC-1155.
- Add progress and incomplete-data UI.

Exit: three differently shaped artist oeuvres complete reproducibly.

### Phase 3: publishable beta

- Add signed claims and saved manifests.
- Add immutable snapshot pages and JSON/CSV exports.
- Add scheduled refreshes, monitoring, privacy copy, and rate limits.
- Deploy to Workers, attach the selected domain, and validate live hashes and API responses.

Exit: public beta matrix passes on desktop/mobile and published snapshots reproduce.

### Phase 4: broader oeuvre coverage

- Add EVM adapters, then Tezos.
- Add evidence-backed artist attribution and custody classification workflows.
- Add optional platform integrations and embeddable result cards.

Exit: cross-chain coverage is explicit per snapshot and missing adapters cannot masquerade as completeness.

## Initial issue set

1. Approve public naming and `artist-tdh/1` formula.
2. Create JSON schemas and deterministic fixtures.
3. Scaffold React + Worker project and CI.
4. Implement ERC-721 event normalization.
5. Implement current-holding reconstruction.
6. Implement project and artist calculators.
7. Add D1 migrations and repository layer.
8. Add queued cursor jobs and reconciliation gates.
9. Build oeuvre review and result screens.
10. Add exports, signed claims, refresh schedule, and production release checks.

## Release evidence

Treat each layer separately:

- Local: tests, typecheck, lint, build, fixture results
- GitHub: clean main branch and pushed commit
- Cloudflare: Worker version, bindings, migrations, and domain attachment
- Live: exact response markers, result schema, mobile layout, and API behaviour
