export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    revalidateReason: "on-demand" | "stale" | undefined;
    renderSource:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering"
      | undefined;
  }
) => {
  // Only import Sentry on demand
  const Sentry = await import("@sentry/nextjs");

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.captureException(err, {
    mechanism: { handled: false },
    data: {
      request: {
        path: request.path,
        method: request.method,
      },
      context,
    },
  });
};
