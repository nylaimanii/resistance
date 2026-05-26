import type { Connection, Region, ResistanceBucket, SimParams } from "./types";

export const DEFAULT_PARAMS: SimParams = {
  mutationRate: 0.01,
  doseStrength: 0,
  carryingCapacity: 10_000,
  doseDecay: 0.1,
};

export const BUCKET_COUNT = 20;
export const INITIAL_POPULATION = 1000;

export function makeInitialBuckets(): ResistanceBucket[] {
  // 20 buckets, resistance level from 0 to ~1, count exponentially concentrated
  // in the lowest few buckets so the population starts mostly-susceptible.
  const decay = 5;
  const rawWeights = Array.from({ length: BUCKET_COUNT }, (_, i) =>
    Math.exp(-decay * (i / (BUCKET_COUNT - 1)))
  );
  const weightSum = rawWeights.reduce((s, w) => s + w, 0);

  return rawWeights.map((w, i) => ({
    level: i / (BUCKET_COUNT - 1),
    count: Math.round((w / weightSum) * INITIAL_POPULATION),
  }));
}

// hand-placed positions in normalized 0..1 space — Gamma is the central hub,
// the other four hang off it with two lateral cross-connections.
const REGION_SEEDS: Array<{ id: string; name: string; x: number; y: number }> = [
  { id: "alpha", name: "Alpha", x: 0.2, y: 0.25 },
  { id: "beta", name: "Beta", x: 0.8, y: 0.25 },
  { id: "gamma", name: "Gamma", x: 0.5, y: 0.5 },
  { id: "delta", name: "Delta", x: 0.22, y: 0.78 },
  { id: "epsilon", name: "Epsilon", x: 0.78, y: 0.78 },
];

export function makeInitialRegions(): Region[] {
  return REGION_SEEDS.map((seed) => ({
    ...seed,
    buckets: makeInitialBuckets(),
    drugConcentration: 0,
    doseActive: false,
  }));
}

export const INITIAL_CONNECTIONS: Connection[] = [
  { a: "alpha", b: "gamma", weight: 0.6 },
  { a: "beta", b: "gamma", weight: 0.5 },
  { a: "delta", b: "gamma", weight: 0.4 },
  { a: "epsilon", b: "gamma", weight: 0.5 },
  { a: "alpha", b: "delta", weight: 0.3 },
  { a: "beta", b: "epsilon", weight: 0.3 },
];
