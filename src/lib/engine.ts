import type { ResistanceBucket, SimState } from "./types";

export const GROWTH_RATE = 0.3;

export function totalPopulation(buckets: ResistanceBucket[]): number {
  let sum = 0;
  for (const b of buckets) sum += b.count;
  return sum;
}

export function stepGrowth(state: SimState): SimState {
  const N = totalPopulation(state.buckets);
  const K = state.params.carryingCapacity;
  // logistic: dN/dt = r * N * (1 - N/K) — applied per bucket, proportional to its count
  const factor = 1 + GROWTH_RATE * (1 - N / K);

  const buckets: ResistanceBucket[] = state.buckets.map((b) => ({
    level: b.level,
    count: Math.max(0, Math.round(b.count * factor)),
  }));

  return { ...state, buckets };
}
