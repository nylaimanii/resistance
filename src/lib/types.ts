export type ResistanceBucket = {
  level: number;
  count: number;
};

export type SimEvent = {
  tick: number;
  kind: "drug_deployed" | "dose_stopped" | "threshold_crossed" | "cleared";
  note: string;
};

export type SimParams = {
  mutationRate: number;
  doseStrength: number;
  carryingCapacity: number;
  doseDecay: number;
};

export type SimSnapshot = {
  tick: number;
  population: number;
  resistantFraction: number;
  drugConcentration: number;
};

// surveillance view: a small grid of connected regions, each running its
// own copy of the engine. shares the global SimParams; transfer between
// regions seeds resistance across the map.
export type Region = {
  id: string;
  name: string;
  // normalized 0..1 coords for the SVG map layout
  x: number;
  y: number;
  buckets: ResistanceBucket[];
  drugConcentration: number;
  doseActive: boolean;
};

export type Connection = {
  a: string; // region id
  b: string; // region id
  weight: number; // 0..1 — scales the per-tick transfer rate
};

export type SimState = {
  tick: number;
  buckets: ResistanceBucket[];
  drugConcentration: number;
  // doseActive = "still taking the antibiotic" — re-applies the dose each tick until stopDose
  doseActive: boolean;
  running: boolean;
  // ms between sim ticks — presenter preference, preserved across reset()
  tickIntervalMs: number;
  // diagnosis panel reads history this many ticks back (deliberate "culture takes days" lag)
  diagnosisLagTicks: number;
  params: SimParams;
  history: SimSnapshot[];
  events: SimEvent[];
  // surveillance — separate parallel sim across multiple regions
  regions: Region[];
  connections: Connection[];
  surveillanceTick: number;
  surveillanceRunning: boolean;
  selectedRegionId: string | null;
};
