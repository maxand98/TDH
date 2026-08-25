import { describe, expect, it } from "vitest";
import { lookupRasterCollectorTdh, snapshotCacheState, type AssetFetcher, type CollectorSnapshot } from "../src/domain/raster-collector-register";

const registry = {
  snapshot_at: "2026-08-25T00:00:00Z",
  artists: [{ artist: "Casey REAS", slug: "casey-reas", raster_slug: "casey-reas", metric: { id: "crtdh", label: "crTDH" } }],
};
const snapshot = {
  schema: "ab5d-artist-collector-tdh/1", snapshot_at: "2026-08-25T00:00:00Z", status: "published",
  metric: { id: "crtdh", label: "crTDH" },
  artist: { name: "Casey REAS", slug: "casey-reas", raster_slug: "casey-reas", raster_url: "https://www.raster.art/artist/casey-reas" },
  corpus: { name: "Raster-indexed Casey REAS oeuvre", artworks: 2, tokens: 3, raster_collectors_reported: 2, eligible_collector_addresses: 2, reference_artwork_size: 1000, chains: ["eip155:1"] },
  method: { definition: "days times weight", edition_weight_formula: "reference / edition", collector_identity: "address", exclusions: "artist", price_input: "none", boosters: "none" },
  collectors: [
    { name: "Alpha", address: "0xaaa", works_held: 2, raw_work_days: 20, first_acquired_at: "2026-01-01T00:00:00Z", last_acquired_at: "2026-02-01T00:00:00Z", tdh: 200, daily_rate: 2, rank: 1 },
    { name: "Beta", address: "0xbbb", works_held: 1, raw_work_days: 10, first_acquired_at: "2026-03-01T00:00:00Z", last_acquired_at: "2026-03-01T00:00:00Z", tdh: 100, daily_rate: 1, rank: 2 },
  ],
};

const assets = {
  fetch(request: Request) {
    const path = new URL(request.url).pathname;
    return Promise.resolve(Response.json(path.endsWith("index.json") ? registry : snapshot));
  },
} satisfies AssetFetcher;

describe("Raster collector registers", () => {
  it("returns the artist-specific abTDH-equivalent collector corpus", async () => {
    const result = await lookupRasterCollectorTdh("https://www.raster.art/artist/casey-reas", assets, "https://mytdh.xyz", { limit: 5000 });
    expect(result.methodology).toBe("raster-artist-abtdh/1");
    expect(result.metric?.label).toBe("crTDH");
    expect(result.collectors).toHaveLength(2);
    expect(result.pagination?.total).toBe(2);
    expect(result.cache?.source).toBe("bundled");
  });

  it("supports agent pagination and filtering", async () => {
    const result = await lookupRasterCollectorTdh("raster.art/artist/casey-reas", assets, "https://mytdh.xyz", { limit: 1, query: "beta" });
    expect(result.collectors?.[0]?.name).toBe("Beta");
    expect(result.pagination).toMatchObject({ offset: 0, returned: 1, total: 1, nextOffset: null });
  });

  it("marks snapshots stale after 24 hours", () => {
    expect(snapshotCacheState("2026-08-25T00:00:00Z", Date.parse("2026-08-25T23:59:59Z")).stale).toBe(false);
    expect(snapshotCacheState("2026-08-25T00:00:00Z", Date.parse("2026-08-26T00:00:00Z")).stale).toBe(true);
  });

  it("prefers a newer generated snapshot over the bundled register", async () => {
    const generated: CollectorSnapshot = {
      ...snapshot,
      snapshot_at: "2026-08-26T00:00:00Z",
      metric: { id: "crtdh", label: "freshTDH" },
    };
    const store = {
      get<T>() { return Promise.resolve(generated as T); },
    };
    const result = await lookupRasterCollectorTdh("https://www.raster.art/artist/casey-reas", assets, "https://mytdh.xyz", {}, store);
    expect(result.metric?.label).toBe("freshTDH");
    expect(result.snapshotAt).toBe("2026-08-26T00:00:00Z");
    expect(result.cache?.source).toBe("generated");
  });
});
