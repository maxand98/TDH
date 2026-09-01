export type RasterArtistTdh = {
  artist: string;
  slug: string;
  otdh: number;
  collector_identities: number;
  projects: number;
  current_works: number;
  raw_collector_days: number;
  rank: number;
};

export function rasterArtistSlug(input: string): string {
  const value = input.trim();
  if (!value) throw new Error("Enter a Raster artist name or profile URL");

  const looksLikeProfile = /^https?:\/\//i.test(value) || /^(www\.)?raster\.art\//i.test(value);
  if (!looksLikeProfile) {
    const slug = value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug || slug.length > 100) throw new Error("Enter a valid Raster artist name");
    return slug;
  }

  const candidate = value.match(/^https?:\/\//i) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid Raster artist name or profile URL");
  }

  if (!/^(www\.)?raster\.art$/i.test(url.hostname)) {
    throw new Error("Profile must be on raster.art");
  }
  const match = url.pathname.match(/^\/artist\/([^/]+)\/?$/i);
  if (!match?.[1]) throw new Error("Use an artist name or Raster artist profile, for example Joe Pease");
  return decodeURIComponent(match[1]).toLowerCase();
}

export function findRasterArtistTdh(artists: RasterArtistTdh[], slug: string): RasterArtistTdh | null {
  return artists.find((artist) => artist.slug.toLowerCase() === slug.toLowerCase()) ?? null;
}
