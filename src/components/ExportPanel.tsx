"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resistantFraction, totalPopulation } from "@/lib/engine";
import { useSimStore } from "@/lib/store";

const MAX_HISTORY_POINTS = 18;

function buildReportPayload() {
  const state = useSimStore.getState();
  const population = totalPopulation(state.buckets);
  const resFrac = resistantFraction(state.buckets);

  let phase: "growing" | "under_treatment" | "rebounding" | "cleared";
  if (population === 0) phase = "cleared";
  else if (state.doseActive) phase = "under_treatment";
  else if (state.drugConcentration > 0) phase = "rebounding";
  else phase = "growing";

  const timestamp = new Date().toISOString();

  // downsample the history so the doc has a readable progression instead of 300 rows
  const hist = state.history;
  const stride = Math.max(1, Math.ceil(hist.length / MAX_HISTORY_POINTS));
  const downsampled = hist.filter((_, i) => i % stride === 0).map((h) => ({
    tick: h.tick,
    population: h.population,
    resistantFraction: h.resistantFraction,
  }));
  // always include the very last point so the final state is on the chart
  if (
    hist.length > 0 &&
    (downsampled.length === 0 ||
      downsampled[downsampled.length - 1].tick !== hist[hist.length - 1].tick)
  ) {
    const last = hist[hist.length - 1];
    downsampled.push({
      tick: last.tick,
      population: last.population,
      resistantFraction: last.resistantFraction,
    });
  }

  return {
    title: `RESISTANCE run report — ${timestamp}`,
    timestamp,
    params: {
      mutationRate: state.params.mutationRate,
      doseStrength: state.params.doseStrength,
      carryingCapacity: state.params.carryingCapacity,
      doseDecay: state.params.doseDecay,
      tickIntervalMs: state.tickIntervalMs,
    },
    finalState: {
      tick: state.tick,
      population,
      resistantFraction: resFrac,
      drugConcentration: state.drugConcentration,
      doseActive: state.doseActive,
      phase,
    },
    events: state.events.map((e) => ({
      tick: e.tick,
      kind: e.kind,
      note: e.note,
    })),
    history: downsampled,
  };
}

export default function ExportPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  async function exportRunReport() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setDocUrl(null);
    try {
      const payload = buildReportPayload();
      const res = await fetch("/api/google/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { docUrl?: string; error?: string };
      if (data.docUrl) setDocUrl(data.docUrl);
      else setError(data.error ?? `request failed (${res.status})`);
    } catch {
      setError("network error — couldn't reach the export route.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full px-6 py-8 lg:px-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">export</h1>
        <p className="text-sm text-muted-foreground">
          connect google, then export the current run as a formatted doc.
          chart images come in step 21 — for now the report is text + events +
          a downsampled history.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>1. connect google</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              opens google&apos;s consent screen. you grant docs + drive.file
              scopes (drive.file = only files this app creates).
            </p>
            <Button onClick={() => (window.location.href = "/api/google/auth")}>
              connect google
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. export run report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              creates a new google doc in your drive with the current run&apos;s
              parameters, a plain-language summary, the events log, and the
              resistance trajectory. if you see &quot;not connected to google&quot;,
              run step 1 first.
            </p>
            <Button onClick={exportRunReport} disabled={loading}>
              {loading ? "exporting..." : "export run report"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {docUrl && (
              <p className="text-sm">
                report created:{" "}
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  open in google docs
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
