# Agent and API access

myTDH exposes the same public calculation through human, JSON API, OpenAPI, and MCP surfaces.

## Discovery

- `https://mytdh.xyz/llms.txt`
- `https://mytdh.xyz/openapi.json`
- `https://mytdh.xyz/.well-known/mcp.json`

## JSON API

Look up a covered artist from a Raster profile:

```text
GET https://mytdh.xyz/api/raster-tdh?profile=https%3A%2F%2Fwww.raster.art%2Fartist%2Fcasey-reas
```

The API is public, read-only, and CORS-enabled. A response with `covered: false` means the artist is outside the current declared corpus. It must not be interpreted as a zero score.

The lower-level `POST /api/calculate` endpoint accepts a declared current-holdings dataset using the schema in `openapi.json`.

## MCP

Connect an MCP client to:

```text
https://mytdh.xyz/mcp
```

Transport: Streamable HTTP. Authentication: none. The server is stateless and exposes:

- `get_artist_tdh` with a Raster artist profile URL;
- `get_methodology` with no arguments.

MCP tool responses are JSON encoded as text for broad client compatibility. All tools are read-only.
