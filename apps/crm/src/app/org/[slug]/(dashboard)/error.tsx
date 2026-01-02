"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertOctagon, RefreshCw, Home, ArrowLeft, Bug } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for the dashboard routes.
 * Catches runtime errors and displays a user-friendly error page.
 */
export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console for debugging
    console.error("Dashboard error:", error);
    // Report to Sentry for monitoring
    Sentry.captureException(error, {
      tags: { errorBoundary: "dashboard" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-lg">
        {/* Animated error icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 p-6">
            <AlertOctagon className="h-12 w-12 text-destructive" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Something went wrong
        </h1>

        <p className="mb-2 text-muted-foreground">
          We hit an unexpected error. Don't worry — your data is safe.
        </p>

        {error.digest && (
          <p className="mb-6 text-xs font-mono text-muted-foreground/60 bg-muted px-3 py-1 rounded-full">
            Error ID: {error.digest}
          </p>
        )}

        {/* Error details in development */}
        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 w-full rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2">
              <Bug className="h-4 w-4 text-destructive" />
              Error Details (Dev Only)
            </summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-destructive/80 font-mono bg-background/50 p-3 rounded-lg">
              {error.message}
              {error.stack && (
                <>
                  {"\n\n"}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-100"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          <Link
            href={"./" as Route}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          If this keeps happening, please contact{" "}
          <a href="mailto:support@tourcrm.app" className="text-primary hover:underline">
            support
          </a>
        </p>
      </div>
    </div>
  );
}
