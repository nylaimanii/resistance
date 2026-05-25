import { create } from "zustand";
import type { SimEvent, SimParams, SimSnapshot, SimState } from "./types";
import { DEFAULT_PARAMS, makeInitialBuckets } from "./defaults";
import {
  RESISTANT_THRESHOLD,
  resistantFraction,
  stepDecay,
  stepGrowth,
  stepMutation,
  stepSelection,
  totalPopulation,
} from "./engine";

const HISTORY_CAP = 300;
const DEFAULT_TICK_INTERVAL_MS = 150;
const DEFAULT_DIAGNOSIS_LAG_TICKS = 8;

type SimActions = {
  // named `step` not `tick` so it doesn't collide with SimState.tick (the counter)
  step: () => void;
  // loop control (separate from `stopDose`, which controls the drug)
  start: () => void;
  pause: () => void;
  deployDrug: (strength: number) => void;
  stopDose: () => void;
  setParam: <K extends keyof SimParams>(key: K, value: SimParams[K]) => void;
  setTickInterval: (ms: number) => void;
  setDiagnosisLag: (n: number) => void;
  reset: () => void;
};

export type SimStore = SimState & SimActions;

function initialState(): SimState {
  return {
    tick: 0,
    buckets: makeInitialBuckets(),
    drugConcentration: 0,
    doseActive: false,
    running: false,
    tickIntervalMs: DEFAULT_TICK_INTERVAL_MS,
    diagnosisLagTicks: DEFAULT_DIAGNOSIS_LAG_TICKS,
    params: { ...DEFAULT_PARAMS },
    history: [],
    events: [],
  };
}

export const useSimStore = create<SimStore>((set) => ({
  ...initialState(),

  step: () =>
    set((state) => {
      // full tick: growth → mutation → (pin drug to full strength if doseActive) → selection → (decay only if course is OFF)
      // pinning before selection means the course-active dose isn't shaved by decay before it acts.
      // skipping decay while active keeps the stored concentration at params.doseStrength.
      const a = stepGrowth(state);
      const b = stepMutation(a);
      const beforeSel = state.doseActive
        ? { ...b, drugConcentration: state.params.doseStrength }
        : b;
      const c = stepSelection(beforeSel);
      const next = state.doseActive ? c : stepDecay(c);

      const nextTick = state.tick + 1;
      const prevPop = totalPopulation(state.buckets);
      const newPop = totalPopulation(next.buckets);
      const prevFrac = resistantFraction(state.buckets);
      const newFrac = resistantFraction(next.buckets);

      const newEvents: SimEvent[] = [];
      const hasThresholdEvent = state.events.some((e) => e.kind === "threshold_crossed");
      const hasClearedEvent = state.events.some((e) => e.kind === "cleared");
      if (
        !hasThresholdEvent &&
        prevFrac < RESISTANT_THRESHOLD &&
        newFrac >= RESISTANT_THRESHOLD
      ) {
        newEvents.push({
          tick: nextTick,
          kind: "threshold_crossed",
          note: "resistance passed 50%",
        });
      }
      if (!hasClearedEvent && prevPop > 0 && newPop === 0) {
        newEvents.push({ tick: nextTick, kind: "cleared", note: "population cleared" });
      }

      const snapshot: SimSnapshot = {
        tick: nextTick,
        population: newPop,
        resistantFraction: newFrac,
        drugConcentration: next.drugConcentration,
      };
      const history = [...state.history, snapshot].slice(-HISTORY_CAP);
      const events = newEvents.length > 0 ? [...state.events, ...newEvents] : state.events;

      // auto-pause + auto-end course when cleared so the loop doesn't spin on a dead population
      const cleared = newPop === 0;
      const running = cleared ? false : state.running;
      const doseActive = cleared ? false : state.doseActive;

      return { ...next, tick: nextTick, history, events, running, doseActive };
    }),

  start: () => set({ running: true }),
  pause: () => set({ running: false }),

  deployDrug: (strength: number) =>
    set((state) => ({
      drugConcentration: strength,
      doseActive: true,
      events: [
        ...state.events,
        {
          tick: state.tick,
          kind: "drug_deployed",
          note: `drug deployed at strength ${strength.toFixed(2)}`,
        },
      ],
    })),

  // ends the course — decay then takes over naturally, surviving cells get a chance to regrow
  stopDose: () =>
    set((state) => ({
      doseActive: false,
      events: [
        ...state.events,
        { tick: state.tick, kind: "dose_stopped", note: "dose stopped" },
      ],
    })),

  setParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),

  setTickInterval: (ms: number) => set({ tickIntervalMs: ms }),

  setDiagnosisLag: (n: number) => set({ diagnosisLagTicks: n }),

  // preserve presenter prefs across reset (speed + diagnosis lag are not sim state)
  reset: () =>
    set((state) => ({
      ...initialState(),
      tickIntervalMs: state.tickIntervalMs,
      diagnosisLagTicks: state.diagnosisLagTicks,
    })),
}));
