"use client";

import { useEffect } from "react";
import DiagnosisView from "@/components/DiagnosisView";
import EconomicsView from "@/components/EconomicsView";
import EvolutionView from "@/components/EvolutionView";
import ExplainerPanel from "@/components/ExplainerPanel";
import ExportPanel from "@/components/ExportPanel";
import SurveillanceView from "@/components/SurveillanceView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSimStore } from "@/lib/store";

// the single-population evolution loop — lives here at page-level so the sim
// keeps ticking regardless of which tab is active (and so base-ui Tabs
// unmounting an inactive panel doesn't pause the simulation).
function useTickLoop() {
  const running = useSimStore((s) => s.running);
  const tickIntervalMs = useSimStore((s) => s.tickIntervalMs);
  const step = useSimStore((s) => s.step);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, tickIntervalMs);
    return () => clearInterval(id);
  }, [running, tickIntervalMs, step]);
}

// independent loop for the surveillance sim (multiple regions). uses the
// same tickIntervalMs for speed. lifted to page-level for the same reason
// as the evolution loop.
function useSurveillanceLoop() {
  const running = useSimStore((s) => s.surveillanceRunning);
  const tickIntervalMs = useSimStore((s) => s.tickIntervalMs);
  const step = useSimStore((s) => s.stepSurveillance);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, tickIntervalMs);
    return () => clearInterval(id);
  }, [running, tickIntervalMs, step]);
}

export default function ResistanceApp() {
  useTickLoop();
  useSurveillanceLoop();

  return (
    <Tabs defaultValue="evolution" className="min-h-screen">
      <header className="border-b">
        <div className="flex flex-col gap-3 px-6 pt-5 pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 lg:px-10">
          <div className="space-y-0.5">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              RESISTANCE
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              one engine, six views — watch resistance evolve and the
              incentives that let it.
            </p>
          </div>
          {/* horizontal scroll so 6 tabs don't overflow on narrow screens */}
          <div className="-mx-2 overflow-x-auto px-2">
            <TabsList>
              <TabsTrigger value="evolution">evolution</TabsTrigger>
              <TabsTrigger value="diagnosis">diagnosis</TabsTrigger>
              <TabsTrigger value="surveillance">surveillance</TabsTrigger>
              <TabsTrigger value="economics">economics</TabsTrigger>
              <TabsTrigger value="explain">explain</TabsTrigger>
              <TabsTrigger value="export">export</TabsTrigger>
            </TabsList>
          </div>
        </div>
      </header>
      <TabsContent value="evolution">
        <EvolutionView />
      </TabsContent>
      <TabsContent value="diagnosis">
        <DiagnosisView />
      </TabsContent>
      <TabsContent value="surveillance">
        <SurveillanceView />
      </TabsContent>
      <TabsContent value="economics">
        <EconomicsView />
      </TabsContent>
      <TabsContent value="explain">
        <ExplainerPanel />
      </TabsContent>
      <TabsContent value="export">
        <ExportPanel />
      </TabsContent>
    </Tabs>
  );
}
