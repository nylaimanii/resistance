// Drives the surveillance view. Reuses the existing engine.ts functions —
// no sim math is duplicated here. Each region is treated as an independent
// SimState that the engine operates on; a transfer step then mixes a small
// fraction of bacteria across each connection.
import type {
  Connection,
  Region,
  ResistanceBucket,
  SimParams,
  SimState,
} from "./types";
import { stepDecay, stepGrowth, stepMutation, stepSelection } from "./engine";
import { initialEconomicsState } from "./economics";

// gentle per-tick travel — small enough that spread is gradual and watchable
export const BASE_TRANSFER_RATE = 0.01;

// build a minimal SimState wrapper so the engine functions accept a region.
// the engine only reads buckets / drugConcentration / params from SimState,
// so the other fields are stub values.
function asSimState(region: Region, params: SimParams): SimState {
  return {
    tick: 0,
    buckets: region.buckets,
    drugConcentration: region.drugConcentration,
    doseActive: region.doseActive,
    running: false,
    tickIntervalMs: 0,
    diagnosisLagTicks: 0,
    params,
    history: [],
    events: [],
    regions: [],
    connections: [],
    surveillanceTick: 0,
    surveillanceRunning: false,
    selectedRegionId: null,
    economics: initialEconomicsState(),
  };
}

// step a single region through the engine's full per-tick cycle, mirroring
// the main store's step(): growth → mutation → (pin drug if course active)
// → selection → (decay if course off).
function stepRegion(region: Region, params: SimParams): Region {
  const initial = asSimState(region, params);
  const a = stepGrowth(initial);
  const b = stepMutation(a);
  const beforeSel = region.doseActive
    ? { ...b, drugConcentration: params.doseStrength }
    : b;
  const c = stepSelection(beforeSel);
  const next = region.doseActive ? c : stepDecay(c);
  return {
    ...region,
    buckets: next.buckets,
    drugConcentration: next.drugConcentration,
  };
}

// move bacteria between connected regions, proportionally per resistance bucket.
// per pair, per bucket: each side sends floor(count * rate) to the other.
// what leaves one region arrives in the other → total population is conserved
// across the pair.
function applyTransfers(
  regions: Region[],
  connections: Connection[]
): Region[] {
  // clone regions + buckets so we can mutate without touching the input
  const byId = new Map<string, Region>(
    regions.map((r) => [
      r.id,
      { ...r, buckets: r.buckets.map((b) => ({ ...b })) },
    ])
  );

  for (const conn of connections) {
    const A = byId.get(conn.a);
    const B = byId.get(conn.b);
    if (!A || !B) continue;
    const rate = BASE_TRANSFER_RATE * conn.weight;
    const aBuckets = A.buckets;
    const bBuckets = B.buckets;
    const n = Math.min(aBuckets.length, bBuckets.length);
    for (let i = 0; i < n; i++) {
      const moveAB = Math.floor(aBuckets[i].count * rate);
      const moveBA = Math.floor(bBuckets[i].count * rate);
      aBuckets[i] = {
        level: aBuckets[i].level,
        count: Math.max(0, aBuckets[i].count - moveAB + moveBA),
      } as ResistanceBucket;
      bBuckets[i] = {
        level: bBuckets[i].level,
        count: Math.max(0, bBuckets[i].count - moveBA + moveAB),
      } as ResistanceBucket;
    }
  }

  // return in original order
  return regions.map((r) => byId.get(r.id) ?? r);
}

// advance the whole surveillance sim one tick: every region runs the engine
// once, then the transfer step mixes across connections.
export function stepSurveillanceOnce(
  regions: Region[],
  connections: Connection[],
  params: SimParams
): Region[] {
  const stepped = regions.map((r) => stepRegion(r, params));
  return applyTransfers(stepped, connections);
}

// totals + resistant fraction for a region (used by the map UI)
export function regionPopulation(region: Region): number {
  let total = 0;
  for (const b of region.buckets) total += b.count;
  return total;
}

export function regionResistantFraction(region: Region): number {
  let total = 0;
  let resistant = 0;
  for (const b of region.buckets) {
    total += b.count;
    if (b.level >= 0.5) resistant += b.count;
  }
  return total === 0 ? 0 : resistant / total;
}
