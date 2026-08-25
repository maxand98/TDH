import { calculateArtistTdh } from "../src/domain/artist-tdh";
import { mcpHandler } from "./mcp";
import { lookupRasterCollectorTdh, RASTER_COLLECTOR_TDH_METHODOLOGY } from "../src/domain/raster-collector-register";

const MAX_BODY_BYTES = 128 * 1024;

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

async function boundedJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) throw new Error("Request body exceeds 128 KiB");
  if (!request.body) throw new Error("Request body is required");

  // Cloudflare's generated Body type exposes ReadableStream<any>; Fetch request chunks are Uint8Array.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const bodyStream: ReadableStream<Uint8Array> = request.body;
  const reader = bodyStream.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        await reader.cancel("Request body exceeds 128 KiB");
        throw new Error("Request body exceeds 128 KiB");
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  const parsed: unknown = JSON.parse(body);
  return parsed;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/mcp") return mcpHandler(request, env, ctx);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-origin": "*",
          "access-control-max-age": "86400",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "mytdh", methodology: RASTER_COLLECTOR_TDH_METHODOLOGY });
    }

    if (request.method === "GET" && url.pathname === "/api/methodology") {
      return json({
        methodology: RASTER_COLLECTOR_TDH_METHODOLOGY,
        definition: "An artist-specific adaptation of abTDH: uninterrupted days held per current work, weighted inversely by the indexed edition size, reported for every eligible collector address.",
        priceInputs: false,
      });
    }

    if (request.method === "GET" && (url.pathname === "/api/raster-collector-tdh" || url.pathname === "/api/raster-tdh")) {
      try {
        const profile = url.searchParams.get("profile") ?? "";
        const result = await lookupRasterCollectorTdh(profile, env.ASSETS, url.origin, {
          offset: Number(url.searchParams.get("offset") ?? 0),
          limit: Number(url.searchParams.get("limit") ?? 100),
          query: url.searchParams.get("query") ?? undefined,
        });
        return json(result, { status: result.covered ? 200 : 404 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to read Raster profile";
        return json({ error: message }, { status: 400 });
      }
    }

    if (request.method === "POST" && url.pathname === "/api/calculate") {
      try {
        const input = await boundedJson(request);
        const result = calculateArtistTdh(input);
        return json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid calculation input";
        console.error(JSON.stringify({ event: "calculation_rejected", message }));
        return json({ error: message }, { status: 400 });
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, { status: 404 });
    return json({ error: "Asset route not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
