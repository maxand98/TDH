import { calculateArtistTdh } from "../src/domain/artist-tdh";
import { mcpHandler } from "./mcp";
import { lookupRasterCollectorTdh, RASTER_COLLECTOR_TDH_METHODOLOGY } from "../src/domain/raster-collector-register";
import { rasterArtistSlug } from "../src/domain/raster-profile";
export { RasterRegisterWorkflow } from "./raster-register-workflow";
import type { RasterRegisterJobParams, RasterRegisterProgress } from "./raster-register-workflow";

const MAX_BODY_BYTES = 128 * 1024;

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

function jobId(slug: string) {
  return `${slug}-${utcDate().replaceAll("-", "")}-v3`;
}

function jobUrl(id: string) {
  return `/api/raster-collector-jobs/${id}`;
}

async function readJobProgress(env: Env, id: string): Promise<RasterRegisterProgress | null> {
  return env.REGISTERS.get<RasterRegisterProgress>(`jobs/${id}/progress.json`, "json");
}

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
        }, env.REGISTERS);
        return json(result, { status: result.covered ? 200 : 404 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to read Raster profile";
        return json({ error: message }, { status: 400 });
      }
    }

    if (request.method === "POST" && url.pathname === "/api/raster-collector-jobs") {
      try {
        const input = await boundedJson(request);
        const profile = typeof input === "object" && input !== null && "profile" in input ? String(input.profile) : "";
        const slug = rasterArtistSlug(profile);
        const published = await lookupRasterCollectorTdh(profile, env.ASSETS, url.origin, { limit: 1 }, env.REGISTERS);
        if (published.covered) {
          const resultUrl = `/api/raster-collector-tdh?profile=${encodeURIComponent(published.profile)}&limit=5000`;
          return json({ state: "complete", slug, profile: published.profile, resultUrl, cached: true });
        }

        const id = jobId(slug);
        const existing = await readJobProgress(env, id);
        if (existing) {
          if (existing.state !== "complete") {
            const instance = await env.RASTER_REGISTER.get(id);
            const status = await instance.status();
            if (existing.state === "errored" || status.status === "errored" || status.status === "terminated") {
              await instance.restart();
              const restarted = { ...existing, state: "queued" as const, stage: "queued" as const, message: "Retrying the Raster collector map", error: undefined, updatedAt: new Date().toISOString() };
              await env.REGISTERS.put(`jobs/${id}/progress.json`, JSON.stringify(restarted));
              return json({ ...restarted, jobUrl: jobUrl(id) }, { status: 202 });
            }
          }
          return json({ ...existing, jobUrl: jobUrl(id) }, { status: existing.state === "complete" ? 200 : 202 });
        }

        const progress: RasterRegisterProgress = {
          id,
          slug,
          state: "queued",
          stage: "queued",
          message: "Waiting to begin the Raster collector map",
          completed: 0,
          total: null,
          updatedAt: new Date().toISOString(),
        };
        await env.REGISTERS.put(`jobs/${id}/progress.json`, JSON.stringify(progress));
        const params: RasterRegisterJobParams = { slug, snapshotAt: new Date().toISOString() };
        try {
          await env.RASTER_REGISTER.create({ id, params, retention: { successRetention: "30 days", errorRetention: "30 days" }, locationHint: "oc" });
        } catch (error) {
          const instance = await env.RASTER_REGISTER.get(id);
          const status = await instance.status();
          if (status.status === "errored" || status.status === "terminated") await instance.restart();
          else if (status.status === "unknown") throw error;
        }
        return json({ ...progress, jobUrl: jobUrl(id) }, { status: 202 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create the Raster register job";
        console.error(JSON.stringify({ event: "register_job_rejected", message }));
        return json({ error: message }, { status: 400 });
      }
    }

    const jobMatch = url.pathname.match(/^\/api\/raster-collector-jobs\/([a-z0-9-]+)$/);
    if (request.method === "GET" && jobMatch?.[1]) {
      const id = jobMatch[1];
      const progress = await readJobProgress(env, id);
      if (!progress) return json({ error: "Register job not found" }, { status: 404 });
      if (progress.state !== "complete" && progress.state !== "errored") {
        const instance = await env.RASTER_REGISTER.get(id);
        const status = await instance.status();
        if (status.status === "errored") {
          return json({ ...progress, jobUrl: jobUrl(id), state: "errored", stage: "errored", error: status.error?.message ?? "The register job failed" });
        }
      }
      return json({ ...progress, jobUrl: jobUrl(id) });
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
