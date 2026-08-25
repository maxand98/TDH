import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { RASTER_COLLECTOR_TDH_METHODOLOGY } from "../src/domain/raster-collector-register";

async function publicJson(path: string, init?: RequestInit): Promise<string> {
  const response = await fetch(new URL(path, "https://mytdh.xyz"), init);
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  return text;
}

function createServer() {
  const server = new McpServer({
    name: "myTDH",
    version: "1.0.0",
  });

  server.registerTool(
    "list_artist_collectors",
    {
      description: "List an artist's collector holding-time register from a public Raster profile URL. The score is an artist-specific abTDH equivalent, not oTDH, and never uses price data.",
      inputSchema: z.object({
        profile: z.string().describe("A Raster artist profile URL, such as https://www.raster.art/artist/casey-reas"),
        offset: z.number().int().min(0).default(0).describe("Zero-based collector offset"),
        limit: z.number().int().min(1).max(200).default(100).describe("Collector records to return"),
        query: z.string().optional().describe("Optional collector name or wallet filter"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ profile, offset, limit, query }) => {
      try {
        const url = new URL("/api/raster-collector-tdh", "https://mytdh.xyz");
        url.searchParams.set("profile", profile);
        url.searchParams.set("offset", String(offset));
        url.searchParams.set("limit", String(limit));
        if (query) url.searchParams.set("query", query);
        const result = await publicJson(url.pathname + url.search);
        return {
          content: [{ type: "text" as const, text: result }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to read the artist collector register";
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "start_artist_register",
    {
      description: "Start an idempotent background job that generates and caches a collector holding-time register for any public Raster artist profile.",
      inputSchema: z.object({
        profile: z.string().describe("A Raster artist profile URL, such as https://www.raster.art/artist/joe-pease"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ profile }) => {
      try {
        const result = await publicJson("/api/raster-collector-jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile }),
        });
        return { content: [{ type: "text" as const, text: result }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Unable to start the register" }], isError: true };
      }
    },
  );

  server.registerTool(
    "get_artist_register_job",
    {
      description: "Read the progress or completion state of a myTDH background register job.",
      inputSchema: z.object({ id: z.string().regex(/^[a-z0-9-]+$/).describe("The job id returned by start_artist_register") }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      try {
        const result = await publicJson(`/api/raster-collector-jobs/${id}`);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Unable to read the register job" }], isError: true };
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
          methodology: RASTER_COLLECTOR_TDH_METHODOLOGY,
          definition: "Each current work contributes uninterrupted days held, weighted by the artist oeuvre's largest indexed edition divided by that work's indexed edition size.",
          currentCorpus: "The artist's verified Raster-indexed oeuvre",
          priceInputs: false,
          coverage: "A Raster profile resolves only when a reproducible collector register has been published for that artist.",
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
