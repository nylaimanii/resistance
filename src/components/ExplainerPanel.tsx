"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resistantFraction, totalPopulation } from "@/lib/engine";
import { useSimStore } from "@/lib/store";

type Mode = "quick" | "deep";

const PRESETS = [
  "why is resistance climbing?",
  "what happens if i stop the dose now?",
  "is the drug still working?",
];

export default function ExplainerPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("quick");

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);

    // pull a compact snapshot from the store AT SEND TIME so the answer reflects current state.
    // we do NOT send the whole buckets array — just summary numbers + a few recent points.
    const state = useSimStore.getState();
    const simState = {
      tick: state.tick,
      population: totalPopulation(state.buckets),
      resistantFraction: resistantFraction(state.buckets),
      drugConcentration: state.drugConcentration,
      doseActive: state.doseActive,
      params: state.params,
      recentHistory: state.history.slice(-8).map((h) => ({
        tick: h.tick,
        population: h.population,
        resistantFraction: h.resistantFraction,
      })),
    };

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed, simState, mode }),
      });
      const data = (await res.json()) as { answer?: string };
      if (!res.ok) {
        setError(data.answer ?? `request failed (${res.status})`);
      } else {
        setAnswer(data.answer ?? "no answer.");
      }
    } catch {
      setError("network error — couldn't reach the explainer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full px-6 py-8 lg:px-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">explain</h1>
        <p className="text-sm text-muted-foreground">
          ask the tutor what&apos;s happening in the simulation — it reads the live state.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Card>
          <CardHeader>
            <CardTitle>chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
              className="flex gap-2"
            >
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="ask anything about the current sim..."
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !question.trim()}>
                {loading ? "thinking..." : "ask"}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQuestion(p);
                    ask(p);
                  }}
                  disabled={loading}
                >
                  {p}
                </Button>
              ))}
            </div>

            <div className="min-h-24 rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
              {loading && (
                <span className="text-muted-foreground">
                  thinking with {mode === "deep" ? "llama-3.3-70b" : "llama-3.1-8b"}...
                </span>
              )}
              {!loading && error && <span className="text-destructive">{error}</span>}
              {!loading && !error && answer && <span>{answer}</span>}
              {!loading && !error && !answer && (
                <span className="text-muted-foreground">
                  ask a question or tap a preset — the tutor will read the live sim state and answer.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={mode === "quick" ? "default" : "outline"}
                onClick={() => setMode("quick")}
              >
                quick
              </Button>
              <Button
                size="sm"
                variant={mode === "deep" ? "default" : "outline"}
                onClick={() => setMode("deep")}
              >
                deep
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              quick = llama-3.1-8b-instant, near-instant readouts of what&apos;s happening
              right now. deep = llama-3.3-70b-versatile, slower but better for
              counterfactuals ("what if i&apos;d kept dosing").
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
