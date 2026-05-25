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

export type SimState = {
  tick: number;
  buckets: ResistanceBucket[];
  drugConcentration: number;
  // doseActive = "still taking the antibiotic" — re-applies the dose each tick until stopDose
  doseActive: boolean;
  running: boolean;
  params: SimParams;
  history: SimSnapshot[];
  events: SimEvent[];
};
