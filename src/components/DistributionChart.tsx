"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSimStore } from "@/lib/store";

const SAFE_COLOR = "var(--color-foreground)";
const DANGER_COLOR = "var(--color-destructive)";

// blend safe → danger by resistance level (0..1) so bars to the right read as more dangerous
function barFill(level: number): string {
  const t = Math.max(0, Math.min(1, level));
  return `color-mix(in oklab, ${SAFE_COLOR} ${(1 - t) * 100}%, ${DANGER_COLOR})`;
}

type Point = {
  level: number;
  count: number;
  levelLabel: string;
};

export default function DistributionChart() {
  const buckets = useSimStore((s) => s.buckets);

  const data = useMemo<Point[]>(
    () =>
      buckets.map((b) => ({
        level: b.level,
        count: b.count,
        levelLabel: b.level.toFixed(2),
      })),
    [buckets]
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="levelLabel"
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            interval={1}
            label={{
              value: "resistance level",
              position: "insideBottomRight",
              offset: -2,
              fontSize: 11,
              fill: "var(--color-muted-foreground)",
            }}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            width={56}
            label={{
              value: "count",
              angle: -90,
              position: "insideLeft",
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
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [n.toLocaleString(), "count"];
            }}
            labelFormatter={(label) => `level ${label}`}
          />
          <Bar dataKey="count" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.level} fill={barFill(d.level)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
