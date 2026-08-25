import { ARTIST_TDH_METHODOLOGY, calculateArtistTdh } from "../src/domain/artist-tdh";

const MAX_BODY_BYTES = 128 * 1024;

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
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
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "mytdh", methodology: ARTIST_TDH_METHODOLOGY });
    }

    if (request.method === "GET" && url.pathname === "/api/methodology") {
      return json({
        methodology: ARTIST_TDH_METHODOLOGY,
        definition: "Duration and breadth of current independent collecting across a declared artist oeuvre.",
        priceInputs: false,
      });
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
