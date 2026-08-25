import { findRasterArtistTdh, rasterArtistSlug, type RasterArtistTdh } from "../src/domain/raster-profile";

type OtdhSnapshot = {
  artists: RasterArtistTdh[];
  method?: string;
  schema?: string;
  snapshot_at?: string;
};

export type RasterTdhLookup = {
  covered: boolean;
  slug: string;
  profile: string;
  corpus: string;
  message?: string;
  methodology?: string;
  schema?: string;
  snapshotAt?: string;
  artist?: RasterArtistTdh;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isArtist(value: unknown): value is RasterArtistTdh {
  if (!isRecord(value)) return false;
  return typeof value.artist === "string"
    && typeof value.slug === "string"
    && isFiniteNumber(value.otdh)
    && isFiniteNumber(value.collector_identities)
    && isFiniteNumber(value.projects)
    && isFiniteNumber(value.current_works)
    && isFiniteNumber(value.raw_collector_days)
    && isFiniteNumber(value.rank);
}

function parseSnapshot(value: unknown): OtdhSnapshot {
  if (!isRecord(value) || !Array.isArray(value.artists) || !value.artists.every(isArtist)) {
    throw new Error("The TDH corpus returned an invalid snapshot");
  }
  return {
    artists: value.artists,
    method: typeof value.method === "string" ? value.method : undefined,
    schema: typeof value.schema === "string" ? value.schema : undefined,
    snapshot_at: typeof value.snapshot_at === "string" ? value.snapshot_at : undefined,
  };
}

export async function lookupRasterTdh(profileInput: string): Promise<RasterTdhLookup> {
  const slug = rasterArtistSlug(profileInput);
  const snapshotResponse = await fetch("https://ab5d.xyz/api/otdh", {
    headers: { accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 3600 },
  });
  if (!snapshotResponse.ok) throw new Error("The TDH corpus is temporarily unavailable");
  const declaredLength = Number(snapshotResponse.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 2 * 1024 * 1024) {
    throw new Error("The TDH corpus exceeded its response limit");
  }
  const snapshot = parseSnapshot(await snapshotResponse.json());
  const artist = findRasterArtistTdh(snapshot.artists, slug);
  const base = {
    slug,
    profile: `https://www.raster.art/artist/${slug}`,
    corpus: "AB[500] / 500 Art Blocks projects",
  };
  if (!artist) {
    return {
      ...base,
      covered: false,
      message: "This artist is not yet covered by the declared AB[500] corpus.",
    };
  }
  return {
    ...base,
    covered: true,
    methodology: snapshot.method,
    schema: snapshot.schema,
    snapshotAt: snapshot.snapshot_at,
    artist,
  };
}
