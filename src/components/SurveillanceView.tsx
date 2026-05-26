"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  regionPopulation,
  regionResistantFraction,
} from "@/lib/surveillance";
import { useSimStore } from "@/lib/store";
import type { Region } from "@/lib/types";

// map viewBox — region positions are normalized 0..1 and scaled into this space
const MAP_W = 1000;
const MAP_H = 600;
const NODE_R = 28;
const NODE_R_SELECTED = 34;

// green = safe (low resistance), red = danger (high). same color-mix idea
// as DistributionChart but with a green safe color so the map reads
// intuitively.
const SAFE_COLOR = "oklch(0.696 0.17 162.48)"; // emerald-500
const DANGER_COLOR = "var(--color-destructive)";

function nodeFill(resistantFrac: number): string {
  const t = Math.max(0, Math.min(1, resistantFrac));
  return `color-mix(in oklab, ${SAFE_COLOR} ${(1 - t) * 100}%, ${DANGER_COLOR})`;
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function RegionMap() {
  const regions = useSimStore((s) => s.regions);
  const connections = useSimStore((s) => s.connections);
  const selectedRegionId = useSimStore((s) => s.selectedRegionId);
  const selectRegion = useSimStore((s) => s.selectRegion);

  const byId = new Map(regions.map((r) => [r.id, r]));

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="h-auto w-full rounded-md border bg-muted/20"
      role="img"
      aria-label="surveillance region map"
    >
      {/* connections (lines) — drawn first so nodes sit on top */}
      {connections.map((c, i) => {
        const a = byId.get(c.a);
        const b = byId.get(c.b);
        if (!a || !b) return null;
        return (
          <line
            key={`conn-${i}`}
            x1={a.x * MAP_W}
            y1={a.y * MAP_H}
            x2={b.x * MAP_W}
            y2={b.y * MAP_H}
            stroke="var(--color-muted-foreground)"
            strokeWidth={1 + c.weight * 3}
            strokeOpacity={0.35 + c.weight * 0.35}
          />
        );
      })}

      {/* nodes */}
      {regions.map((r) => {
        const frac = regionResistantFraction(r);
        const selected = selectedRegionId === r.id;
        const cx = r.x * MAP_W;
        const cy = r.y * MAP_H;
        return (
          <g
            key={r.id}
            onClick={() => selectRegion(selected ? null : r.id)}
            className="cursor-pointer"
          >
            <circle
              cx={cx}
              cy={cy}
              r={selected ? NODE_R_SELECTED : NODE_R}
              fill={nodeFill(frac)}
              stroke={
                selected
                  ? "var(--color-foreground)"
                  : r.doseActive
                    ? "var(--color-destructive)"
                    : "var(--color-border)"
              }
              strokeWidth={selected ? 4 : r.doseActive ? 3 : 2}
            />
            <text
              x={cx}
              y={cy - NODE_R_SELECTED - 10}
              textAnchor="middle"
              fontSize={18}
              fontWeight={500}
              fill="var(--color-foreground)"
            >
              {r.name}
            </text>
            <text
              x={cx}
              y={cy + NODE_R_SELECTED + 24}
              textAnchor="middle"
              fontSize={16}
              fontFamily="ui-monospace, monospace"
              fill="var(--color-muted-foreground)"
            >
              {pct(frac)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SelectedRegionPanel({ region }: { region: Region | null }) {
  const doseStrength = useSimStore((s) => s.params.doseStrength);
  const deployDrugToRegion = useSimStore((s) => s.deployDrugToRegion);
  const stopDoseInRegion = useSimStore((s) => s.stopDoseInRegion);

  if (!region) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>selected region</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            click a node on the map to treat or inspect that region. dose
            strength comes from the evolution view slider.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pop = regionPopulation(region);
  const frac = regionResistantFraction(region);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span>{region.name}</span>
          {region.doseActive && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
              dosing
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              population
            </div>
            <div className="font-mono tabular-nums">{pop.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              resistant
            </div>
            <div className="font-mono tabular-nums">{pct(frac)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              drug conc.
            </div>
            <div className="font-mono tabular-nums">
              {region.drugConcentration.toFixed(3)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => deployDrugToRegion(region.id, doseStrength)}
            disabled={doseStrength === 0 || region.doseActive}
          >
            {region.doseActive ? "dosing..." : "deploy drug"}
          </Button>
          <Button
            variant="outline"
            onClick={() => stopDoseInRegion(region.id)}
            disabled={!region.doseActive}
          >
            stop dose
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SurveillanceControls() {
  const running = useSimStore((s) => s.surveillanceRunning);
  const start = useSimStore((s) => s.startSurveillance);
  const pause = useSimStore((s) => s.pauseSurveillance);
  const reset = useSimStore((s) => s.resetSurveillance);
  const tick = useSimStore((s) => s.surveillanceTick);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>simulation</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            tick {tick}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          deploy a drug in one region, then watch resistance spread along the
          connections to its neighbors.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => (running ? pause() : start())}>
            {running ? "pause" : "play"}
          </Button>
          <Button variant="ghost" onClick={reset}>
            reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SurveillanceView() {
  const regions = useSimStore((s) => s.regions);
  const selectedRegionId = useSimStore((s) => s.selectedRegionId);
  const selected = regions.find((r) => r.id === selectedRegionId) ?? null;

  return (
    <main className="min-h-screen w-full px-6 py-8 lg:px-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">surveillance</h1>
        <p className="text-sm text-muted-foreground">
          same engine, many regions. resistance evolves locally and spreads
          along connections — treat one region and watch the map redden
          outward.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Card>
          <CardHeader>
            <CardTitle>region map</CardTitle>
          </CardHeader>
          <CardContent>
            <RegionMap />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <SurveillanceControls />
          <SelectedRegionPanel region={selected} />
        </div>
      </div>
    </main>
  );
}
