import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const openapi = JSON.parse(readFileSync(new URL("../public/openapi.json", import.meta.url), "utf8")) as {
  openapi?: string;
  paths?: Record<string, unknown>;
};
const llms = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../public/.well-known/mcp.json", import.meta.url), "utf8")) as {
  endpoint?: string;
  transport?: string;
  tools?: Array<{ name?: string }>;
};

describe("agent discovery surfaces", () => {
  it("publishes the API through OpenAPI 3.1", () => {
    expect(openapi.openapi).toBe("3.1.0");
    expect(openapi.paths).toHaveProperty("/api/raster-tdh");
    expect(openapi.paths).toHaveProperty("/api/calculate");
  });

  it("publishes concise agent guidance", () => {
    expect(llms).toContain("https://mytdh.xyz/openapi.json");
    expect(llms).toContain("https://mytdh.xyz/mcp");
    expect(llms).toContain("Never infer a zero score from an uncovered profile.");
  });

  it("advertises a Streamable HTTP MCP server and its tools", () => {
    expect(manifest.endpoint).toBe("https://mytdh.xyz/mcp");
    expect(manifest.transport).toBe("streamable-http");
    expect(manifest.tools?.map((tool) => tool.name)).toEqual(["get_artist_tdh", "get_methodology"]);
  });
});
