import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@tour/services";
import { appRouter } from "../../../../server/routers";
import { createContext } from "../../../../server/trpc";

// Force dynamic - tRPC needs runtime access
export const dynamic = "force-dynamic";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ headers: req.headers }),
    onError: ({ path, error, type, input }) => {
      // Always log errors
      logger.error(
        { path: path ?? "<no-path>", err: error, type },
        "tRPC request failed"
      );

      // Capture internal server errors in Sentry (skip client validation errors)
      if (error.code === "INTERNAL_SERVER_ERROR") {
        Sentry.captureException(error, {
          tags: {
            service: "trpc",
            operation: path ?? "unknown",
            errorCode: error.code,
            type,
          },
          extra: {
            path,
            type,
            // Don't log full input to avoid sensitive data, just type info
            inputType: typeof input,
            errorCode: error.code,
            errorMessage: error.message,
          },
        });
      }
    },
  });

export { handler as GET, handler as POST };
