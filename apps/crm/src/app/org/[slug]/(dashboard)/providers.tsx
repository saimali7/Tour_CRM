"use client";

import { TRPCProvider } from "@/providers/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import { SlideOverProvider } from "@/components/ui/slide-over";
import { QuickBookingProvider } from "@/components/bookings/quick-booking-provider";

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
        <QuickBookingProvider orgSlug={orgSlug}>
          {children}
          <Toaster position="bottom-right" />
        </QuickBookingProvider>
      </SlideOverProvider>
    </TRPCProvider>
  );
}
