"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExportPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  async function writeTestDoc() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setDocUrl(null);
    try {
      const res = await fetch("/api/google/test-doc", { method: "POST" });
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
          connect google, then write a hello-world doc to prove the pipeline.
          full run reports come in steps 20–22.
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
            <CardTitle>2. write test doc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              creates a tiny doc in your drive. if you see &quot;not connected to
              google&quot;, run step 1 first.
            </p>
            <Button onClick={writeTestDoc} disabled={loading}>
              {loading ? "writing..." : "write test doc"}
            </Button>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {docUrl && (
              <p className="text-sm">
                doc created:{" "}
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
