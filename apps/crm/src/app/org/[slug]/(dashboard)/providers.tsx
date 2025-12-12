"use client";

import { TRPCProvider } from "@/providers/trpc-provider";

export function DashboardProviders({
  children,
  orgSlug,
}: {
  children: React.ReactNode;
  orgSlug: string;
}) {
  return <TRPCProvider orgSlug={orgSlug}>{children}</TRPCProvider>;
}
