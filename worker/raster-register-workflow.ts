import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import {
  calculateLiveSnapshot,
  fetchArtworkTokens,
  fetchCollectorLabels,
  fetchRasterArtist,
  fetchTokenOwners,
  type RasterArtist,
  type RasterOwner,
  type RasterToken,
} from "../src/domain/raster-live-register";

export type RasterRegisterJobParams = { slug: string; snapshotAt: string };

export type RasterRegisterProgress = {
  id: string;
  slug: string;
  state: "queued" | "running" | "complete" | "errored";
  stage: "queued" | "oeuvre" | "tokens" | "owners" | "collectors" | "calculating" | "complete" | "errored";
  message: string;
  completed: number;
  total: number | null;
  updatedAt: string;
  resultUrl?: string;
  error?: string;
};

const retry = {
  retries: { limit: 8, delay: "5 seconds" as const, backoff: "exponential" as const },
  timeout: "10 minutes" as const,
};

function progressKey(id: string) { return `jobs/${id}/progress.json`; }
function tokenKey(id: string, artworkId: string) { return `jobs/${id}/tokens/${artworkId}.json`; }
function ownerKey(id: string, batch: number) { return `jobs/${id}/owners/${String(batch).padStart(6, "0")}.json`; }

async function writeProgress(bucket: KVNamespace, progress: RasterRegisterProgress) {
  await bucket.put(progressKey(progress.id), JSON.stringify(progress));
}

async function readJson<T>(bucket: KVNamespace, key: string): Promise<T> {
  const value = await bucket.get<T>(key, "json");
  if (!value) throw new Error(`Job data is missing: ${key}`);
  return value;
}

export class RasterRegisterWorkflow extends WorkflowEntrypoint<Env, RasterRegisterJobParams> {
  async run(event: Readonly<WorkflowEvent<RasterRegisterJobParams>>, step: WorkflowStep): Promise<{ resultUrl: string }> {
    const id = event.instanceId;
    const { slug, snapshotAt } = event.payload;
    const update = async (value: Omit<RasterRegisterProgress, "id" | "slug" | "updatedAt">) => {
      await writeProgress(this.env.REGISTERS, { id, slug, updatedAt: new Date().toISOString(), ...value });
    };

    try {
      await step.do("resolve Raster oeuvre", retry, async () => {
        await update({ state: "running", stage: "oeuvre", message: "Finding the artist's Raster-indexed oeuvre", completed: 0, total: null });
        const artist = await fetchRasterArtist(slug);
        await this.env.REGISTERS.put(`jobs/${id}/artist.json`, JSON.stringify(artist));
        return { artist: artist.name, artworks: artist.artworks.length };
      });

      const artist = await readJson<RasterArtist>(this.env.REGISTERS, `jobs/${id}/artist.json`);
      const tokenCounts: Array<{ artworkId: string; count: number }> = [];
      for (let index = 0; index < artist.artworks.length; index += 1) {
        const artwork = artist.artworks[index]!;
        const count = await step.do(`read tokens ${artwork.id}`, retry, async () => {
          await update({ state: "running", stage: "tokens", message: `Reading indexed works: ${index + 1} of ${artist.artworks.length}`, completed: index, total: artist.artworks.length });
          const tokens = await fetchArtworkTokens(artwork);
          await this.env.REGISTERS.put(tokenKey(id, artwork.id), JSON.stringify(tokens));
          return tokens.length;
        });
        tokenCounts.push({ artworkId: artwork.id, count });
      }

      const totalTokens = tokenCounts.reduce((total, item) => total + item.count, 0);
      const allTokens: RasterToken[] = [];
      for (const item of tokenCounts) allTokens.push(...await readJson<RasterToken[]>(this.env.REGISTERS, tokenKey(id, item.artworkId)));
      const batches = Array.from({ length: Math.ceil(allTokens.length / 8) }, (_, index) => allTokens.slice(index * 8, index * 8 + 8));
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index]!;
        await step.do(`read owners ${index + 1}`, retry, async () => {
          await update({ state: "running", stage: "owners", message: `Mapping current ownership: ${Math.min(index * 8, totalTokens)} of ${totalTokens} works`, completed: Math.min(index * 8, totalTokens), total: totalTokens });
          const owners = await fetchTokenOwners(batch);
          await this.env.REGISTERS.put(ownerKey(id, index), JSON.stringify(owners));
          return Object.values(owners).reduce((total, values) => total + values.length, 0);
        });
      }

      const labelSummary = await step.do("resolve collector identities", retry, async () => {
        await update({ state: "running", stage: "collectors", message: "Resolving collector names and exclusions", completed: 0, total: null });
        const value = await fetchCollectorLabels(artist.id);
        await this.env.REGISTERS.put(`jobs/${id}/labels.json`, JSON.stringify(value));
        return { total: value.total, labelled: Object.keys(value.labels).length };
      });

      const resultUrl = `/api/raster-collector-tdh?profile=${encodeURIComponent(`https://www.raster.art/artist/${slug}`)}&limit=5000`;
      await step.do("calculate and publish register", retry, async () => {
        await update({ state: "running", stage: "calculating", message: "Calculating uninterrupted holding time", completed: 0, total: null });
        const ownersByToken: Record<string, RasterOwner[]> = {};
        for (let index = 0; index < batches.length; index += 1) Object.assign(ownersByToken, await readJson<Record<string, RasterOwner[]>>(this.env.REGISTERS, ownerKey(id, index)));
        const labelsValue = await readJson<{ labels: Record<string, { address: string; name?: string | null; is_artist?: boolean }>; total: number }>(this.env.REGISTERS, `jobs/${id}/labels.json`);
        const tokensByArtwork: Record<string, RasterToken[]> = {};
        for (const item of tokenCounts) tokensByArtwork[item.artworkId] = await readJson<RasterToken[]>(this.env.REGISTERS, tokenKey(id, item.artworkId));
        const snapshot = calculateLiveSnapshot({ artist, tokensByArtwork, ownersByToken, labels: labelsValue.labels, rasterCollectorTotal: labelSummary.total, snapshotAt });
        const body = JSON.stringify(snapshot);
        await this.env.REGISTERS.put(`registers/${slug}/${snapshotAt.slice(0, 10)}.json`, body);
        await this.env.REGISTERS.put(`registers/${slug}/latest.json`, body);
        return { collectors: snapshot.collectors.length, bytes: body.length };
      });

      await update({ state: "complete", stage: "complete", message: "Collector register complete", completed: totalTokens, total: totalTokens, resultUrl });
      return { resultUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "The Raster register could not be generated";
      await update({ state: "errored", stage: "errored", message: "The register could not be completed", completed: 0, total: null, error: message });
      throw error;
    }
  }
}
