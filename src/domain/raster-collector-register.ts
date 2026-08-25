import { rasterArtistSlug } from "./raster-profile";

export type AssetFetcher = { fetch(request: Request): Promise<Response> };
export type RegisterStore = { get<T>(key: string, type: "json"): Promise<T | null> };

export const RASTER_COLLECTOR_TDH_METHODOLOGY = "raster-artist-abtdh/1";
export const REGISTER_MAX_AGE_SECONDS = 24 * 60 * 60;

export type RasterCollector = {
  name: string;
  address: string;
  works_held: number;
  raw_work_days: number;
  first_acquired_at: string | null;
  last_acquired_at: string | null;
  tdh: number;
  daily_rate: number;
  rank: number;
};

type RegistryEntry = {
  artist: string;
  slug: string;
  raster_slug: string;
  metric: { id: string; label: string };
};

type Registry = {
  snapshot_at: string;
  artists: RegistryEntry[];
};

export type CollectorSnapshot = {
  schema: string;
  snapshot_at: string;
  status: string;
  metric: { id: string; label: string };
  artist: { name: string; slug: string; raster_slug: string; raster_url: string };
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
    price_input: string;
    boosters: string;
  };
  collectors: RasterCollector[];
};

export type RasterCollectorTdhResult = {
  covered: boolean;
  methodology: string;
  profile: string;
  slug: string;
  message?: string;
  schema?: string;
  snapshotAt?: string;
  metric?: { id: string; label: string };
  artist?: CollectorSnapshot["artist"];
  corpus?: CollectorSnapshot["corpus"];
  method?: CollectorSnapshot["method"];
  collectors?: RasterCollector[];
  pagination?: { offset: number; limit: number; returned: number; total: number; nextOffset: number | null };
  cache?: {
    source: "bundled" | "generated";
    age_seconds: number;
    max_age_seconds: number;
    stale: boolean;
    revalidating?: boolean;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRegistry(value: unknown): Registry {
  if (!isRecord(value) || !Array.isArray(value.artists)) throw new Error("The collector registry is invalid");
  return value as Registry;
}

function parseSnapshot(value: unknown): CollectorSnapshot {
  if (!isRecord(value) || value.status !== "published" || !Array.isArray(value.collectors)) {
    throw new Error("The collector register is not published");
  }
  return value as CollectorSnapshot;
}

function snapshotTime(snapshot: CollectorSnapshot): number {
  const value = Date.parse(snapshot.snapshot_at);
  return Number.isFinite(value) ? value : 0;
}

export function snapshotCacheState(snapshotAt: string, now = Date.now()) {
  const timestamp = Date.parse(snapshotAt);
  const ageSeconds = Number.isFinite(timestamp) ? Math.max(0, Math.floor((now - timestamp) / 1_000)) : Number.MAX_SAFE_INTEGER;
  return {
    age_seconds: ageSeconds,
    max_age_seconds: REGISTER_MAX_AGE_SECONDS,
    stale: ageSeconds >= REGISTER_MAX_AGE_SECONDS,
  };
}

async function assetJson(assets: AssetFetcher, origin: string, pathname: string): Promise<unknown> {
  const response = await assets.fetch(new Request(new URL(pathname, origin)));
  if (!response.ok) throw new Error("The collector register is temporarily unavailable");
  return response.json();
}

export async function lookupRasterCollectorTdh(
  profileInput: string,
  assets: AssetFetcher,
  origin: string,
  options: { offset?: number; limit?: number; query?: string } = {},
  store?: RegisterStore,
): Promise<RasterCollectorTdhResult> {
  const rasterSlug = rasterArtistSlug(profileInput);
  const registry = parseRegistry(await assetJson(assets, origin, "/data/raster-collector-tdh/index.json"));
  const entry = registry.artists.find((artist) => artist.raster_slug.toLowerCase() === rasterSlug);
  const base = {
    covered: false,
    methodology: RASTER_COLLECTOR_TDH_METHODOLOGY,
    slug: rasterSlug,
    profile: `https://www.raster.art/artist/${rasterSlug}`,
  };
  let bundled: CollectorSnapshot | null = null;
  if (entry) {
    bundled = parseSnapshot(await assetJson(assets, origin, `/data/raster-collector-tdh/${entry.slug}.json`));
  }
  const storedValue = store ? await store.get<CollectorSnapshot>(`registers/${rasterSlug}/latest.json`, "json") : null;
  const stored = storedValue ? parseSnapshot(storedValue) : null;
  if (!bundled && !stored) {
    return {
      ...base,
      message: "This Raster profile does not yet have a generated collector holding-time register.",
    };
  }
  const useGenerated = Boolean(stored && (!bundled || snapshotTime(stored) > snapshotTime(bundled)));
  const snapshot = useGenerated ? stored! : bundled!;
  const query = options.query?.trim().toLowerCase() ?? "";
  const matching = query
    ? snapshot.collectors.filter((collector) => collector.name.toLowerCase().includes(query) || collector.address.toLowerCase().includes(query))
    : snapshot.collectors;
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = Math.min(5_000, Math.max(1, Math.floor(options.limit ?? 100)));
  const collectors = matching.slice(offset, offset + limit);
  const nextOffset = offset + collectors.length < matching.length ? offset + collectors.length : null;

  return {
    ...base,
    covered: true,
    schema: snapshot.schema,
    snapshotAt: snapshot.snapshot_at,
    metric: snapshot.metric,
    artist: snapshot.artist,
    corpus: snapshot.corpus,
    method: snapshot.method,
    collectors,
    pagination: { offset, limit, returned: collectors.length, total: matching.length, nextOffset },
    cache: {
      source: useGenerated ? "generated" : "bundled",
      ...snapshotCacheState(snapshot.snapshot_at),
    },
  };
}
