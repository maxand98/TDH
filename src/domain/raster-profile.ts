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
  const candidate = input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid Raster artist profile URL");
  }

  if (!/^(www\.)?raster\.art$/i.test(url.hostname)) {
    throw new Error("Profile must be on raster.art");
  }
  const match = url.pathname.match(/^\/artist\/([^/]+)\/?$/i);
  if (!match?.[1]) throw new Error("Use a Raster artist profile, for example raster.art/artist/casey-reas");
  return decodeURIComponent(match[1]).toLowerCase();
}

export function findRasterArtistTdh(artists: RasterArtistTdh[], slug: string): RasterArtistTdh | null {
  return artists.find((artist) => artist.slug.toLowerCase() === slug.toLowerCase()) ?? null;
}
