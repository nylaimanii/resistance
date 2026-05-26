"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CRISIS_THRESHOLD,
  DEV_COST_PER_TURN,
  DEV_TURNS,
  MAX_TURNS,
  PUSH_FUNDING_DEV_DISCOUNT,
  REVENUE_PER_TURN_BASE,
  REVENUE_PER_TURN_SUBSCRIPTION,
  MARKET_ENTRY_REWARD,
  ACTIVE_LIFE_TURNS,
} from "@/lib/economics";
import type { Policies } from "@/lib/economics";
import { useSimStore } from "@/lib/store";

// recharts needs the DOM
const EconChart = dynamic(
  () => import("@/components/EconomicsChart"),
  { ssr: false }
);

const POLICY_LABELS: Record<
  keyof Policies,
  { title: string; blurb: string }
> = {
  subscription: {
    title: "subscription / netflix model",
    blurb: `pay-for-access, not per-volume: revenue jumps from $${REVENUE_PER_TURN_BASE}M to $${REVENUE_PER_TURN_SUBSCRIPTION}M / yr regardless of how sparingly the drug is used.`,
  },
  marketEntryReward: {
    title: "market-entry reward",
    blurb: `lump-sum $${MARKET_ENTRY_REWARD}M paid to the company on regulatory approval. de-risks the development gamble.`,
  },
  pushFunding: {
    title: "push funding (R&D subsidy)",
    blurb: `government covers ${Math.round(
      (1 - PUSH_FUNDING_DEV_DISCOUNT) * 100
    )}% of per-year development cost. lowers the up-front commitment.`,
  },
};

function PolicyRow({ k }: { k: keyof Policies }) {
  const value = useSimStore((s) => s.economics.policies[k]);
  const toggle = useSimStore((s) => s.togglePolicy);
  const { title, blurb } = POLICY_LABELS[k];
  return (
    <button
      type="button"
      onClick={() => toggle(k)}
      className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
        value
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            value
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {value ? "on" : "off"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
    </button>
  );
}

function PipelineList() {
  const pipeline = useSimStore((s) => s.economics.pipeline);
  if (pipeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        no antibiotics in development. with policies off, that&apos;s the
        financially rational state — but resistance climbs anyway.
      </p>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {pipeline.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
        >
          <span className="font-medium">{d.name}</span>
          {d.status === "developing" && (
            <span className="font-mono text-xs text-muted-foreground">
              dev, {d.devTurnsRemaining} yr{d.devTurnsRemaining === 1 ? "" : "s"} left
            </span>
          )}
          {d.status === "launched" && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
              launched · {d.activeTurnsRemaining} yr{d.activeTurnsRemaining === 1 ? "" : "s"} active
            </span>
          )}
          {d.status === "expired" && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              expired
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ResistanceBar({ value }: { value: number }) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>societal resistance</span>
        <span className="font-mono tabular-nums">
          {(pct * 100).toFixed(0)}% / crisis @ {(CRISIS_THRESHOLD * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full transition-all"
          style={{
            width: `${pct * 100}%`,
            background: `color-mix(in oklab, oklch(0.696 0.17 162.48) ${(1 - pct) * 100}%, var(--color-destructive))`,
          }}
        />
      </div>
    </div>
  );
}

function StatusBanner() {
  const status = useSimStore((s) => s.economics.status);
  if (status === "playing") return null;
  if (status === "market_failure") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <strong>market failure.</strong> resistance hit the crisis threshold
        with no effective drug in active rotation. the rational pharma move
        (don&apos;t invest, drugs don&apos;t pay) was also the worst societal
        outcome. flip a policy and reset.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
      <strong>crisis averted.</strong> you made it to year {MAX_TURNS} below
      the crisis line. policy reshaped the incentives enough that drugs
      kept flowing.
    </div>
  );
}

export default function EconomicsView() {
  const economics = useSimStore((s) => s.economics);
  const invest = useSimStore((s) => s.investInAntibiotic);
  const advance = useSimStore((s) => s.advanceYear);
  const resetEconomics = useSimStore((s) => s.resetEconomics);

  const investCostPerYear = useMemo(
    () =>
      economics.policies.pushFunding
        ? DEV_COST_PER_TURN * PUSH_FUNDING_DEV_DISCOUNT
        : DEV_COST_PER_TURN,
    [economics.policies.pushFunding]
  );

  const isOver = economics.status !== "playing";

  return (
    <main className="min-h-screen w-full px-6 py-8 lg:px-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">economics</h1>
        <p className="text-sm text-muted-foreground">
          you run a pharma company. develop new antibiotics, watch the
          incentives, see why the pipeline is empty by the time resistance
          wins — then flip policies and feel the math change.
        </p>
      </header>

      <StatusBanner />

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>company + society</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  year {economics.turn} / {MAX_TURNS}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    cash
                  </div>
                  <div className="font-mono text-xl tabular-nums">
                    ${economics.cash.toLocaleString()}M
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    in pipeline
                  </div>
                  <div className="font-mono text-xl tabular-nums">
                    {economics.pipeline.filter((d) => d.status === "developing").length}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    active drugs
                  </div>
                  <div className="font-mono text-xl tabular-nums">
                    {economics.pipeline.filter((d) => d.status === "launched").length}
                  </div>
                </div>
              </div>
              <ResistanceBar value={economics.societalResistance} />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={invest}
                  disabled={isOver}
                  variant="secondary"
                >
                  invest in new antibiotic ($
                  {investCostPerYear}M/yr × {DEV_TURNS} yrs)
                </Button>
                <Button onClick={advance} disabled={isOver}>
                  advance year
                </Button>
                <Button variant="ghost" onClick={resetEconomics}>
                  reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>cash + resistance over time</CardTitle>
            </CardHeader>
            <CardContent>
              <EconChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineList />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>policy sandbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <PolicyRow k="subscription" />
              <PolicyRow k="marketEntryReward" />
              <PolicyRow k="pushFunding" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>the trap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                a launched antibiotic gets held in reserve to slow resistance, so
                volume is tiny. with policies off:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  dev cost: ${DEV_COST_PER_TURN}M × {DEV_TURNS} ={" "}
                  <strong>${DEV_COST_PER_TURN * DEV_TURNS}M</strong>
                </li>
                <li>
                  total revenue: ${REVENUE_PER_TURN_BASE}M × {ACTIVE_LIFE_TURNS} ={" "}
                  <strong>${REVENUE_PER_TURN_BASE * ACTIVE_LIFE_TURNS}M</strong>
                </li>
                <li>
                  net per antibiotic:{" "}
                  <strong className="text-destructive">
                    -$
                    {DEV_COST_PER_TURN * DEV_TURNS -
                      REVENUE_PER_TURN_BASE * ACTIVE_LIFE_TURNS}
                    M
                  </strong>
                </li>
              </ul>
              <p>
                so the rational company invests nothing — and society watches
                resistance climb toward crisis. flip a policy and the math
                changes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
