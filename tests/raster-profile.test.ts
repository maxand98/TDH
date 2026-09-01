import { describe, expect, it } from "vitest";
import { findRasterArtistTdh, rasterArtistSlug } from "../src/domain/raster-profile";

describe("Raster artist profiles", () => {
  it("accepts canonical Raster artist URLs", () => {
    expect(rasterArtistSlug("https://www.raster.art/artist/casey-reas")).toBe("casey-reas");
    expect(rasterArtistSlug("raster.art/artist/helena-sarin/")).toBe("helena-sarin");
  });

  it("turns artist names into Raster slugs", () => {
    expect(rasterArtistSlug("Joe Pease")).toBe("joe-pease");
    expect(rasterArtistSlug("Sasha Stiles")).toBe("sasha-stiles");
    expect(rasterArtistSlug("André Osé")).toBe("andre-ose");
  });

  it("rejects non-artist and non-Raster URLs", () => {
    expect(() => rasterArtistSlug("https://www.raster.art/collector/maxand98")).toThrow("Raster artist profile");
    expect(() => rasterArtistSlug("https://example.com/artist/casey-reas")).toThrow("raster.art");
  });

  it("matches a covered artist by slug", () => {
    const artist = { artist: "Casey Reas", slug: "casey-reas", otdh: 14755, collector_identities: 70, projects: 5, current_works: 50, raw_collector_days: 1000, rank: 26 };
    expect(findRasterArtistTdh([artist], "CASEY-REAS")).toEqual(artist);
    expect(findRasterArtistTdh([artist], "not-covered")).toBeNull();
  });
});
