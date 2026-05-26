// Server-only. Builds a real run report from the sim state the client sends
// and writes it into a new google doc using the docs API. Chart images are
// uploaded to the user's Drive (drive.file scope) and embedded via
// insertInlineImage. Each image step is independently try/catch'd so the
// text report still ships if image embedding fails.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { google } from "googleapis";
import type { docs_v1, drive_v3 } from "googleapis";
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
  // base64 data URLs (or raw base64) for the two charts. either or both may be null.
  images?: {
    timeSeries?: string | null;
    distribution?: string | null;
  };
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

type ImageKind = "timeSeries" | "distribution";

type Built = {
  text: string;
  styles: {
    range: { startIndex: number; endIndex: number };
    namedStyleType: "HEADING_1" | "HEADING_2";
  }[];
  // pre-insert image slot indices in the doc (1-based). a separate batchUpdate
  // inserts each image at its slot after the text + styles batch commits.
  imageSlots: { kind: ImageKind; index: number }[];
};

function buildContent(p: ReportPayload): Built {
  const title = p.title ?? "RESISTANCE run report";
  const timestamp = p.timestamp ?? new Date().toISOString();

  let text = "";
  const styles: Built["styles"] = [];
  const imageSlots: Built["imageSlots"] = [];

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
  const addImageSlot = (kind: ImageKind) => {
    // empty paragraph that will receive the inline image; if the image is
    // skipped the paragraph just stays empty (no crash, no broken section)
    const index = text.length + 1;
    imageSlots.push({ kind, index });
    text += "\n";
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
  addImageSlot("timeSeries");
  addLine("data table (tick-by-tick values):");
  if ((p.history ?? []).length === 0) {
    addLine("no history captured.");
  } else {
    for (const h of p.history ?? []) {
      addLine(
        `tick ${h.tick}: population ${h.population.toLocaleString()}, resistant ${pct(
          h.resistantFraction
        )}`
      );
    }
  }
  addLine("");

  addHeading("final resistance distribution", "HEADING_2");
  addImageSlot("distribution");
  addLine(
    "histogram of resistance levels at the end of the run, low (susceptible) on the left to high (resistant) on the right."
  );

  return { text, styles, imageSlots };
}

async function uploadImageToDrive(
  drive: drive_v3.Drive,
  base64DataUrl: string,
  name: string
): Promise<string | null> {
  try {
    const match = base64DataUrl.match(/^data:image\/png;base64,(.+)$/);
    const raw = match ? match[1] : base64DataUrl;
    const buffer = Buffer.from(raw, "base64");
    if (buffer.length === 0) return null;

    const upload = await drive.files.create({
      requestBody: { name, mimeType: "image/png" },
      media: { mimeType: "image/png", body: Readable.from(buffer) },
      fields: "id",
    });
    const fileId = upload.data.id;
    if (!fileId) return null;

    // anyone-with-link reader so Docs' image-fetch can read it. drive.file
    // scope only sees files the app created, which is this exact file.
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    return `https://drive.google.com/uc?id=${fileId}`;
  } catch (err) {
    console.error("drive image upload failed:", err);
    return null;
  }
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
    const drive = google.drive({ version: "v3", auth });

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

    // batch #1: text + heading styles — this is what we always want to ship,
    // even if image embedding later fails entirely.
    const textRequests: docs_v1.Schema$Request[] = [
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
      requestBody: { requests: textRequests },
    });

    // batch #2+: embed each chart. insert in REVERSE index order so an earlier
    // insertion doesn't shift the index we want for a later one. each image is
    // independently try/catch'd — failure of one doesn't block the others or
    // the overall response.
    const imagesSkipped: string[] = [];
    let imagesEmbedded = 0;
    const slotsByIndexDesc = [...built.imageSlots].sort(
      (a, b) => b.index - a.index
    );
    const incoming = payload.images ?? {};
    for (const slot of slotsByIndexDesc) {
      const base64 = incoming[slot.kind];
      if (!base64) {
        imagesSkipped.push(slot.kind);
        continue;
      }
      try {
        const url = await uploadImageToDrive(
          drive,
          base64,
          `resistance-${slot.kind}-${Date.now()}.png`
        );
        if (!url) {
          imagesSkipped.push(slot.kind);
          continue;
        }
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertInlineImage: {
                  location: { index: slot.index },
                  uri: url,
                },
              },
            ],
          },
        });
        imagesEmbedded += 1;
      } catch (err) {
        console.error(`failed to embed ${slot.kind} image:`, err);
        imagesSkipped.push(slot.kind);
      }
    }

    return NextResponse.json({
      docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
      imagesEmbedded,
      imagesSkipped,
    });
  } catch {
    // never leak the raw error / token to the client
    return NextResponse.json(
      { error: "failed to write the run report — try reconnecting google." },
      { status: 502 }
    );
  }
}
