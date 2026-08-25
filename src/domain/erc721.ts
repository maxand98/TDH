import type { CurrentHolding } from "./artist-tdh";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

export type Erc721Transfer = {
  tokenId: string;
  from: string;
  to: string;
  timestamp: string;
  blockNumber: number;
  logIndex: number;
};

export type ReconstructErc721Options = {
  projectId: string;
  snapshotAt: string;
  identityByWallet?: Readonly<Record<string, string>>;
  excludedAddresses?: readonly string[];
};

type TokenState = {
  owner: string;
  identityId: string;
  acquiredAt: string;
};

function normalizeAddress(value: string): string {
  if (!ADDRESS_PATTERN.test(value)) throw new Error(`Invalid Ethereum address: ${value}`);
  return value.toLowerCase();
}

function requireOrderValue(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
  return value;
}

export function reconstructCurrentErc721Holdings(
  events: readonly Erc721Transfer[],
  options: ReconstructErc721Options,
): CurrentHolding[] {
  const snapshotMs = Date.parse(options.snapshotAt);
  if (!Number.isFinite(snapshotMs)) throw new Error(`Invalid snapshot timestamp: ${options.snapshotAt}`);
  const projectId = options.projectId.trim();
  if (!projectId) throw new Error("projectId must not be empty");

  const identities = new Map(
    Object.entries(options.identityByWallet ?? {}).map(([wallet, identity]) => [
      normalizeAddress(wallet),
      identity.trim() || normalizeAddress(wallet),
    ]),
  );
  const excluded = new Set((options.excludedAddresses ?? []).map(normalizeAddress));
  const terminalAddresses = new Set([ZERO_ADDRESS, DEAD_ADDRESS]);
  excluded.add(ZERO_ADDRESS);
  excluded.add(DEAD_ADDRESS);

  const ordered = events
    .map((event) => ({
      ...event,
      tokenId: event.tokenId.trim(),
      from: normalizeAddress(event.from),
      to: normalizeAddress(event.to),
      timestampMs: Date.parse(event.timestamp),
      blockNumber: requireOrderValue(event.blockNumber, "blockNumber"),
      logIndex: requireOrderValue(event.logIndex, "logIndex"),
    }))
    .filter((event) => {
      if (!event.tokenId) throw new Error("tokenId must not be empty");
      if (!Number.isFinite(event.timestampMs)) throw new Error(`Invalid event timestamp: ${event.timestamp}`);
      return event.timestampMs <= snapshotMs;
    })
    .sort((left, right) => left.blockNumber - right.blockNumber || left.logIndex - right.logIndex);

  const stateByToken = new Map<string, TokenState>();
  const seenEventOrders = new Set<string>();
  for (const event of ordered) {
    const eventOrder = `${event.blockNumber}:${event.logIndex}`;
    if (seenEventOrders.has(eventOrder)) throw new Error(`Duplicate transfer order: ${eventOrder}`);
    seenEventOrders.add(eventOrder);

    const previous = stateByToken.get(event.tokenId);
    if (previous && previous.owner !== event.from) {
      throw new Error(`Inconsistent transfer history for token ${event.tokenId}`);
    }
    if (!previous && event.from !== ZERO_ADDRESS && event.from !== DEAD_ADDRESS) {
      throw new Error(`Incomplete transfer history for token ${event.tokenId}`);
    }

    if (terminalAddresses.has(event.to)) {
      stateByToken.delete(event.tokenId);
      continue;
    }

    const nextIdentity = identities.get(event.to) ?? event.to;
    const acquiredAt = previous?.identityId === nextIdentity ? previous.acquiredAt : event.timestamp;
    stateByToken.set(event.tokenId, {
      owner: event.to,
      identityId: nextIdentity,
      acquiredAt,
    });
  }

  return [...stateByToken.entries()]
    .filter(([, state]) => !excluded.has(state.owner))
    .map(([tokenId, state]) => ({
      tokenId: `${projectId}:${tokenId}`,
      identityId: state.identityId,
      acquiredAt: state.acquiredAt,
    }))
    .sort((left, right) => left.tokenId.localeCompare(right.tokenId, "en", { numeric: true }));
}
