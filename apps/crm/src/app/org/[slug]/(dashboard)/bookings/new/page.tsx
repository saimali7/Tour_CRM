"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";

/**
 * Legacy /bookings/new route - redirects to bookings list and opens the unified booking sheet.
 * This page exists for backwards compatibility with old URLs and bookmarks.
 */
export default function NewBookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { openQuickBooking } = useQuickBookingContext();

  useEffect(() => {
    // Extract any pre-selection params from URL
    const customerId = searchParams.get("customerId") || undefined;
    const tourId = searchParams.get("tourId") || undefined;

    // Open the booking sheet with pre-selections
    openQuickBooking({ customerId, tourId });

    // Redirect to bookings list
    router.replace(`/org/${slug}/bookings` as Route);
  }, [slug, searchParams, router, openQuickBooking]);

  // Show loading state while redirecting
  return (
    <div className="flex justify-center items-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
