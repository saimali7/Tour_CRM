"use client";

import { TRPCProvider } from "@/providers/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import { SlideOverProvider } from "@/components/ui/slide-over";

export function DashboardProviders({
  children,
  orgSlug,
}: {
  children: React.ReactNode;
  orgSlug: string;
}) {
  return (
    <TRPCProvider orgSlug={orgSlug}>
      <SlideOverProvider>
        {children}
        <Toaster position="bottom-right" />
      </SlideOverProvider>
    </TRPCProvider>
  );
}
