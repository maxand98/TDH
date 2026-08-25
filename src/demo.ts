import type { ArtistTdhInput } from "./domain/artist-tdh";

export const DEMO_INPUT: ArtistTdhInput = {
  artistId: "example-artist",
  snapshotAt: "2026-08-25T00:00:00.000Z",
  projects: [
    {
      id: "signal-one",
      label: "Signal One",
      holdings: [
        { tokenId: "1", identityId: "collector-a", acquiredAt: "2024-08-25T00:00:00.000Z" },
        { tokenId: "2", identityId: "collector-b", acquiredAt: "2025-08-25T00:00:00.000Z" },
        { tokenId: "3", identityId: "collector-c", acquiredAt: "2026-02-25T00:00:00.000Z" }
      ]
    },
    {
      id: "signal-two",
      label: "Signal Two",
      holdings: [
        { tokenId: "1", identityId: "collector-a", acquiredAt: "2023-08-25T00:00:00.000Z" },
        { tokenId: "2", identityId: "collector-a", acquiredAt: "2025-08-25T00:00:00.000Z" },
        { tokenId: "3", identityId: "collector-d", acquiredAt: "2024-08-25T00:00:00.000Z" }
      ]
    }
  ]
};
