"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary for fatal errors that crash the root layout.
 * This must render its own <html> and <body> tags.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log to console for debugging
    console.error("Global error:", error);
    // Report to Sentry for monitoring
    Sentry.captureException(error, {
      tags: { errorBoundary: "global" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center max-w-lg">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="relative rounded-full bg-gradient-to-br from-red-500/30 to-red-500/10 p-8">
              <AlertOctagon className="h-16 w-16 text-red-400" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">
            Something went wrong
          </h1>

          <p className="text-zinc-400 mb-8">
            We encountered a critical error. Your work has been saved.
            Please try refreshing the page.
          </p>

          {error.digest && (
            <p className="mb-8 text-xs font-mono text-zinc-500 bg-zinc-900 px-4 py-2 rounded-full">
              Error ID: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-900 px-8 py-4 font-medium transition-all hover:bg-zinc-100 hover:scale-105 active:scale-100"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh Page
          </button>

          <p className="mt-12 text-sm text-zinc-500">
            Need help?{" "}
            <a href="mailto:support@tourcrm.app" className="text-zinc-300 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
