import { describe, expect, it } from "vitest";
import { calculateLiveSnapshot, type RasterArtist, type RasterToken } from "../src/domain/raster-live-register";

const artist: RasterArtist = {
  id: "1644",
  name: "Joe Pease",
  slug: "joe-pease",
  addresses: ["0xartist"],
  artworks: [
    { id: "large", slug: "large", title: "Large", isSeries: true, editionSize: "100", firstMintAt: null, platform: null },
    { id: "small", slug: "small", title: "Small", isSeries: true, editionSize: "10", firstMintAt: null, platform: null },
  ],
};

const tokens: Record<string, RasterToken[]> = {
  large: [{ id: "token-large", chainId: "eip155:1", contractAddress: "0x1", tokenId: "1", tokenStandard: "ERC721", name: null, artworkId: "large" }],
  small: [{ id: "token-small", chainId: "eip155:1", contractAddress: "0x2", tokenId: "2", tokenStandard: "ERC721", name: null, artworkId: "small" }],
};

describe("live Raster collector register calculation", () => {
  it("weights uninterrupted current holdings and excludes the artist", () => {
    const snapshot = calculateLiveSnapshot({
      artist,
      tokensByArtwork: tokens,
      ownersByToken: {
        "token-large": [
          { quantity: 1, lastAcquiredAt: "2026-08-15T00:00:00.000Z", address: { address: "0xcollector" } },
          { quantity: 1, lastAcquiredAt: "2026-08-15T00:00:00.000Z", address: { address: "0xartist" } },
        ],
        "token-small": [{ quantity: 1, lastAcquiredAt: "2026-08-15T00:00:00.000Z", address: { address: "0xcollector" } }],
      },
      labels: { "0xcollector": { address: "0xcollector", name: "Collector" } },
      rasterCollectorTotal: 2,
      snapshotAt: "2026-08-25T00:00:00.000Z",
    });

    expect(snapshot.metric.label).toBe("jpTDH");
    expect(snapshot.collectors).toHaveLength(1);
    expect(snapshot.collectors[0]).toMatchObject({ name: "Collector", works_held: 2, raw_work_days: 20, daily_rate: 11, tdh: 110 });
    expect(snapshot.excluded).toEqual([{ address: "0xartist", works: 1, reason: "artist self-holding" }]);
  });
});
