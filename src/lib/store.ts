import { create } from "zustand";
import type { SimParams, SimSnapshot, SimState } from "./types";
import { DEFAULT_PARAMS, makeInitialBuckets } from "./defaults";
import { stepGrowth, totalPopulation } from "./engine";

const HISTORY_CAP = 300;

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

  step: () =>
    set((state) => {
      // TODO step 5-6: mutation, selection, dose decay
      const grown = stepGrowth(state);
      const nextTick = state.tick + 1;
      const snapshot: SimSnapshot = {
        tick: nextTick,
        population: totalPopulation(grown.buckets),
        resistantFraction: 0, // placeholder until step 5
        drugConcentration: grown.drugConcentration,
      };
      const history = [...state.history, snapshot].slice(-HISTORY_CAP);
      return { ...grown, tick: nextTick, history };
    }),

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
