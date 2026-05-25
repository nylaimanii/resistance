import type { ResistanceBucket, SimParams } from "./types";

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
