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

The API is public, read-only, CORS-enabled and paginated. It returns an artist-specific adaptation of abTDH for each eligible collector address; it does not return oTDH. A response with `covered: false` means no reproducible collector register is published for the profile. It must not be interpreted as a zero score.

The lower-level `POST /api/calculate` endpoint accepts a declared current-holdings dataset using the schema in `openapi.json`.

## MCP

Connect an MCP client to:

```text
https://mytdh.xyz/mcp
```

Transport: Streamable HTTP. Authentication: none. The server is stateless and exposes:

- `list_artist_collectors` with a Raster artist profile URL, offset, limit and optional query;
- `get_methodology` with no arguments.

MCP tool responses are JSON encoded as text for broad client compatibility. All tools are read-only.
