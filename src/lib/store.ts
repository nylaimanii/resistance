import { create } from "zustand";
import type { SimParams, SimState } from "./types";
import { DEFAULT_PARAMS, makeInitialBuckets } from "./defaults";

type SimActions = {
  // named `step` not `tick` so it doesn't collide with SimState.tick (the counter)
  step: () => void;
  deployDrug: () => void;
  stopDose: () => void;
  setParam: <K extends keyof SimParams>(key: K, value: SimParams[K]) => void;
  reset: () => void;
};

export type SimStore = SimState & SimActions;

function initialState(): SimState {
  return {
    tick: 0,
    buckets: makeInitialBuckets(),
    drugConcentration: 0,
    running: false,
    params: { ...DEFAULT_PARAMS },
    history: [],
    events: [],
  };
}

export const useSimStore = create<SimStore>((set) => ({
  ...initialState(),

  step: () => {
    // TODO step 4-6: logistic growth, mutation, selection, dose decay
  },

  deployDrug: () => {
    // TODO step 4-6: set drugConcentration from params.doseStrength + log event
  },

  stopDose: () => {
    // TODO step 4-6: log dose_stopped event (concentration keeps decaying)
  },

  setParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),

  reset: () => set(initialState()),
}));
