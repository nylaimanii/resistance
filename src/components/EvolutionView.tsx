"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { resistantFraction, totalPopulation } from "@/lib/engine";

// recharts ResponsiveContainer needs the real DOM to measure; skip SSR
const TimeSeriesChart = dynamic(() => import("@/components/TimeSeriesChart"), {
  ssr: false,
});
const DistributionChart = dynamic(() => import("@/components/DistributionChart"), {
  ssr: false,
});
import { useSimStore } from "@/lib/store";
import type { SimParams } from "@/lib/types";

type SliderSpec = {
  key: keyof SimParams;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
};

const SLIDERS: SliderSpec[] = [
  {
    key: "mutationRate",
    label: "mutation rate",
    min: 0,
    max: 0.1,
    step: 0.005,
    format: (v) => v.toFixed(3),
  },
  {
    key: "doseStrength",
    label: "dose strength",
    min: 0,
    max: 1,
    step: 0.05,
    format: (v) => v.toFixed(2),
  },
  {
    key: "carryingCapacity",
    label: "carrying capacity",
    min: 1000,
    max: 50_000,
    step: 1000,
    format: (v) => v.toLocaleString(),
  },
  {
    key: "doseDecay",
    label: "dose decay",
    min: 0,
    max: 0.5,
    step: 0.01,
    format: (v) => v.toFixed(2),
  },
];

function ParamSlider({ spec }: { spec: SliderSpec }) {
  const value = useSimStore((s) => s.params[spec.key]);
  const setParam = useSimStore((s) => s.setParam);
  const id = `slider-${spec.key}`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{spec.label}</Label>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {spec.format(value)}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        onValueChange={(v) =>
          setParam(spec.key, Array.isArray(v) ? v[0] : (v as number))
        }
      />
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-lg tabular-nums">{value}</span>
    </div>
  );
}

const SPEED_PRESETS: { label: string; ms: number }[] = [
  { label: "0.5×", ms: 300 },
  { label: "1×", ms: 150 },
  { label: "2×", ms: 75 },
  { label: "4×", ms: 37 },
];

function SpeedControl() {
  const tickIntervalMs = useSimStore((s) => s.tickIntervalMs);
  const setTickInterval = useSimStore((s) => s.setTickInterval);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">speed</span>
      <div className="flex gap-1">
        {SPEED_PRESETS.map((p) => {
          const active = tickIntervalMs === p.ms;
          return (
            <Button
              key={p.label}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setTickInterval(p.ms)}
            >
              {p.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ActionRow() {
  const running = useSimStore((s) => s.running);
  const doseStrength = useSimStore((s) => s.params.doseStrength);
  const doseActive = useSimStore((s) => s.doseActive);
  const start = useSimStore((s) => s.start);
  const pause = useSimStore((s) => s.pause);
  const deployDrug = useSimStore((s) => s.deployDrug);
  const stopDose = useSimStore((s) => s.stopDose);
  const reset = useSimStore((s) => s.reset);

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => (running ? pause() : start())}>
        {running ? "pause" : "play"}
      </Button>
      <Button
        variant="secondary"
        onClick={() => deployDrug(doseStrength)}
        disabled={doseStrength === 0 || doseActive}
      >
        {doseActive ? "dosing..." : "deploy antibiotic"}
      </Button>
      <Button variant="outline" onClick={stopDose} disabled={!doseActive}>
        stop dose
      </Button>
      <Button variant="ghost" onClick={reset}>
        reset
      </Button>
    </div>
  );
}

export default function EvolutionView() {
  const tick = useSimStore((s) => s.tick);
  const buckets = useSimStore((s) => s.buckets);
  const drugConcentration = useSimStore((s) => s.drugConcentration);
  const doseActive = useSimStore((s) => s.doseActive);

  const pop = totalPopulation(buckets);
  const frac = resistantFraction(buckets);
  const cleared = tick > 0 && pop === 0;

  return (
    <main className="min-h-screen w-full px-6 py-8 lg:px-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">evolution</h1>
        <p className="text-sm text-muted-foreground">
          deploy a drug, watch resistance evolve in real time.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {SLIDERS.map((spec) => (
              <ParamSlider key={spec.key} spec={spec} />
            ))}
            <div className="space-y-3 pt-2">
              <ActionRow />
              <SpeedControl />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span>state</span>
                {cleared && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    population cleared ✓
                  </span>
                )}
                {doseActive && !cleared && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                    dosing
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Readout label="tick" value={tick.toString()} />
                <Readout label="population" value={pop.toLocaleString()} />
                <Readout
                  label="resistant"
                  value={`${(frac * 100).toFixed(1)}%`}
                />
                <Readout
                  label="drug conc."
                  value={drugConcentration.toFixed(3)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>population + resistance over time</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>resistance distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
