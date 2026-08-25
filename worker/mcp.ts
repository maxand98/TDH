import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { ARTIST_TDH_METHODOLOGY } from "../src/domain/artist-tdh";
import { lookupRasterTdh } from "./tdh-data";

function createServer() {
  const server = new McpServer({
    name: "myTDH",
    version: "1.0.0",
  });

  server.registerTool(
    "get_artist_tdh",
    {
      description: "Look up an artist TDH result from a public Raster artist profile URL. Results name the declared corpus and never use price data.",
      inputSchema: z.object({
        profile: z.string().describe("A Raster artist profile URL, such as https://www.raster.art/artist/casey-reas"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ profile }) => {
      try {
        const result = await lookupRasterTdh(profile);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to calculate artist TDH";
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_methodology",
    {
      description: "Return the public myTDH methodology identifier, definition, coverage rule, and excluded inputs.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    () => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          methodology: ARTIST_TDH_METHODOLOGY,
          definition: "Duration and breadth of current independent collecting across a declared artist oeuvre.",
          currentCorpus: "AB[500] / 500 Art Blocks projects",
          priceInputs: false,
          coverage: "A Raster profile resolves only when its artist slug is present in the current declared corpus.",
        }, null, 2),
      }],
    }),
  );

  return server;
}

export const mcpHandler = createMcpHandler(createServer, {
  route: "/mcp",
  allowedHostnames: ["mytdh.xyz", "localhost", "127.0.0.1"],
  corsOptions: { origin: "https://mytdh.xyz" },
  legacy: "stateless",
  responseMode: "auto",
  onerror(error) {
    console.error(JSON.stringify({ event: "mcp_error", message: error.message }));
  },
});
