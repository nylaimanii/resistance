"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSimStore } from "@/lib/store";

const POPULATION_COLOR = "var(--color-foreground)";
const RESISTANCE_COLOR = "var(--color-destructive)";

type Point = {
  tick: number;
  population: number;
  resistantPct: number;
};

type Props = {
  // when set, render the chart at a fixed pixel size with NO ResponsiveContainer
  // (so the SVG has hard width/height attrs even when mounted off-screen, which
  // ResponsiveContainer can't measure → -1x-1 → blank png on capture).
  exportSize?: { width: number; height: number };
};

// returned as an array (not a fragment) so recharts sees these as direct
// children of LineChart in every recharts version
function chartInner() {
  return [
    <CartesianGrid
      key="grid"
      strokeDasharray="3 3"
      stroke="var(--color-border)"
    />,
    <XAxis
      key="x"
      dataKey="tick"
      type="number"
      domain={["dataMin", "dataMax"]}
      stroke="var(--color-muted-foreground)"
      tick={{ fontSize: 11 }}
      label={{
        value: "tick",
        position: "insideBottomRight",
        offset: -2,
        fontSize: 11,
        fill: "var(--color-muted-foreground)",
      }}
    />,
    <YAxis
      key="y-pop"
      yAxisId="pop"
      stroke="var(--color-muted-foreground)"
      tick={{ fontSize: 11 }}
      width={56}
      label={{
        value: "population",
        angle: -90,
        position: "insideLeft",
        fontSize: 11,
        fill: "var(--color-muted-foreground)",
      }}
    />,
    <YAxis
      key="y-res"
      yAxisId="res"
      orientation="right"
      domain={[0, 100]}
      stroke="var(--color-muted-foreground)"
      tick={{ fontSize: 11 }}
      width={42}
      tickFormatter={(v: number) => `${v}%`}
      label={{
        value: "resistant",
        angle: 90,
        position: "insideRight",
        fontSize: 11,
        fill: "var(--color-muted-foreground)",
      }}
    />,
    <Tooltip
      key="tooltip"
      contentStyle={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        fontSize: 12,
      }}
      formatter={(value, name) => {
        const n = typeof value === "number" ? value : Number(value);
        return name === "resistant %"
          ? [`${n.toFixed(1)}%`, name]
          : [n.toLocaleString(), name];
      }}
      labelFormatter={(tick) => `tick ${tick}`}
    />,
    <Legend key="legend" wrapperStyle={{ fontSize: 12 }} />,
    <Line
      key="line-pop"
      yAxisId="pop"
      type="monotone"
      dataKey="population"
      name="population"
      stroke={POPULATION_COLOR}
      strokeWidth={2}
      dot={false}
      isAnimationActive={false}
    />,
    <Line
      key="line-res"
      yAxisId="res"
      type="monotone"
      dataKey="resistantPct"
      name="resistant %"
      stroke={RESISTANCE_COLOR}
      strokeWidth={2}
      dot={false}
      isAnimationActive={false}
    />,
  ];
}

export default function TimeSeriesChart({ exportSize }: Props = {}) {
  const history = useSimStore((s) => s.history);

  const data = useMemo<Point[]>(
    () =>
      history.map((s) => ({
        tick: s.tick,
        population: s.population,
        resistantPct: s.resistantFraction * 100,
      })),
    [history]
  );

  if (exportSize) {
    // fixed-size export path: explicit width/height on LineChart guarantees
    // a real SVG even when mounted off-screen.
    return (
      <div style={{ width: exportSize.width, height: exportSize.height }}>
        <LineChart
          width={exportSize.width}
          height={exportSize.height}
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          {chartInner()}
        </LineChart>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          {chartInner()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
