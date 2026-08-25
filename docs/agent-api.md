# Agent and API access

myTDH exposes the same public calculation through human, JSON API, OpenAPI, and MCP surfaces.

## Discovery

- `https://mytdh.xyz/llms.txt`
- `https://mytdh.xyz/openapi.json`
- `https://mytdh.xyz/.well-known/mcp.json`

## JSON API

List an artist's collector register from a Raster profile:

```text
GET https://mytdh.xyz/api/raster-collector-tdh?profile=https%3A%2F%2Fwww.raster.art%2Fartist%2Fcasey-reas&offset=0&limit=100
```

The API is public, CORS-enabled and paginated. It returns an artist-specific adaptation of abTDH for each eligible collector address; it does not return oTDH. A response with `covered: false` means no collector register has been generated yet. It must not be interpreted as a zero score.

Start an idempotent background register job:

```text
POST https://mytdh.xyz/api/raster-collector-jobs
Content-Type: application/json

{"profile":"https://www.raster.art/artist/joe-pease"}
```

Poll the returned `jobUrl`. When its state becomes `complete`, retrieve the published register from `resultUrl`.

The lower-level `POST /api/calculate` endpoint accepts a declared current-holdings dataset using the schema in `openapi.json`.

## MCP

Connect an MCP client to:

```text
https://mytdh.xyz/mcp
```

Transport: Streamable HTTP. Authentication: none. The server is stateless and exposes:

- `list_artist_collectors` with a Raster artist profile URL, offset, limit and optional query;
- `start_artist_register` to generate a missing register;
- `get_artist_register_job` to inspect queued, running, completed or errored jobs;
- `get_methodology` with no arguments.

MCP tool responses are JSON encoded as text for broad client compatibility. Starting a register is a non-destructive, idempotent write; the other tools are read-only.
