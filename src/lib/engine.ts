import type { ResistanceBucket, SimState } from "./types";

export const GROWTH_RATE = 0.3;
export const RESISTANT_THRESHOLD = 0.5;

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

export function stepMutation(state: SimState): SimState {
  const rate = state.params.mutationRate;
  const src = state.buckets;
  const n = src.length;

  // outflow per bucket — half of migrants go up, half down; edges shed only in the valid direction
  const upFlow = new Array<number>(n).fill(0);
  const downFlow = new Array<number>(n).fill(0);

  for (let i = 0; i < n; i++) {
    const migrants = Math.floor(src[i].count * rate);
    const up = Math.floor(migrants / 2);
    const down = migrants - up;
    if (i < n - 1) upFlow[i] = up;
    if (i > 0) downFlow[i] = down;
  }

  const buckets: ResistanceBucket[] = src.map((b, i) => {
    let count = b.count - upFlow[i] - downFlow[i];
    if (i > 0) count += upFlow[i - 1];
    if (i < n - 1) count += downFlow[i + 1];
    return { level: b.level, count: Math.max(0, count) };
  });

  return { ...state, buckets };
}

export function resistantFraction(buckets: ResistanceBucket[]): number {
  const total = totalPopulation(buckets);
  if (total === 0) return 0;
  let resistant = 0;
  for (const b of buckets) if (b.level >= RESISTANT_THRESHOLD) resistant += b.count;
  return resistant / total;
}
