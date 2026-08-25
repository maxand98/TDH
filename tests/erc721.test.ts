import { describe, expect, it } from "vitest";
import { reconstructCurrentErc721Holdings, type Erc721Transfer } from "../src/domain/erc721";

const zero = "0x0000000000000000000000000000000000000000";
const artist = "0x1111111111111111111111111111111111111111";
const walletA = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const walletB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const walletC = "0xcccccccccccccccccccccccccccccccccccccccc";

function transfer(overrides: Partial<Erc721Transfer> & Pick<Erc721Transfer, "tokenId" | "to" | "timestamp" | "blockNumber">): Erc721Transfer {
  return {
    from: zero,
    logIndex: 0,
    ...overrides,
  };
}

describe("reconstructCurrentErc721Holdings", () => {
  it("reconstructs current ownership and resets on reacquisition", () => {
    const holdings = reconstructCurrentErc721Holdings([
      transfer({ tokenId: "1", to: walletA, timestamp: "2026-01-01T00:00:00.000Z", blockNumber: 1 }),
      transfer({ tokenId: "1", from: walletA, to: walletB, timestamp: "2026-02-01T00:00:00.000Z", blockNumber: 2 }),
      transfer({ tokenId: "1", from: walletB, to: walletA, timestamp: "2026-03-01T00:00:00.000Z", blockNumber: 3 }),
      transfer({ tokenId: "2", to: artist, timestamp: "2026-01-01T00:00:00.000Z", blockNumber: 1, logIndex: 1 }),
    ], {
      projectId: "work",
      snapshotAt: "2026-08-25T00:00:00.000Z",
      excludedAddresses: [artist],
    });

    expect(holdings).toEqual([
      { tokenId: "work:1", identityId: walletA, acquiredAt: "2026-03-01T00:00:00.000Z" },
    ]);
  });

  it("preserves acquisition time across wallets in one declared identity", () => {
    const holdings = reconstructCurrentErc721Holdings([
      transfer({ tokenId: "7", to: walletA, timestamp: "2026-01-01T00:00:00.000Z", blockNumber: 1 }),
      transfer({ tokenId: "7", from: walletA, to: walletC, timestamp: "2026-06-01T00:00:00.000Z", blockNumber: 2 }),
    ], {
      projectId: "series",
      snapshotAt: "2026-08-25T00:00:00.000Z",
      identityByWallet: { [walletA]: "collector-one", [walletC]: "collector-one" },
    });

    expect(holdings).toEqual([
      { tokenId: "series:7", identityId: "collector-one", acquiredAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("tracks transfers out of an excluded artist wallet", () => {
    const holdings = reconstructCurrentErc721Holdings([
      transfer({ tokenId: "9", to: artist, timestamp: "2026-01-01T00:00:00.000Z", blockNumber: 1 }),
      transfer({
        tokenId: "9",
        from: artist,
        to: walletB,
        timestamp: "2026-04-01T00:00:00.000Z",
        blockNumber: 2,
      }),
    ], {
      projectId: "series",
      snapshotAt: "2026-08-25T00:00:00.000Z",
      excludedAddresses: [artist],
    });

    expect(holdings).toEqual([
      { tokenId: "series:9", identityId: walletB, acquiredAt: "2026-04-01T00:00:00.000Z" },
    ]);
  });

  it("ignores events after the snapshot and removes burned tokens", () => {
    const holdings = reconstructCurrentErc721Holdings([
      transfer({ tokenId: "1", to: walletA, timestamp: "2026-01-01T00:00:00.000Z", blockNumber: 1 }),
      transfer({ tokenId: "1", from: walletA, to: zero, timestamp: "2026-02-01T00:00:00.000Z", blockNumber: 2 }),
      transfer({ tokenId: "2", to: walletB, timestamp: "2026-09-01T00:00:00.000Z", blockNumber: 3 }),
    ], {
      projectId: "series",
      snapshotAt: "2026-08-25T00:00:00.000Z",
    });

    expect(holdings).toEqual([]);
  });

  it("refuses incomplete or inconsistent transfer history", () => {
    expect(() => reconstructCurrentErc721Holdings([
      transfer({
        tokenId: "1",
        from: walletA,
        to: walletB,
        timestamp: "2026-01-01T00:00:00.000Z",
        blockNumber: 1,
      }),
    ], {
      projectId: "series",
      snapshotAt: "2026-08-25T00:00:00.000Z",
    })).toThrow("Incomplete transfer history");

    expect(() => reconstructCurrentErc721Holdings([
      transfer({ tokenId: "1", to: walletA, timestamp: "2026-01-01T00:00:00.000Z", blockNumber: 1 }),
      transfer({
        tokenId: "1",
        from: walletC,
        to: walletB,
        timestamp: "2026-02-01T00:00:00.000Z",
        blockNumber: 2,
      }),
    ], {
      projectId: "series",
      snapshotAt: "2026-08-25T00:00:00.000Z",
    })).toThrow("Inconsistent transfer history");
  });
});
