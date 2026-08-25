import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "../ab500/data/artist-tdh");
const destination = path.join(root, "public/data/raster-collector-tdh");
const custodyLabels = new Set(["brightmoments.eth", "fxhash", "fxhash marketplace v1.0", "hen", "objkt.com", "teia"]);

await mkdir(destination, { recursive: true });

const registry = JSON.parse(await readFile(path.join(source, "index.json"), "utf8"));
const available = new Map();

for (const filename of await readdir(source)) {
  if (filename === "index.json" || !filename.endsWith(".json")) continue;
  const snapshot = JSON.parse(await readFile(path.join(source, filename), "utf8"));
  if (snapshot.status !== "published" || !Array.isArray(snapshot.collectors)) continue;

  const slug = filename.slice(0, -5);
  const collectors = snapshot.collectors
    .filter((collector) => !custodyLabels.has(String(collector.name).trim().toLowerCase()))
    .map((collector, index) => ({ ...collector, rank: index + 1 }));
  const compact = {
    schema: snapshot.schema,
    snapshot_at: snapshot.snapshot_at,
    status: snapshot.status,
    metric: snapshot.metric,
    artist: snapshot.artist,
    corpus: { ...snapshot.corpus, eligible_collector_addresses: collectors.length },
    method: snapshot.method,
    collectors,
  };
  await writeFile(path.join(destination, filename), JSON.stringify(compact));
  available.set(slug, compact);
}

const artists = registry.artists
  .filter((entry) => available.has(entry.slug))
  .map((entry) => ({
    artist: entry.artist,
    slug: entry.slug,
    raster_slug: entry.raster_slug,
    metric: entry.metric,
  }));

await writeFile(path.join(destination, "index.json"), JSON.stringify({
  schema: "mytdh-raster-collector-register/1",
  snapshot_at: registry.snapshot_at,
  artists,
}));

console.log(`Imported ${artists.length} published Raster collector registers.`);
