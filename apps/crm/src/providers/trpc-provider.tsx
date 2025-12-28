"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, useRef, useEffect } from "react";
import superjson from "superjson";
import { trpc } from "../lib/trpc";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

// Extract org slug from URL path: /org/[slug]/...
function getOrgSlugFromPath(): string {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(/^\/org\/([^/]+)/);
  return match?.[1] ?? "";
}

export function TRPCProvider({
  children,
  orgSlug,
}: {
  children: React.ReactNode;
  orgSlug?: string;
}) {
  // Use ref to always get latest orgSlug in headers function
  const orgSlugRef = useRef(orgSlug);

  useEffect(() => {
    orgSlugRef.current = orgSlug;
  }, [orgSlug]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 5 minutes - prevents unnecessary refetches
            staleTime: 5 * 60 * 1000,
            // Cache data for 30 minutes before garbage collection
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            // Retry failed queries with exponential backoff
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers() {
            // Try ref first, then prop, then extract from URL as fallback
            const slug = orgSlugRef.current || orgSlug || getOrgSlugFromPath();
            return {
              "x-org-slug": slug,
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
