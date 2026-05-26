"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resistantFraction, totalPopulation } from "@/lib/engine";
import { useSimStore } from "@/lib/store";
import { captureExportChart } from "@/lib/svg-to-png";

// recharts charts need the DOM to measure; skip SSR
const TimeSeriesChart = dynamic(() => import("@/components/TimeSeriesChart"), {
  ssr: false,
});
const DistributionChart = dynamic(
  () => import("@/components/DistributionChart"),
  { ssr: false }
);

const MAX_HISTORY_POINTS = 18;

// off-screen capture container — recharts ResponsiveContainer needs real
// dimensions, so we give it explicit pixel size out at -10000px so it never
// affects layout or pointer events.
const CAPTURE_TS_W = 720;
const CAPTURE_TS_H = 360;
const CAPTURE_DIST_W = 720;
const CAPTURE_DIST_H = 320;

function buildReportPayload(images: {
  timeSeries: string | null;
  distribution: string | null;
}) {
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
    images,
  };
}

function svgHasRealSize(selector: string): boolean {
  if (typeof document === "undefined") return false;
  const container = document.querySelector(selector);
  const svg = container?.querySelector("svg") as SVGSVGElement | null;
  if (!svg) return false;
  const rect = svg.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) return true;
  // fall back to width/height attributes (rAF before paint can show rect=0×0
  // even when attrs are correct — fixed-size LineChart sets these)
  const w = Number(svg.getAttribute("width"));
  const h = Number(svg.getAttribute("height"));
  return Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0;
}

async function captureCharts(): Promise<{
  timeSeries: string | null;
  distribution: string | null;
}> {
  // small delay so recharts can settle after any in-flight tick update
  await new Promise((r) => setTimeout(r, 50));

  // one-time retry per chart if the svg still reports zero size
  async function captureOne(
    selector: string,
    w: number,
    h: number
  ): Promise<string | null> {
    if (!svgHasRealSize(selector)) {
      await new Promise((r) => setTimeout(r, 100));
      if (!svgHasRealSize(selector)) return null;
    }
    return captureExportChart(selector, w, h);
  }

  const timeSeries = await captureOne(
    "[data-export-chart='time-series']",
    1200,
    600
  );
  const distribution = await captureOne(
    "[data-export-chart='distribution']",
    1200,
    533
  );
  return { timeSeries, distribution };
}

export default function ExportPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [noteLines, setNoteLines] = useState<string[]>([]);

  async function exportRunReport() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setDocUrl(null);
    setNoteLines([]);
    try {
      const images = await captureCharts();
      const skipped: string[] = [];
      if (!images.timeSeries) skipped.push("time-series");
      if (!images.distribution) skipped.push("distribution");

      const payload = buildReportPayload(images);
      const res = await fetch("/api/google/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        docUrl?: string;
        error?: string;
        imagesEmbedded?: number;
        imagesSkipped?: string[];
      };
      if (data.docUrl) {
        setDocUrl(data.docUrl);
        const lines: string[] = [];
        if (skipped.length > 0) {
          lines.push(
            `client-side capture skipped: ${skipped.join(", ")} (text fallback used).`
          );
        }
        if (data.imagesSkipped && data.imagesSkipped.length > 0) {
          lines.push(
            `server-side embed skipped: ${data.imagesSkipped.join(
              ", "
            )} (text fallback used).`
          );
        }
        setNoteLines(lines);
      } else {
        setError(data.error ?? `request failed (${res.status})`);
      }
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
          connect google, then export the current run as a formatted doc with
          embedded charts. if chart capture or upload fails, the text report
          still ships.
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
              creates a new google doc with the current run&apos;s parameters,
              event summary, embedded charts, and resistance trajectory. if you
              see &quot;not connected to google&quot;, run step 1 first.
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
            {noteLines.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {noteLines.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* off-screen capture surface — kept mounted so the charts are always
          ready to serialize on click. fixed-size export variants (no
          ResponsiveContainer) so the SVG has real width/height attrs even
          when mounted off-screen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-10000px] top-0"
      >
        <div data-export-chart="time-series">
          <TimeSeriesChart
            exportSize={{ width: CAPTURE_TS_W, height: CAPTURE_TS_H }}
          />
        </div>
        <div data-export-chart="distribution">
          <DistributionChart
            exportSize={{ width: CAPTURE_DIST_W, height: CAPTURE_DIST_H }}
          />
        </div>
      </div>
    </main>
  );
}
