"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { resistantFraction, totalPopulation } from "@/lib/engine";
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

export default function EvolutionView() {
  const tick = useSimStore((s) => s.tick);
  const buckets = useSimStore((s) => s.buckets);
  const drugConcentration = useSimStore((s) => s.drugConcentration);

  const pop = totalPopulation(buckets);
  const frac = resistantFraction(buckets);

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
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>state</CardTitle>
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
              <CardTitle>charts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
                charts coming in step 9
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
