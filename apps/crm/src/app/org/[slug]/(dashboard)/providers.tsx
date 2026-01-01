"use client";

import { TRPCProvider } from "@/providers/trpc-provider";
import { ContextPanelProvider } from "@/providers/context-panel-provider";
import { OnboardingProvider } from "@/providers/onboarding-provider";
import { Toaster } from "@/components/ui/sonner";
import { SlideOverProvider } from "@/components/ui/slide-over";
import { QuickBookingProvider } from "@/components/bookings/quick-booking-provider";
import { ContextPanelRoot } from "@/components/panels/context-panel-root";
import { OnboardingWizard } from "@/components/onboarding";

export function DashboardProviders({
  children,
  orgSlug,
}: {
  children: React.ReactNode;
  orgSlug: string;
}) {
  return (
    <TRPCProvider orgSlug={orgSlug}>
      <OnboardingProvider>
        <ContextPanelProvider>
          <SlideOverProvider>
            <QuickBookingProvider orgSlug={orgSlug}>
              {children}
              <ContextPanelRoot />
              <OnboardingWizard />
              <Toaster position="bottom-right" toastOptions={{ style: { zIndex: 99999 } }} />
            </QuickBookingProvider>
          </SlideOverProvider>
        </ContextPanelProvider>
      </OnboardingProvider>
    </TRPCProvider>
  );
}
