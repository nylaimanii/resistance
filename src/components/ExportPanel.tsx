"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// IMPORTANT: static imports (not next/dynamic) so the offscreen export
// charts are guaranteed to be mounted and painted by the time the user
// clicks "export run report". Dynamic imports introduced a race where a
// fast click could land before the chart had finished its first render
// → empty svg → blank png.
import TimeSeriesChart from "@/components/TimeSeriesChart";
import DistributionChart from "@/components/DistributionChart";
import { resistantFraction, totalPopulation } from "@/lib/engine";
import { useSimStore } from "@/lib/store";
import { captureExportChart } from "@/lib/svg-to-png";

const MAX_HISTORY_POINTS = 18;

// off-screen capture dimensions. Matching render size (exportSize) to
// output canvas size (captureExportChart args) keeps everything 1:1 — no
// hidden scaling that could lose detail.
const CAPTURE_TS_W = 1200;
const CAPTURE_TS_H = 600;
const CAPTURE_DIST_W = 1200;
const CAPTURE_DIST_H = 533;

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

// Probe the chart container for the LARGEST svg (matches pickMainSvg in
// svg-to-png) — using `container.querySelector("svg")` would return the
// first svg, which for a chart with a Legend is a tiny 14×14 swatch icon
// and would falsely pass any size check.
function pickedSvgArea(selector: string): number {
  if (typeof document === "undefined") return 0;
  const container = document.querySelector(selector);
  if (!container) return 0;
  const svgs = Array.from(container.querySelectorAll("svg")) as SVGSVGElement[];
  let best = 0;
  for (const s of svgs) {
    const r = s.getBoundingClientRect();
    let w = r.width;
    let h = r.height;
    if (!w || !h) {
      w = Number(s.getAttribute("width")) || 0;
      h = Number(s.getAttribute("height")) || 0;
    }
    const a = w * h;
    if (a > best) best = a;
  }
  return best;
}

// Threshold guard: anything smaller than ~100×100 pixels is almost certainly
// a legend icon or an unrendered/collapsed chart container. Better to skip
// it and fall back to the text-only report than embed a blank image.
const MIN_CAPTURE_AREA = 100 * 100;

async function captureCharts(): Promise<{
  timeSeries: string | null;
  distribution: string | null;
}> {
  // small delay so recharts can settle after any in-flight tick update
  await new Promise((r) => setTimeout(r, 50));

  // retry up to twice if the main chart svg is still too small to be real
  async function captureOne(
    selector: string,
    w: number,
    h: number
  ): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (pickedSvgArea(selector) >= MIN_CAPTURE_AREA) {
        return captureExportChart(selector, w, h);
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    return null;
  }

  const timeSeries = await captureOne(
    "[data-export-chart='time-series']",
    CAPTURE_TS_W,
    CAPTURE_TS_H
  );
  const distribution = await captureOne(
    "[data-export-chart='distribution']",
    CAPTURE_DIST_W,
    CAPTURE_DIST_H
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
          ready to serialize on click. Every wrapper has an EXPLICIT pixel
          size so nothing can collapse to 0×0 inside a flex/grid descendant.
          position:absolute removes it from layout flow; left:-10000px keeps
          it off-screen without using display:none (which would prevent
          recharts from measuring/painting). */}
      <div
        aria-hidden
        className="pointer-events-none"
        style={{
          position: "absolute",
          left: -10000,
          top: 0,
          width: CAPTURE_TS_W,
          height: CAPTURE_TS_H + CAPTURE_DIST_H + 40,
        }}
      >
        <div
          data-export-chart="time-series"
          style={{ width: CAPTURE_TS_W, height: CAPTURE_TS_H }}
        >
          <TimeSeriesChart
            exportSize={{ width: CAPTURE_TS_W, height: CAPTURE_TS_H }}
          />
        </div>
        <div
          data-export-chart="distribution"
          style={{ width: CAPTURE_DIST_W, height: CAPTURE_DIST_H }}
        >
          <DistributionChart
            exportSize={{ width: CAPTURE_DIST_W, height: CAPTURE_DIST_H }}
          />
        </div>
      </div>
    </main>
  );
}
