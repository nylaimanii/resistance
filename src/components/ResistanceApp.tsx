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
      <div className="border-b px-6 py-3 lg:px-10">
        <TabsList>
          <TabsTrigger value="evolution">evolution</TabsTrigger>
          <TabsTrigger value="diagnosis">diagnosis</TabsTrigger>
          <TabsTrigger value="surveillance">surveillance</TabsTrigger>
          <TabsTrigger value="economics">economics</TabsTrigger>
          <TabsTrigger value="explain">explain</TabsTrigger>
          <TabsTrigger value="export">export</TabsTrigger>
        </TabsList>
      </div>
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
