// Server-only. Builds a real run report from the sim state the client sends
// and writes it into a new google doc using the docs API. No chart images yet
// (step 21) — text + events + downsampled history stand in for now.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import type { docs_v1 } from "googleapis";
import { ACCESS_COOKIE } from "@/lib/google-oauth";

export const runtime = "nodejs";

type ReportEvent = { tick: number; kind: string; note: string };
type HistoryPoint = {
  tick: number;
  population: number;
  resistantFraction: number;
};

type ReportPayload = {
  title?: string;
  timestamp?: string;
  params?: {
    mutationRate: number;
    doseStrength: number;
    carryingCapacity: number;
    doseDecay: number;
    tickIntervalMs?: number;
  };
  finalState?: {
    tick: number;
    population: number;
    resistantFraction: number;
    drugConcentration: number;
    doseActive: boolean;
    phase: string;
  };
  events?: ReportEvent[];
  history?: HistoryPoint[];
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function summarizeEvents(events: ReportEvent[]): string {
  if (events.length === 0) {
    return "no events fired during this run.";
  }
  const parts = events.map((e) => {
    switch (e.kind) {
      case "drug_deployed":
        return `${e.note} at tick ${e.tick}`;
      case "dose_stopped":
        return `dose stopped at tick ${e.tick}`;
      case "threshold_crossed":
        return `resistance crossed 50% at tick ${e.tick}`;
      case "cleared":
        return `population cleared at tick ${e.tick}`;
      default:
        return `${e.kind} at tick ${e.tick}`;
    }
  });
  return parts.join(", then ") + ".";
}

type Built = {
  text: string;
  styles: {
    range: { startIndex: number; endIndex: number };
    namedStyleType: "HEADING_1" | "HEADING_2";
  }[];
};

function buildContent(p: ReportPayload): Built {
  const title = p.title ?? "RESISTANCE run report";
  const timestamp = p.timestamp ?? new Date().toISOString();

  let text = "";
  const styles: Built["styles"] = [];

  // doc indices are 1-based; my buffer offsets are 0-based, so docs index = offset + 1
  const addHeading = (s: string, namedStyleType: "HEADING_1" | "HEADING_2") => {
    const startIndex = text.length + 1;
    text += s + "\n";
    const endIndex = text.length + 1; // includes the trailing newline
    styles.push({ range: { startIndex, endIndex }, namedStyleType });
  };
  const addLine = (s: string) => {
    text += s + "\n";
  };

  addHeading(title, "HEADING_1");
  addLine(`generated ${timestamp}`);
  addLine("");

  addHeading("parameters", "HEADING_2");
  if (p.params) {
    addLine(`mutation rate: ${p.params.mutationRate}`);
    addLine(`dose strength: ${p.params.doseStrength}`);
    addLine(`carrying capacity: ${p.params.carryingCapacity.toLocaleString()}`);
    addLine(`dose decay: ${p.params.doseDecay}`);
    if (typeof p.params.tickIntervalMs === "number") {
      addLine(`tick interval: ${p.params.tickIntervalMs} ms`);
    }
  } else {
    addLine("(no parameters reported)");
  }
  addLine("");

  addHeading("what happened", "HEADING_2");
  addLine(summarizeEvents(p.events ?? []));
  if (p.finalState) {
    addLine(
      `final state at tick ${p.finalState.tick}: population ${p.finalState.population.toLocaleString()}, resistant ${pct(
        p.finalState.resistantFraction
      )}, drug concentration ${p.finalState.drugConcentration.toFixed(3)}, course ${
        p.finalState.doseActive ? "active" : "off"
      }, phase ${p.finalState.phase}.`
    );
  }
  addLine("");

  addHeading("events log", "HEADING_2");
  if ((p.events ?? []).length === 0) {
    addLine("(no events)");
  } else {
    for (const e of p.events ?? []) {
      addLine(`tick ${e.tick} — ${e.kind}: ${e.note}`);
    }
  }
  addLine("");

  addHeading("resistance over time", "HEADING_2");
  addLine("(charts ship in step 21 — text sample below)");
  if ((p.history ?? []).length === 0) {
    addLine("(no history captured)");
  } else {
    for (const h of p.history ?? []) {
      addLine(
        `tick ${h.tick}: population ${h.population.toLocaleString()}, resistant ${pct(
          h.resistantFraction
        )}`
      );
    }
  }

  return { text, styles };
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "not connected to google" });
  }

  let payload: ReportPayload;
  try {
    payload = (await request.json()) as ReportPayload;
  } catch {
    return NextResponse.json(
      { error: "couldn't parse request body" },
      { status: 400 }
    );
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const docs = google.docs({ version: "v1", auth });

    const docTitle =
      payload.title ??
      `RESISTANCE run report — ${payload.timestamp ?? new Date().toISOString()}`;

    const created = await docs.documents.create({
      requestBody: { title: docTitle },
    });
    const documentId = created.data.documentId;
    if (!documentId) {
      return NextResponse.json(
        { error: "no document id returned" },
        { status: 502 }
      );
    }

    const built = buildContent(payload);
    const requests: docs_v1.Schema$Request[] = [
      { insertText: { location: { index: 1 }, text: built.text } },
      ...built.styles.map(
        (s): docs_v1.Schema$Request => ({
          updateParagraphStyle: {
            range: s.range,
            paragraphStyle: { namedStyleType: s.namedStyleType },
            fields: "namedStyleType",
          },
        })
      ),
    ];

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });

    return NextResponse.json({
      docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    });
  } catch {
    // never leak the raw error / token to the client
    return NextResponse.json(
      { error: "failed to write the run report — try reconnecting google." },
      { status: 502 }
    );
  }
}
