import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MomentOneChart,
  MomentThreeChart,
  MomentTwoMap,
  SystemDiagram,
} from "@/components/landing/MomentVisuals";

export const metadata: Metadata = {
  title: "RESISTANCE — an interactive antibiotic resistance simulator",
  description:
    "watch resistance evolve in real time, see it spread between cities, and discover why the antibiotic market is broken — by playing it.",
};

const REPO_URL = "https://github.com/nylaimanii/resistance";
const PROFILE_URL = "https://github.com/nylaimanii";

export default function Landing() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 lg:px-10 lg:py-20">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          RESISTANCE
        </h1>
        <p className="max-w-2xl text-lg leading-snug text-foreground sm:text-xl">
          an interactive simulator where you can watch resistance evolve in
          real time, see it spread between cities, and discover why the
          antibiotic market is broken — by playing it.
        </p>
        <p className="text-sm text-muted-foreground">
          one bacterial evolution engine. six ways to play with it.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/app" className={buttonVariants({ variant: "default" })}>
            launch the simulator →
          </Link>
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            view on github
          </Link>
        </div>
      </section>

      {/* ─── THREE SIGNATURE MOMENTS ─────────────────────────────────── */}
      <section className="mt-20 space-y-8">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            three signature moments
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            what makes it different
          </h2>
        </header>

        {/* MOMENT 1 */}
        <Card>
          <CardHeader>
            <CardDescription>moment 1 — evolution view</CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              same dose. opposite outcome.
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-center">
            <p className="text-sm leading-relaxed text-foreground sm:text-base">
              deploy a full antibiotic course and the population clears
              entirely. stop the course early — even at the same starting
              dose — and the resistant survivors regrow until the strain is
              dominant. the simulator makes this textbook lesson something
              you cause and watch happen in seconds, not a sentence you have
              to take on faith.
            </p>
            <MomentOneChart />
          </CardContent>
        </Card>

        {/* MOMENT 2 */}
        <Card>
          <CardHeader>
            <CardDescription>moment 2 — surveillance view</CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              resistance doesn&apos;t stay in one city.
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-center">
            <p className="text-sm leading-relaxed text-foreground sm:text-base">
              the surveillance view runs the same engine across a small grid
              of connected regions. treat one region heavily — it breeds
              resistance there — and the resistant strain spreads along
              travel links to untreated neighbors. you watch the map redden
              outward from a single source. a region you never touched can
              still go red, because a neighbor seeded it.
            </p>
            <MomentTwoMap />
          </CardContent>
        </Card>

        {/* MOMENT 3 */}
        <Card>
          <CardHeader>
            <CardDescription>moment 3 — economics view</CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              the rational move is to not make new antibiotics.
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-center">
            <p className="text-sm leading-relaxed text-foreground sm:text-base">
              you run a pharma company. with default incentives, investing
              in a new antibiotic loses money — the drug gets held in
              reserve to slow resistance, so volume is tiny, and dev cost
              swallows revenue. a profit-maximizing player invests nothing,
              the pipeline empties, and society watches resistance climb
              into a crisis. flip the policy toggles — subscription model,
              market-entry reward, push funding — and the incentive flips
              with it. you feel the broken market by playing it.
            </p>
            <MomentThreeChart />
          </CardContent>
        </Card>

        <p className="pt-2 text-sm text-muted-foreground">
          and three more views —{" "}
          <Link href="/app" className="underline underline-offset-4">
            diagnosis
          </Link>{" "}
          (a lab result that lags reality so you treat blind),{" "}
          <Link href="/app" className="underline underline-offset-4">
            explain
          </Link>{" "}
          (a groq-powered tutor that reads live sim state), and{" "}
          <Link href="/app" className="underline underline-offset-4">
            export
          </Link>{" "}
          (one click writes the run up as a formatted google doc with
          embedded charts).
        </p>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="mt-20 space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            how it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            one engine, six views
          </h2>
        </header>
        <p className="max-w-2xl text-sm leading-relaxed text-foreground sm:text-base">
          every view is a different lens on the same deterministic evolution
          engine — growth, mutation, selection, dose decay. one zustand store
          holds engine state; every view subscribes. surveillance runs the
          same engine across multiple regions with a small per-tick transfer
          step; economics is a separate turn-based economic model that shares
          only the global params slider, so it can&apos;t lie about the biology.
        </p>
        <div className="overflow-x-auto">
          <SystemDiagram />
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="mt-20 border-t pt-6 text-sm text-muted-foreground">
        <p>
          built by{" "}
          <Link
            href={PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            nyla
          </Link>
          . source on{" "}
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            github
          </Link>
          . deployed on vercel.
        </p>
      </footer>
    </main>
  );
}
