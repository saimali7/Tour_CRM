"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertOctagon, RefreshCw, ArrowLeft, Bug } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SectionError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Section error:", error);
    Sentry.captureException(error, {
      tags: { errorBoundary: "tour-run" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
          <div className="relative rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 p-5">
            <AlertOctagon className="h-10 w-10 text-destructive" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Failed to load Tour Run
        </h2>

        <p className="mb-4 text-sm text-muted-foreground">
          Something went wrong loading this section. Your data is safe.
        </p>

        {error.digest && (
          <p className="mb-5 text-xs font-mono text-muted-foreground/60 bg-muted px-3 py-1 rounded-full">
            Error ID: {error.digest}
          </p>
        )}

        {process.env.NODE_ENV === "development" && (
          <details className="mb-5 w-full rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2">
              <Bug className="h-4 w-4 text-destructive" />
              Error Details (Dev Only)
            </summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-destructive/80 font-mono bg-background/50 p-3 rounded-lg">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
