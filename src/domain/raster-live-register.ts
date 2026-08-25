import type { RasterCollector } from "./raster-collector-register";

const GRAPHQL_URL = "https://api.raster.art/graphql";
const KIT_URL = "https://kit.raster.art";
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const DAY_MS = 86_400_000;
const MARKET_CUSTODY_NAMES = new Set(["teia", "objkt.com", "hen"]);

export type RasterArtwork = {
  id: string;
  slug: string | null;
  title: string;
  isSeries: boolean;
  editionSize: string | number | null;
  firstMintAt: string | null;
  platform: { id: string; name: string } | null;
};

export type RasterToken = {
  id: string;
  chainId: string;
  contractAddress: string;
  tokenId: string;
  tokenStandard: string;
  name: string | null;
  artworkId: string;
};

export type RasterOwner = {
  quantity: number | string;
  lastAcquiredAt: string | null;
  address: { address: string };
};

export type RasterArtist = {
  id: string;
  name: string;
  slug: string;
  addresses: string[];
  artworks: RasterArtwork[];
};

export type CollectorLabel = {
  address: string;
  name?: string | null;
  is_artist?: boolean;
};

type CollectorAccumulator = RasterCollector & {
  daily_rate_exact: number;
  parts: Map<string, { rawDays: number; weight: number }>;
};

function asArtwork(value: unknown): RasterArtwork {
  if (!isRecord(value)) throw new Error("Raster returned an invalid artwork");
  const platform = isRecord(value.platform) ? { id: String(value.platform.id), name: String(value.platform.name) } : null;
  return {
    id: String(value.id), slug: typeof value.slug === "string" ? value.slug : null,
    title: String(value.title), isSeries: value.isSeries === true,
    editionSize: typeof value.editionSize === "string" || typeof value.editionSize === "number" ? value.editionSize : null,
    firstMintAt: typeof value.firstMintAt === "string" ? value.firstMintAt : null, platform,
  };
}

function asOwner(value: unknown): RasterOwner {
  if (!isRecord(value) || !isRecord(value.address) || typeof value.address.address !== "string") {
    throw new Error("Raster returned an invalid ownership record");
  }
  return {
    quantity: typeof value.quantity === "number" || typeof value.quantity === "string" ? value.quantity : 0,
    lastAcquiredAt: typeof value.lastAcquiredAt === "string" ? value.lastAcquiredAt : null,
    address: { address: value.address.address },
  };
}

export type LiveCollectorSnapshot = {
  schema: "ab5d-artist-collector-tdh/1";
  generated_at: string;
  snapshot_at: string;
  status: "published";
  metric: { id: string; label: string };
  artist: {
    name: string;
    slug: string;
    raster_id: string;
    raster_slug: string;
    raster_url: string;
    addresses: string[];
  };
  corpus: {
    name: string;
    artworks: number;
    tokens: number;
    raster_collectors_reported: number;
    eligible_collector_addresses: number;
    reference_artwork_size: number;
    chains: string[];
  };
  method: {
    definition: string;
    edition_weight_formula: string;
    collector_identity: string;
    exclusions: string;
    price_input: "none";
    boosters: "none";
  };
  artworks: Array<{
    id: string;
    slug: string | null;
    title: string;
    platform: string | null;
    indexed_edition_size: number;
    indexed_tokens: number;
    is_series: boolean;
    first_mint_at: string | null;
    weight: number;
  }>;
  excluded: Array<{ address: string; works: number; reason: string }>;
  collectors: RasterCollector[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function boundedResponseJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`Raster returned HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_RESPONSE_BYTES) throw new Error("Raster response exceeded the safe size limit");
  if (!response.body) throw new Error("Raster returned an empty response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel("response too large");
        throw new Error("Raster response exceeded the safe size limit");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(text) as unknown;
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": "myTDH-raster-register/1",
      ...init?.headers,
    },
  });
  return boundedResponseJson(response);
}

async function graphql(query: string): Promise<Record<string, unknown>> {
  const value = await requestJson(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!isRecord(value)) throw new Error("Raster returned invalid GraphQL data");
  if (Array.isArray(value.errors) && value.errors.length) {
    const first: unknown = value.errors[0];
    throw new Error(isRecord(first) && typeof first.message === "string" ? first.message : "Raster GraphQL request failed");
  }
  if (!isRecord(value.data)) throw new Error("Raster returned no GraphQL data");
  return value.data;
}

const q = (value: string) => JSON.stringify(value);

export async function fetchRasterArtist(slug: string): Promise<RasterArtist> {
  const first = await graphql(`query { artistBySlug(slug:${q(slug)}) {
    id name slug addresses artworks(first:100) { pageInfo { hasNextPage endCursor } nodes {
      id slug title isSeries editionSize firstMintAt platform { id name }
    } }
  } }`);
  const artist = first.artistBySlug;
  if (!isRecord(artist)) throw new Error("Raster artist profile was not found");
  const connection = artist.artworks;
  if (!isRecord(connection) || !Array.isArray(connection.nodes) || !isRecord(connection.pageInfo)) {
    throw new Error("Raster artist oeuvre was invalid");
  }
  const artworks = connection.nodes.map(asArtwork);
  let page = connection.pageInfo;
  while (page.hasNextPage === true && typeof page.endCursor === "string") {
    const next = await graphql(`query { artistBySlug(slug:${q(slug)}) { artworks(first:100,after:${q(page.endCursor)}) {
      pageInfo { hasNextPage endCursor } nodes { id slug title isSeries editionSize firstMintAt platform { id name } }
    } } }`);
    const nextArtist = next.artistBySlug;
    const nextConnection = isRecord(nextArtist) ? nextArtist.artworks : null;
    if (!isRecord(nextConnection) || !Array.isArray(nextConnection.nodes) || !isRecord(nextConnection.pageInfo)) {
      throw new Error("Raster artwork pagination failed");
    }
    artworks.push(...nextConnection.nodes.map(asArtwork));
    page = nextConnection.pageInfo;
  }
  return {
    id: String(artist.id),
    name: String(artist.name),
    slug: String(artist.slug),
    addresses: Array.isArray(artist.addresses) ? artist.addresses.map(String) : [],
    artworks,
  };
}

export async function fetchArtworkTokens(artwork: RasterArtwork): Promise<RasterToken[]> {
  const tokens: RasterToken[] = [];
  let after: string | null = null;
  while (true) {
    const afterArg = after ? `,after:${q(after)}` : "";
    const data = await graphql(`query { artwork(id:${q(artwork.id)}) { tokens(first:250${afterArg}) {
      pageInfo { hasNextPage endCursor } nodes { id chainId contractAddress tokenId tokenStandard name }
    } } }`);
    const remoteArtwork = data.artwork;
    const connection = isRecord(remoteArtwork) ? remoteArtwork.tokens : null;
    if (!isRecord(connection) || !Array.isArray(connection.nodes) || !isRecord(connection.pageInfo)) {
      throw new Error(`Raster token data failed for ${artwork.title}`);
    }
    tokens.push(...connection.nodes.map((token) => ({ ...(token as Omit<RasterToken, "artworkId">), artworkId: artwork.id })));
    if (connection.pageInfo.hasNextPage !== true || typeof connection.pageInfo.endCursor !== "string") break;
    after = connection.pageInfo.endCursor;
  }
  return tokens;
}

export async function fetchTokenOwners(tokens: RasterToken[]): Promise<Record<string, RasterOwner[]>> {
  const fields = tokens.map((token, index) => `t${index}:token(id:${q(token.id)}) { owners(first:250) {
    pageInfo { hasNextPage endCursor } nodes { quantity lastAcquiredAt address { address } }
  } }`).join(" ");
  const data = await graphql(`query { ${fields} }`);
  const result: Record<string, RasterOwner[]> = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const remoteToken = data[`t${index}`];
    const connection = isRecord(remoteToken) ? remoteToken.owners : null;
    if (!isRecord(connection) || !Array.isArray(connection.nodes) || !isRecord(connection.pageInfo)) {
      throw new Error(`Raster owner data failed for token ${token.id}`);
    }
    const owners = connection.nodes.map(asOwner);
    let page = connection.pageInfo;
    while (page.hasNextPage === true && typeof page.endCursor === "string") {
      const next = await graphql(`query { token(id:${q(token.id)}) { owners(first:250,after:${q(page.endCursor)}) {
        pageInfo { hasNextPage endCursor } nodes { quantity lastAcquiredAt address { address } }
      } } }`);
      const nextToken = next.token;
      const nextConnection = isRecord(nextToken) ? nextToken.owners : null;
      if (!isRecord(nextConnection) || !Array.isArray(nextConnection.nodes) || !isRecord(nextConnection.pageInfo)) {
        throw new Error(`Raster owner pagination failed for token ${token.id}`);
      }
      owners.push(...nextConnection.nodes.map(asOwner));
      page = nextConnection.pageInfo;
    }
    result[token.id] = owners;
  }
  return result;
}

export async function fetchCollectorLabels(artistId: string): Promise<{ labels: Record<string, CollectorLabel>; total: number }> {
  const labels: Record<string, CollectorLabel> = {};
  let cursor: string | null = null;
  let total: number | undefined;
  do {
    const url = new URL(`${KIT_URL}/artist/${encodeURIComponent(artistId)}/collectors`);
    url.searchParams.set("limit", "200");
    url.searchParams.set("sort", "total");
    url.searchParams.set("dir", "desc");
    if (cursor) url.searchParams.set("cursor", cursor);
    const value = await requestJson(url.toString());
    if (!isRecord(value)) throw new Error("Raster collector labels were invalid");
    const collectors = Array.isArray(value.collectors) ? value.collectors : [];
    for (const collector of collectors) {
      if (!isRecord(collector) || typeof collector.address !== "string") continue;
      labels[collector.address.toLowerCase()] = collector as CollectorLabel;
    }
    total = Number(value.total_count ?? Object.keys(labels).length);
    cursor = typeof value.next_cursor === "string" ? value.next_cursor : null;
  } while (cursor && Object.keys(labels).length < 10_000);
  return { labels, total: total ?? Object.keys(labels).length };
}

function metricForArtist(name: string) {
  const initials = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^A-Za-z0-9]+/).filter(Boolean).map((part) => part[0]!.toLowerCase()).join("").slice(0, 5) || "artist";
  return { id: `${initials}tdh`, label: `${initials}TDH` };
}

function fullDays(value: string | null, snapshotAt: string) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.parse(snapshotAt) - Date.parse(value)) / DAY_MS));
}

function abbreviated(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function calculateLiveSnapshot(input: {
  artist: RasterArtist;
  tokensByArtwork: Record<string, RasterToken[]>;
  ownersByToken: Record<string, RasterOwner[]>;
  labels: Record<string, CollectorLabel>;
  rasterCollectorTotal: number;
  snapshotAt: string;
}): LiveCollectorSnapshot {
  const { artist, tokensByArtwork, ownersByToken, labels, rasterCollectorTotal, snapshotAt } = input;
  const artistAddresses = new Set(artist.addresses.map((address) => address.toLowerCase()));
  const artworks = artist.artworks.map((artwork) => {
    const tokens = tokensByArtwork[artwork.id] ?? [];
    const indexedSize = Math.max(tokens.length, Number(artwork.editionSize ?? 0), 1);
    return {
      id: artwork.id,
      slug: artwork.slug,
      title: artwork.title,
      platform: artwork.platform?.name ?? null,
      indexed_edition_size: indexedSize,
      indexed_tokens: tokens.length,
      is_series: artwork.isSeries,
      first_mint_at: artwork.firstMintAt,
      weight: 0,
    };
  }).filter((artwork) => artwork.indexed_tokens > 0);
  if (!artworks.length) throw new Error("Raster has no indexed tokens for this artist");
  const referenceSize = Math.max(...artworks.map((artwork) => artwork.indexed_edition_size));
  for (const artwork of artworks) artwork.weight = Math.round((referenceSize / artwork.indexed_edition_size) * 100) / 100;
  const artworkById = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const excluded = new Map<string, { works: number; reason: string }>();
  const collectorMap = new Map<string, CollectorAccumulator>();

  for (const tokens of Object.values(tokensByArtwork)) {
    for (const token of tokens) {
      const artwork = artworkById.get(token.artworkId);
      if (!artwork) continue;
      for (const owner of ownersByToken[token.id] ?? []) {
        const quantity = Number(owner.quantity ?? 0);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;
        const address = owner.address.address.toLowerCase();
        const label = labels[address];
        const name = String(label?.name || address);
        const normalizedName = name.trim().toLowerCase();
        const isArtist = artistAddresses.has(address) || label?.is_artist === true;
        const isMarket = normalizedName.includes("market-contract") || MARKET_CUSTODY_NAMES.has(normalizedName);
        if (isArtist || isMarket) {
          const current = excluded.get(address) ?? { works: 0, reason: isArtist ? "artist self-holding" : "marketplace custody" };
          current.works += quantity;
          excluded.set(address, current);
          continue;
        }
        const days = fullDays(owner.lastAcquiredAt, snapshotAt);
        const fresh: CollectorAccumulator = {
          name,
          address,
          works_held: 0,
          raw_work_days: 0,
          first_acquired_at: owner.lastAcquiredAt,
          last_acquired_at: owner.lastAcquiredAt,
          tdh: 0,
          daily_rate: 0,
          rank: 0,
          daily_rate_exact: 0,
          parts: new Map(),
        };
        const current = collectorMap.get(address) ?? fresh;
        current.works_held += quantity;
        current.raw_work_days += days * quantity;
        current.daily_rate_exact += artwork.weight * quantity;
        const part = current.parts.get(artwork.id) ?? { rawDays: 0, weight: artwork.weight };
        part.rawDays += days * quantity;
        current.parts.set(artwork.id, part);
        if (owner.lastAcquiredAt && (!current.first_acquired_at || owner.lastAcquiredAt < current.first_acquired_at)) current.first_acquired_at = owner.lastAcquiredAt;
        if (owner.lastAcquiredAt && (!current.last_acquired_at || owner.lastAcquiredAt > current.last_acquired_at)) current.last_acquired_at = owner.lastAcquiredAt;
        collectorMap.set(address, current);
      }
    }
  }

  const collectors = [...collectorMap.values()].map((record) => {
    record.tdh = [...record.parts.values()].reduce((total, part) => total + Math.round(part.rawDays * part.weight), 0);
    record.daily_rate = Math.round(record.daily_rate_exact);
    if (/^(0x|tz)/i.test(record.name)) record.name = abbreviated(record.address);
    const { daily_rate_exact: _dailyRateExact, parts: _parts, ...collector } = record;
    void _dailyRateExact;
    void _parts;
    return collector;
  }).sort((a, b) => b.tdh - a.tdh || b.works_held - a.works_held || a.address.localeCompare(b.address));
  collectors.forEach((collector, index) => { collector.rank = index + 1; });
  const allTokens = Object.values(tokensByArtwork).flat();

  return {
    schema: "ab5d-artist-collector-tdh/1",
    generated_at: new Date().toISOString(),
    snapshot_at: snapshotAt,
    status: "published",
    metric: metricForArtist(artist.name),
    artist: {
      name: artist.name,
      slug: artist.slug,
      raster_id: artist.id,
      raster_slug: artist.slug,
      raster_url: `https://www.raster.art/artist/${artist.slug}`,
      addresses: [...artistAddresses].sort(),
    },
    corpus: {
      name: `Raster-indexed ${artist.name} oeuvre`,
      artworks: artworks.length,
      tokens: allTokens.length,
      raster_collectors_reported: rasterCollectorTotal,
      eligible_collector_addresses: collectors.length,
      reference_artwork_size: referenceSize,
      chains: [...new Set(allTokens.map((token) => token.chainId))].sort(),
    },
    method: {
      definition: "Each currently held token or edition copy contributes one point for each full uninterrupted day since Raster's last-acquired timestamp, then receives an inverse indexed-edition-size weight.",
      edition_weight_formula: "largest indexed artwork size / artwork indexed edition size, rounded to two decimals before multiplication",
      collector_identity: "Each current ownership address is ranked independently; Raster collector names are shown where available.",
      exclusions: "Raster-listed artist addresses and identified marketplace custody are excluded.",
      price_input: "none",
      boosters: "none",
    },
    artworks: artworks.sort((a, b) => b.indexed_edition_size - a.indexed_edition_size || a.title.localeCompare(b.title)),
    excluded: [...excluded].map(([address, value]) => ({ address, ...value })).sort((a, b) => a.address.localeCompare(b.address)),
    collectors,
  };
}
