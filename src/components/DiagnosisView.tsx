"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { resistantFraction } from "@/lib/engine";
import { useSimStore } from "@/lib/store";

type Verdict = {
  label: string;
  detail: string;
  tone: "ok" | "warn" | "danger";
};

function verdictFor(fraction: number): Verdict {
  if (fraction < 0.25)
    return {
      label: "likely effective",
      detail: "standard antibiotic should still clear this infection.",
      tone: "ok",
    };
  if (fraction < 0.6)
    return {
      label: "partially effective",
      detail: "drug may suppress but not clear — risk of breeding more resistance.",
      tone: "warn",
    };
  return {
    label: "likely to fail",
    detail: "resistant strain dominates — standard course will not work.",
    tone: "danger",
  };
}

function badgeClasses(tone: Verdict["tone"]) {
  switch (tone) {
    case "ok":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "warn":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "danger":
      return "bg-destructive/15 text-destructive";
  }
}

export default function DiagnosisView() {
  const tick = useSimStore((s) => s.tick);
  const history = useSimStore((s) => s.history);
  const buckets = useSimStore((s) => s.buckets);
  const diagnosisLagTicks = useSimStore((s) => s.diagnosisLagTicks);
  const setDiagnosisLag = useSimStore((s) => s.setDiagnosisLag);

  const actualFraction = resistantFraction(buckets);

  // pull a snapshot diagnosisLagTicks ago; clamp to the oldest available
  const lagged =
    history.length === 0
      ? null
      : history[Math.max(0, history.length - 1 - diagnosisLagTicks)];

  return (
    <main className="min-h-screen w-full px-6 py-8 lg:px-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">diagnosis</h1>
        <p className="text-sm text-muted-foreground">
          culture results take days — you treat based on the past, not the present.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>lab settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="diagnosis-lag">culture turnaround (ticks)</Label>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {diagnosisLagTicks}
                </span>
              </div>
              <Slider
                id="diagnosis-lag"
                value={[diagnosisLagTicks]}
                min={1}
                max={20}
                step={1}
                onValueChange={(v) =>
                  setDiagnosisLag(
                    Math.round(Array.isArray(v) ? v[0] : (v as number))
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                a longer lab delay widens the gap between what the lab reports and
                what the patient actually has right now.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {lagged
                  ? `culture result (from tick ${lagged.tick})`
                  : "culture result"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lagged ? (
                <LabBody fraction={lagged.resistantFraction} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  no sample yet — start the simulation to collect data.
                </p>
              )}
              <div className="mt-6 border-t pt-3 text-xs text-muted-foreground">
                <span className="font-medium">actual, now (tick {tick}): </span>
                <span className="font-mono tabular-nums">
                  {(actualFraction * 100).toFixed(1)}%
                </span>{" "}
                resistant — the gap between this and the lab result is the blind
                spot you&apos;re treating into.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function LabBody({ fraction }: { fraction: number }) {
  const verdict = verdictFor(fraction);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          resistant population
        </span>
        <span className="font-mono text-2xl tabular-nums">
          {(fraction * 100).toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          drug efficacy verdict
        </span>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClasses(
              verdict.tone
            )}`}
          >
            {verdict.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{verdict.detail}</p>
      </div>
    </div>
  );
}
