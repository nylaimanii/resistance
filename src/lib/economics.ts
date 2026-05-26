// Pharma economics meta-game. Pure logic — no bacterial engine here.
// Tuned so that, with all policies OFF, investing in a new antibiotic loses
// money vs doing nothing — yet without new drugs, societal resistance climbs
// to a crisis. That's the "broken incentives" point of the view.

export type Policies = {
  subscription: boolean; // pay-for-access not volume → boosts per-turn revenue
  marketEntryReward: boolean; // lump-sum reward on launch
  pushFunding: boolean; // subsidizes R&D cost
};

export type Antibiotic = {
  id: string;
  name: string;
  status: "developing" | "launched" | "expired";
  // for developing drugs: turns remaining until launch (counts down each turn)
  devTurnsRemaining: number;
  // for launched drugs: turns remaining of active life (counts down each turn)
  activeTurnsRemaining: number;
};

export type EconomicsSnapshot = {
  turn: number;
  cash: number;
  societalResistance: number;
};

export type EconomicsState = {
  turn: number; // years elapsed
  cash: number;
  societalResistance: number; // 0..1, hits crisis at >= CRISIS_THRESHOLD
  pipeline: Antibiotic[];
  policies: Policies;
  nextDrugIdx: number; // counter for naming new drugs
  history: EconomicsSnapshot[];
  status: "playing" | "market_failure" | "crisis_averted";
};

// --- tunable constants ---
export const STARTING_CASH = 500; // $M
export const BASE_OPERATING_INCOME = 100; // per turn, $M (unrelated revenue stream)

// development
export const DEV_TURNS = 5; // turns from invest → launch
export const DEV_COST_PER_TURN = 80; // $M/turn while in pipeline
//   total dev cost: 5 * 80 = 400

// post-launch revenue (held in reserve, so volume is LOW)
export const ACTIVE_LIFE_TURNS = 10; // turns the drug is effective + selling
export const REVENUE_PER_TURN_BASE = 20; // $M/turn — total = 200 over active life
//   default total revenue (200) < total dev cost (400) → net loss of 200

// policy effects
export const REVENUE_PER_TURN_SUBSCRIPTION = 80; // pay-for-access, volume-independent
//   subscription total = 800, profitable on its own
export const MARKET_ENTRY_REWARD = 200; // lump sum on launch
export const PUSH_FUNDING_DEV_DISCOUNT = 0.5; // multiplies dev cost
//   push funding alone: 200 cost → just breaks even

// resistance dynamics
export const RESISTANCE_BASE_DRIFT = 0.05; // per turn, no active drugs
export const RESISTANCE_DAMPENING_PER_DRUG = 0.04; // per active launched drug
//   one active drug → net drift +0.01/turn
//   zero active drugs → +0.05/turn → crisis in ~20 turns from 0
export const CRISIS_THRESHOLD = 1.0;

export const MAX_TURNS = 30; // hit 30 with no crisis → win
export const HISTORY_CAP = 50;

export function initialEconomicsState(): EconomicsState {
  return {
    turn: 0,
    cash: STARTING_CASH,
    societalResistance: 0,
    pipeline: [],
    policies: {
      subscription: false,
      marketEntryReward: false,
      pushFunding: false,
    },
    nextDrugIdx: 0,
    history: [
      { turn: 0, cash: STARTING_CASH, societalResistance: 0 },
    ],
    status: "playing",
  };
}

function devCostPerTurn(policies: Policies): number {
  return policies.pushFunding
    ? DEV_COST_PER_TURN * PUSH_FUNDING_DEV_DISCOUNT
    : DEV_COST_PER_TURN;
}

function revenuePerTurn(policies: Policies): number {
  return policies.subscription
    ? REVENUE_PER_TURN_SUBSCRIPTION
    : REVENUE_PER_TURN_BASE;
}

function launchBonus(policies: Policies): number {
  return policies.marketEntryReward ? MARKET_ENTRY_REWARD : 0;
}

// Apply one year of economic state. Returns a new state — pure.
export function advanceEconomicsTurn(state: EconomicsState): EconomicsState {
  if (state.status !== "playing") return state;

  let cash = state.cash;
  const turn = state.turn + 1;
  const dev = devCostPerTurn(state.policies);
  const rev = revenuePerTurn(state.policies);
  const bonus = launchBonus(state.policies);

  // base operating income — keeps the player solvent if they choose not to invest
  cash += BASE_OPERATING_INCOME;

  // step every drug in the pipeline; track launches this turn for the bonus
  let launchedThisTurn = 0;
  let activeLaunchedNext = 0; // count of drugs that will be active after this turn
  const pipeline: Antibiotic[] = state.pipeline.map((d) => {
    if (d.status === "developing") {
      cash -= dev;
      const devTurnsRemaining = d.devTurnsRemaining - 1;
      if (devTurnsRemaining <= 0) {
        launchedThisTurn += 1;
        activeLaunchedNext += 1;
        return {
          ...d,
          status: "launched" as const,
          devTurnsRemaining: 0,
          activeTurnsRemaining: ACTIVE_LIFE_TURNS,
        };
      }
      return { ...d, devTurnsRemaining };
    }
    if (d.status === "launched") {
      cash += rev;
      const activeTurnsRemaining = d.activeTurnsRemaining - 1;
      if (activeTurnsRemaining <= 0) {
        return { ...d, status: "expired" as const, activeTurnsRemaining: 0 };
      }
      activeLaunchedNext += 1;
      return { ...d, activeTurnsRemaining };
    }
    return d;
  });

  cash += launchedThisTurn * bonus;

  // resistance drifts up, each currently-active launched drug dampens it
  const dampening = activeLaunchedNext * RESISTANCE_DAMPENING_PER_DRUG;
  const drift = Math.max(0, RESISTANCE_BASE_DRIFT - dampening);
  const societalResistance = Math.min(1, state.societalResistance + drift);

  // win/lose check
  let status: EconomicsState["status"] = "playing";
  if (societalResistance >= CRISIS_THRESHOLD) {
    const anyEffective = activeLaunchedNext > 0;
    status = anyEffective ? "playing" : "market_failure";
  }
  if (status === "playing" && turn >= MAX_TURNS) {
    status = "crisis_averted";
  }

  const snapshot: EconomicsSnapshot = {
    turn,
    cash: Math.round(cash),
    societalResistance,
  };
  const history = [...state.history, snapshot].slice(-HISTORY_CAP);

  return {
    ...state,
    turn,
    cash: Math.round(cash),
    societalResistance,
    pipeline,
    history,
    status,
  };
}

// Invest in a new antibiotic. Adds it to the pipeline; the dev cost is paid
// per-turn during development (not upfront), so this action just spawns the
// drug. Returns null if the game has already ended.
export function startNewAntibiotic(state: EconomicsState): EconomicsState {
  if (state.status !== "playing") return state;
  const idx = state.nextDrugIdx + 1;
  const name = `Antibiotic ${String.fromCharCode(64 + ((idx - 1) % 26) + 1)}${
    idx > 26 ? Math.ceil(idx / 26) : ""
  }`;
  const drug: Antibiotic = {
    id: `drug-${idx}`,
    name,
    status: "developing",
    devTurnsRemaining: DEV_TURNS,
    activeTurnsRemaining: 0,
  };
  return {
    ...state,
    pipeline: [...state.pipeline, drug],
    nextDrugIdx: idx,
  };
}

export function setPolicy(
  state: EconomicsState,
  key: keyof Policies,
  value: boolean
): EconomicsState {
  return {
    ...state,
    policies: { ...state.policies, [key]: value },
  };
}
