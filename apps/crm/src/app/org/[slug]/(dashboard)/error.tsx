"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);

    // In production, you would send this to an error tracking service like Sentry
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Something went wrong
        </h1>

        <p className="mb-6 text-muted-foreground">
          We encountered an unexpected error. This has been logged and we&apos;ll look into it.
          {error.digest && (
            <span className="mt-2 block text-xs font-mono text-muted-foreground/70">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        {/* Error details in development */}
        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 w-full rounded-lg border border-border bg-muted/50 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-destructive">
              {error.message}
              {error.stack && (
                <>
                  {"\n\nStack trace:\n"}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go Back
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
