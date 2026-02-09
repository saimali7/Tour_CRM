"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root error boundary - catches errors in root-level pages
 * (e.g., root page, select-org, onboarding)
 */
export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          We ran into an unexpected error. This is usually temporary.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-full inline-block">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
