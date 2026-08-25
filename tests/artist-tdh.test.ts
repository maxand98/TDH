import { describe, expect, it } from "vitest";
import fixture from "./fixtures/artist-tdh.json";
import { ARTIST_TDH_METHODOLOGY, calculateArtistTdh } from "../src/domain/artist-tdh";

describe("calculateArtistTdh", () => {
  it("matches the hand-worked two-project fixture", () => {
    const result = calculateArtistTdh(fixture);

    expect(result.methodology).toBe(ARTIST_TDH_METHODOLOGY);
    expect(result.projects[0]).toMatchObject({
      score: 40,
      collectorIdentities: 3,
      eligibleWorks: 3,
      rawCollectorDays: 60,
      medianIdentityHoldDays: 20,
    });
    expect(result.projects[1]).toMatchObject({
      score: 27.736844,
      collectorIdentities: 2,
      eligibleWorks: 3,
      rawCollectorDays: 60,
      medianIdentityHoldDays: 17.5,
    });
    expect(result.tdh).toBe(47.897182);
    expect(result.collectorIdentities).toBe(4);
    expect(result.eligibleProjects).toBe(2);
    expect(result.eligibleWorks).toBe(6);
    expect(result.rawCollectorDays).toBe(120);
  });

  it("gives duplicate copies one identity observation", () => {
    const result = calculateArtistTdh({
      artistId: "duplicates",
      snapshotAt: "2026-08-25T00:00:00.000Z",
      projects: [{
        id: "edition",
        label: "Edition",
        holdings: [
          { tokenId: "1", identityId: "collector", acquiredAt: "2026-08-05T00:00:00.000Z" },
          { tokenId: "2", identityId: "collector", acquiredAt: "2026-08-15T00:00:00.000Z" },
        ],
      }],
    });

    expect(result.collectorIdentities).toBe(1);
    expect(result.projects[0]?.medianIdentityHoldDays).toBe(15);
    expect(result.tdh).toBe(15);
  });

  it("refuses duplicate token and future-acquisition inputs", () => {
    expect(() => calculateArtistTdh({
      artistId: "bad",
      snapshotAt: "2026-08-25T00:00:00.000Z",
      projects: [{
        id: "one",
        label: "One",
        holdings: [
          { tokenId: "1", identityId: "a", acquiredAt: "2026-08-01T00:00:00.000Z" },
          { tokenId: "1", identityId: "b", acquiredAt: "2026-08-01T00:00:00.000Z" },
        ],
      }],
    })).toThrow("Duplicate token id");

    expect(() => calculateArtistTdh({
      artistId: "bad",
      snapshotAt: "2026-08-25T00:00:00.000Z",
      projects: [{
        id: "one",
        label: "One",
        holdings: [{ tokenId: "1", identityId: "a", acquiredAt: "2026-08-26T00:00:00.000Z" }],
      }],
    })).toThrow("after snapshot");
  });

  it("validates untrusted JSON before calculation", () => {
    expect(() => calculateArtistTdh({
      artistId: 42,
      snapshotAt: "2026-08-25T00:00:00.000Z",
      projects: [],
    })).toThrow("artistId must be a string");

    expect(() => calculateArtistTdh({
      artistId: "artist",
      snapshotAt: "2026-08-25T00:00:00.000Z",
      projects: [{ id: "one", label: "One", holdings: "not-an-array" }],
    })).toThrow("holdings must be an array");
  });
});
