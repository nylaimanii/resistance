// Server-only route. The GROQ_API_KEY is read here and NEVER sent to the client.
// Do not import this file (or process.env.GROQ_API_KEY) from any client component.
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

type Mode = "quick" | "deep";

type Trend = "rising" | "falling" | "stable";
type Phase = "growing" | "under_treatment" | "rebounding" | "cleared";

type SimContext = {
  tick: number;
  population: number;
  resistantFraction: number;
  drugConcentration: number;
  doseActive: boolean;
  trend?: Trend;
  phase?: Phase;
  params: {
    mutationRate: number;
    doseStrength: number;
    carryingCapacity: number;
    doseDecay: number;
  };
  recentEvents?: { tick: number; kind: string; note: string }[];
  recentHistory: { tick: number; population: number; resistantFraction: number }[];
};

type Body = {
  question?: string;
  simState?: SimContext;
  mode?: Mode;
};

const MODEL_QUICK = "llama-3.1-8b-instant";
const MODEL_DEEP = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a plain-language tutor explaining a live antibiotic resistance simulation to the user.

The simulation models a bacterial population as a distribution over resistance levels (0 = fully susceptible, 1 = fully resistant). Each tick:
- bacteria reproduce via logistic growth toward a carrying capacity
- a fraction mutate up or down one resistance level
- if a drug is present, susceptible cells die hard, resistant cells survive (sigmoid kill curve)
- drug concentration decays each tick when the course is not active; while doseActive is true the dose is sustained
- finishing the course at high dose clears the population; stopping early lets resistant survivors regrow

You will receive the CURRENT state of THIS user's simulation in JSON. Reason about THEIR numbers, not generic facts. Cite specific values (e.g. "resistance is at 38%", "you stopped the dose at tick 42").

The state includes a computed "trend" (rising / falling / stable, based on the last ~10 ticks) and a "phase" (growing / under_treatment / rebounding / cleared), plus the most recent 1-2 events. Treat these as ground truth: do NOT contradict them. If trend is "stable", do not say resistance is climbing. If phase is "cleared", do not talk about ongoing dynamics. Use recentEvents to know what the user actually did and when.

If the user's question is gibberish, empty, or clearly unrelated to the simulation (e.g. random characters, off-topic chit-chat), reply with a single short sentence like "i'm not sure what you're asking — try one of the suggested questions" and do NOT dump the state summary.

Rules:
- 2 to 4 short sentences. No markdown headings, no bullet lists.
- If a number is missing or zero, say so plainly.
- Never claim something the data doesn't support.
- Be concrete: name what's happening and the likely cause.`;

function formatContext(s: SimContext): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const recent = s.recentHistory
    .slice(-8)
    .map(
      (h) =>
        `  tick ${h.tick}: pop=${h.population.toLocaleString()}, resistant=${pct(
          h.resistantFraction
        )}`
    )
    .join("\n");
  const events =
    (s.recentEvents ?? []).length === 0
      ? "  (none)"
      : (s.recentEvents ?? [])
          .map((e) => `  tick ${e.tick}: ${e.kind} — ${e.note}`)
          .join("\n");
  return [
    `current tick: ${s.tick}`,
    `phase: ${s.phase ?? "unknown"}`,
    `trend (last ~10 ticks of resistantFraction): ${s.trend ?? "unknown"}`,
    `population: ${s.population.toLocaleString()}`,
    `resistant fraction: ${pct(s.resistantFraction)}`,
    `drug concentration: ${s.drugConcentration.toFixed(3)}`,
    `dose course active: ${s.doseActive ? "yes" : "no"}`,
    `params: mutationRate=${s.params.mutationRate}, doseStrength=${s.params.doseStrength}, doseDecay=${s.params.doseDecay}, carryingCapacity=${s.params.carryingCapacity}`,
    `recent events:`,
    events,
    `recent history:`,
    recent || "  (none yet)",
  ].join("\n");
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { answer: "couldn't parse request — make sure you sent valid JSON." },
      { status: 400 }
    );
  }

  const question = (body.question ?? "").trim();
  const simState = body.simState;
  const mode: Mode = body.mode === "deep" ? "deep" : "quick";

  if (!question) {
    return NextResponse.json(
      { answer: "ask a question first — the input was empty." },
      { status: 400 }
    );
  }
  if (!simState) {
    return NextResponse.json(
      { answer: "no simulation context provided — try again after the sim has started." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer:
        "explainer not configured — set GROQ_API_KEY in .env.local (and in vercel env vars for prod) to enable the ai tutor.",
    });
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: mode === "deep" ? MODEL_DEEP : MODEL_QUICK,
      temperature: 0.3,
      max_tokens: 220,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Simulation state:\n${formatContext(simState)}\n\nQuestion: ${question}`,
        },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "the model returned an empty answer — try rephrasing.";

    return NextResponse.json({ answer });
  } catch {
    // never leak the raw error / key material to the client
    return NextResponse.json(
      { answer: "the explainer hit an error talking to groq — try again in a moment." },
      { status: 502 }
    );
  }
}
