"use client";

import { useMemo } from "react";
import { SlideOutPanel } from "@/components/layout/context-panel";
import { useContextPanel } from "@/providers/context-panel-provider";
import { BookingPreview, BookingPreviewActions } from "./booking-preview";
import { CustomerQuickView, CustomerQuickViewActions } from "./customer-quick-view";
import { TourPreview, TourPreviewActions } from "./tour-preview";
import { GuidePreview, GuidePreviewActions } from "./guide-preview";

/**
 * ContextPanelRoot
 *
 * This component renders the appropriate panel content based on the current
 * context panel state. It should be placed in the root layout where it can
 * slide over the main content.
 */
export function ContextPanelRoot() {
  const { isOpen, content, closePanel } = useContextPanel();

  // Compute panel title and subtitle based on content type
  const { title, subtitle } = useMemo(() => {
    switch (content.type) {
      case "booking":
        return {
          title: "Booking Details",
          subtitle: content.data?.referenceNumber || undefined,
        };
      case "customer":
        return {
          title: "Customer",
          subtitle: content.data
            ? `${content.data.firstName} ${content.data.lastName}`
            : undefined,
        };
      case "tour":
        return {
          title: "Tour",
          subtitle: content.data?.name || undefined,
        };
      case "guide":
        return {
          title: "Guide",
          subtitle: content.data?.name || undefined,
        };
      default:
        return { title: "Details", subtitle: undefined };
    }
  }, [content]);

  // Render the appropriate panel content
  const panelContent = useMemo(() => {
    if (!content.type || !content.id) return null;

    switch (content.type) {
      case "booking":
        return <BookingPreview bookingId={content.id} />;
      case "customer":
        return <CustomerQuickView customerId={content.id} />;
      case "tour":
        return <TourPreview tourId={content.id} />;
      case "guide":
        return <GuidePreview guideId={content.id} />;
      default:
        return null;
    }
  }, [content]);

  // Render the appropriate footer actions
  const panelFooter = useMemo(() => {
    if (!content.type || !content.id) return null;

    switch (content.type) {
      case "booking":
        return <BookingPreviewActions bookingId={content.id} />;
      case "customer":
        return <CustomerQuickViewActions customerId={content.id} />;
      case "tour":
        return <TourPreviewActions tourId={content.id} />;
      case "guide":
        return <GuidePreviewActions guideId={content.id} />;
      default:
        return null;
    }
  }, [content]);

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={closePanel}
      title={title}
      subtitle={subtitle}
      footer={panelFooter}
    >
      {panelContent}
    </SlideOutPanel>
  );
}
