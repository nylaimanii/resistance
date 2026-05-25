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

export default function TimeSeriesChart() {
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

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
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
          />
          <YAxis
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
          />
          <YAxis
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
          />
          <Tooltip
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
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="pop"
            type="monotone"
            dataKey="population"
            name="population"
            stroke={POPULATION_COLOR}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="res"
            type="monotone"
            dataKey="resistantPct"
            name="resistant %"
            stroke={RESISTANCE_COLOR}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
