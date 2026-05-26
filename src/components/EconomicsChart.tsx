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

const CASH_COLOR = "var(--color-foreground)";
const RESISTANCE_COLOR = "var(--color-destructive)";

type Point = {
  turn: number;
  cash: number;
  resistancePct: number;
};

export default function EconomicsChart() {
  const history = useSimStore((s) => s.economics.history);

  const data = useMemo<Point[]>(
    () =>
      history.map((h) => ({
        turn: h.turn,
        cash: h.cash,
        resistancePct: h.societalResistance * 100,
      })),
    [history]
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="turn"
            type="number"
            domain={["dataMin", "dataMax"]}
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            label={{
              value: "year",
              position: "insideBottomRight",
              offset: -2,
              fontSize: 11,
              fill: "var(--color-muted-foreground)",
            }}
          />
          <YAxis
            yAxisId="cash"
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            width={56}
            label={{
              value: "cash ($M)",
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
              value: "resistance",
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
              return name === "resistance"
                ? [`${n.toFixed(1)}%`, name]
                : [`$${n.toLocaleString()}M`, name];
            }}
            labelFormatter={(t) => `year ${t}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="cash"
            type="monotone"
            dataKey="cash"
            name="cash"
            stroke={CASH_COLOR}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="res"
            type="monotone"
            dataKey="resistancePct"
            name="resistance"
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
