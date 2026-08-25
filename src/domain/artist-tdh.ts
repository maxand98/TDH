const COMPLETE_DAY_MS = 86_400_000;

export const ARTIST_TDH_METHODOLOGY = "artist-tdh/1" as const;

export type CurrentHolding = {
  tokenId: string;
  identityId: string;
  acquiredAt: string;
};

export type ProjectInput = {
  id: string;
  label: string;
  holdings: readonly CurrentHolding[];
};

export type ArtistTdhInput = {
  artistId: string;
  snapshotAt: string;
  projects: readonly ProjectInput[];
};

export type ProjectTdhResult = {
  id: string;
  label: string;
  score: number;
  collectorIdentities: number;
  eligibleWorks: number;
  rawCollectorDays: number;
  medianIdentityHoldDays: number;
};

export type ArtistTdhResult = {
  methodology: typeof ARTIST_TDH_METHODOLOGY;
  artistId: string;
  snapshotAt: string;
  tdh: number;
  rawCollectorDays: number;
  collectorIdentities: number;
  eligibleProjects: number;
  eligibleWorks: number;
  medianProjectHoldDays: number;
  projects: readonly ProjectTdhResult[];
};

type ProjectCalculation = {
  result: ProjectTdhResult;
  exactScore: number;
  exactMedianIdentityHoldDays: number;
};

function objectRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringField(record: Readonly<Record<string, unknown>>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  return value;
}

export function parseArtistTdhInput(value: unknown): ArtistTdhInput {
  const input = objectRecord(value, "input");
  const projectsValue = input.projects;
  if (!Array.isArray(projectsValue)) throw new Error("projects must be an array");

  return {
    artistId: stringField(input, "artistId"),
    snapshotAt: stringField(input, "snapshotAt"),
    projects: projectsValue.map((projectValue, projectIndex) => {
      const project = objectRecord(projectValue, `projects[${projectIndex}]`);
      const holdingsValue = project.holdings;
      if (!Array.isArray(holdingsValue)) {
        throw new Error(`projects[${projectIndex}].holdings must be an array`);
      }
      return {
        id: stringField(project, "id"),
        label: stringField(project, "label"),
        holdings: holdingsValue.map((holdingValue, holdingIndex) => {
          const holding = objectRecord(
            holdingValue,
            `projects[${projectIndex}].holdings[${holdingIndex}]`,
          );
          return {
            tokenId: stringField(holding, "tokenId"),
            identityId: stringField(holding, "identityId"),
            acquiredAt: stringField(holding, "acquiredAt"),
          };
        }),
      };
    }),
  };
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const middleValue = ordered[middle];
  if (middleValue === undefined) return 0;
  if (ordered.length % 2 === 1) return middleValue;
  const previousValue = ordered[middle - 1];
  if (previousValue === undefined) return middleValue;
  return (previousValue + middleValue) / 2;
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty`);
  return normalized;
}

function completeDays(acquiredAt: string, snapshotMs: number): number {
  const acquiredMs = Date.parse(acquiredAt);
  if (!Number.isFinite(acquiredMs)) throw new Error(`Invalid acquisition timestamp: ${acquiredAt}`);
  if (acquiredMs > snapshotMs) throw new Error(`Acquisition occurs after snapshot: ${acquiredAt}`);
  return Math.floor((snapshotMs - acquiredMs) / COMPLETE_DAY_MS);
}

function calculateProject(project: ProjectInput, snapshotMs: number): ProjectCalculation {
  const id = requireNonEmpty(project.id, "project id");
  const label = requireNonEmpty(project.label, "project label");
  const seenTokens = new Set<string>();
  const daysByIdentity = new Map<string, number[]>();

  for (const holding of project.holdings) {
    const tokenId = requireNonEmpty(holding.tokenId, "token id");
    const identityId = requireNonEmpty(holding.identityId, "identity id");
    if (seenTokens.has(tokenId)) throw new Error(`Duplicate token id ${tokenId} in project ${id}`);
    seenTokens.add(tokenId);

    const days = completeDays(holding.acquiredAt, snapshotMs);
    const identityDays = daysByIdentity.get(identityId) ?? [];
    identityDays.push(days);
    daysByIdentity.set(identityId, identityDays);
  }

  const identityMeans = [...daysByIdentity.values()].map(
    (days) => days.reduce((sum, value) => sum + value, 0) / days.length,
  );
  const medianIdentityHoldDays = median(identityMeans);
  const collectorIdentities = identityMeans.length;
  const rawCollectorDays = [...daysByIdentity.values()]
    .flat()
    .reduce((sum, value) => sum + value, 0);
  const score = medianIdentityHoldDays * Math.log2(1 + collectorIdentities);

  return {
    exactScore: score,
    exactMedianIdentityHoldDays: medianIdentityHoldDays,
    result: {
      id,
      label,
      score: round(score),
      collectorIdentities,
      eligibleWorks: seenTokens.size,
      rawCollectorDays,
      medianIdentityHoldDays: round(medianIdentityHoldDays),
    },
  };
}

export function calculateArtistTdh(value: unknown): ArtistTdhResult {
  const input = parseArtistTdhInput(value);
  const artistId = requireNonEmpty(input.artistId, "artist id");
  const snapshotMs = Date.parse(input.snapshotAt);
  if (!Number.isFinite(snapshotMs)) throw new Error(`Invalid snapshot timestamp: ${input.snapshotAt}`);
  if (input.projects.length === 0) throw new Error("At least one project is required");

  const seenProjects = new Set<string>();
  const calculations = input.projects.map((project) => {
    const calculation = calculateProject(project, snapshotMs);
    if (seenProjects.has(calculation.result.id)) {
      throw new Error(`Duplicate project id: ${calculation.result.id}`);
    }
    seenProjects.add(calculation.result.id);
    return calculation;
  });
  const projects = calculations.map((calculation) => calculation.result);

  const uniqueIdentities = new Set(
    input.projects.flatMap((project) => project.holdings.map((holding) => holding.identityId.trim())),
  );
  const totalProjectScore = calculations.reduce((sum, calculation) => sum + calculation.exactScore, 0);

  return {
    methodology: ARTIST_TDH_METHODOLOGY,
    artistId,
    snapshotAt: new Date(snapshotMs).toISOString(),
    tdh: round(totalProjectScore / Math.sqrt(projects.length)),
    rawCollectorDays: projects.reduce((sum, project) => sum + project.rawCollectorDays, 0),
    collectorIdentities: uniqueIdentities.size,
    eligibleProjects: projects.length,
    eligibleWorks: projects.reduce((sum, project) => sum + project.eligibleWorks, 0),
    medianProjectHoldDays: round(
      median(calculations.map((calculation) => calculation.exactMedianIdentityHoldDays)),
    ),
    projects,
  };
}
