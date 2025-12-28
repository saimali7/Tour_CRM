"use client";

/**
 * BOOKING DETAIL COLLAPSIBLE SECTIONS - USAGE EXAMPLE
 * =====================================================
 *
 * This file demonstrates how to use the collapsible section system
 * for the booking detail page content zone.
 *
 * Design Goals:
 * - Maximum information density without visual clutter
 * - Collapsed state shows critical info in single scannable line
 * - Smooth 300ms expansion animations
 * - Visual flags for "worth expanding" vs "empty" sections
 * - Auto-expand sections with special needs (dietary/accessibility)
 * - Mobile: sections stack vertically
 * - Desktop: Guide + Payments can be side-by-side
 */

import { useState } from "react";
import { SectionGrid } from "@/components/ui/collapsible-section";
import {
  GuestsSection,
  GuideSection,
  PaymentsSection,
  ActivitySection,
} from "./collapsible-sections";
import type {
  BookingData,
  BookingParticipant,
  BookingGuideAssignment,
  BalanceInfo,
} from "./types";

// ============================================================================
// EXAMPLE DATA
// ============================================================================

const exampleBooking: BookingData = {
  id: "booking-123",
  referenceNumber: "TUR-2024-001",
  status: "confirmed",
  paymentStatus: "partial",
  source: "website",
  totalParticipants: 4,
  adultCount: 2,
  childCount: 1,
  infantCount: 1,
  subtotal: "200.00",
  discount: "20.00",
  tax: "18.00",
  total: "198.00",
  paidAmount: "100.00",
  specialRequests: "Please accommodate dietary needs",
  dietaryRequirements: null,
  accessibilityNeeds: null,
  internalNotes: null,
  createdAt: new Date(),
  confirmedAt: new Date(),
  cancelledAt: null,
  cancellationReason: null,
  customer: {
    id: "cust-1",
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    phone: "+1 555-123-4567",
  },
  schedule: {
    id: "sched-1",
    startsAt: new Date(Date.now() + 86400000 * 3),
    endsAt: null,
    maxParticipants: 20,
    bookedCount: 12,
  },
  tour: {
    id: "tour-1",
    name: "City Walking Tour",
    duration: 180,
  },
  participants: [
    {
      id: "p1",
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      type: "adult",
      dietaryRequirements: "Vegetarian",
      accessibilityNeeds: null,
    },
    {
      id: "p2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      type: "adult",
      dietaryRequirements: null,
      accessibilityNeeds: "Wheelchair access required",
    },
    {
      id: "p3",
      firstName: "Tom",
      lastName: "Smith",
      email: null,
      type: "child",
      dietaryRequirements: null,
      accessibilityNeeds: null,
    },
    {
      id: "p4",
      firstName: "Baby",
      lastName: "Smith",
      email: null,
      type: "infant",
      dietaryRequirements: null,
      accessibilityNeeds: null,
    },
  ],
  stripePaymentIntentId: null,
  pricingSnapshot: { optionName: "Standard Tour" },
};

const exampleGuideAssignments: BookingGuideAssignment[] = [
  {
    id: "assign-1",
    guideId: "guide-1",
    status: "confirmed",
    guide: {
      id: "guide-1",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@tourguides.com",
      phone: "+1 555-987-6543",
    },
  },
];

const exampleBalanceInfo: BalanceInfo = {
  total: "198.00",
  totalPaid: "100.00",
  balance: "98.00",
};

const examplePayments = [
  {
    id: "pay-1",
    amount: "50.00",
    method: "card",
    recordedAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: "pay-2",
    amount: "50.00",
    method: "cash",
    recordedAt: new Date(Date.now() - 86400000),
  },
];

const exampleActivities = [
  {
    id: "act-1",
    action: "booking.confirmed",
    description: "Booking confirmed by staff",
    createdAt: new Date(Date.now() - 3600000),
    actorName: "Admin User",
    actorType: "user",
  },
  {
    id: "act-2",
    action: "payment.recorded",
    description: "Payment of $50.00 recorded",
    createdAt: new Date(Date.now() - 86400000),
    actorName: "Admin User",
    actorType: "user",
  },
  {
    id: "act-3",
    action: "booking.created",
    description: "Booking created via website",
    createdAt: new Date(Date.now() - 86400000 * 2),
    actorName: "System",
    actorType: "system",
  },
];

// ============================================================================
// EXAMPLE COMPONENT
// ============================================================================

export function BookingDetailSectionsExample() {
  const [showAssignGuide, setShowAssignGuide] = useState(false);

  return (
    <div className="space-y-4">
      {/* =================================================================== */}
      {/* PATTERN 1: Stacked Sections (Mobile-First Default) */}
      {/* =================================================================== */}
      {/*
       * All sections stack vertically. This is the default and works on all
       * screen sizes. Use this when you want consistent layout everywhere.
       */}

      {/* Guests Section - Auto-expands when there are special needs */}
      <GuestsSection
        booking={exampleBooking}
        participants={exampleBooking.participants}
      />

      {/* Guide + Payments Side-by-Side on Desktop */}
      {/*
       * Use SectionGrid for side-by-side layout on larger screens.
       * Stacks vertically on mobile automatically.
       */}
      <SectionGrid columns={2}>
        <GuideSection
          guideAssignments={exampleGuideAssignments}
          bookingStatus={exampleBooking.status}
          onAssignGuide={() => setShowAssignGuide(true)}
          onRemoveAssignment={(id, name) => console.log(`Remove ${name}`)}
        />

        <PaymentsSection
          balanceInfo={exampleBalanceInfo}
          payments={examplePayments}
          onRecordPayment={() => console.log("Record payment")}
          onDeletePayment={(id) => console.log(`Delete payment ${id}`)}
        />
      </SectionGrid>

      {/* Activity Section - Shows timeline */}
      <ActivitySection activities={exampleActivities} />

      {/* =================================================================== */}
      {/* PATTERN 2: Empty States */}
      {/* =================================================================== */}
      {/*
       * When sections have no content, they show "empty" variant styling
       * and are collapsed by default. The summary text indicates emptiness.
       */}

      <div className="mt-8 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-4">Empty State Examples</h2>

        <div className="space-y-4">
          <GuideSection
            guideAssignments={[]}
            bookingStatus="pending"
            onAssignGuide={() => console.log("Assign guide")}
          />

          <PaymentsSection
            balanceInfo={{ total: "0.00", totalPaid: "0.00", balance: "0.00" }}
            payments={[]}
          />

          <ActivitySection activities={[]} />
        </div>
      </div>

      {/* =================================================================== */}
      {/* PATTERN 3: Fully Paid / Success State */}
      {/* =================================================================== */}

      <div className="mt-8 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-4">Success State Example</h2>

        <PaymentsSection
          balanceInfo={{ total: "198.00", totalPaid: "198.00", balance: "0.00" }}
          payments={[
            { id: "1", amount: "198.00", method: "card", recordedAt: new Date() },
          ]}
        />
      </div>
    </div>
  );
}

// ============================================================================
// INTEGRATION NOTES
// ============================================================================
/*
 * HOW TO USE IN BOOKING DETAIL PAGE:
 *
 * 1. Import the section components:
 *    import {
 *      GuestsSection,
 *      GuideSection,
 *      PaymentsSection,
 *      ActivitySection,
 *    } from "@/components/bookings/booking-detail";
 *
 * 2. Replace existing card-based sections with collapsible versions:
 *
 *    BEFORE:
 *    <GuestSummaryCard booking={booking} />
 *
 *    AFTER:
 *    <GuestsSection booking={booking} participants={booking.participants} />
 *
 * 3. For side-by-side layout on desktop:
 *
 *    <SectionGrid columns={2}>
 *      <GuideSection ... />
 *      <PaymentsSection ... />
 *    </SectionGrid>
 *
 * 4. The sections handle all the following automatically:
 *    - Auto-expand when there are special needs (dietary/accessibility)
 *    - Visual variant styling (important, empty, success, warning)
 *    - Smooth 300ms animations
 *    - Proper ARIA attributes for accessibility
 *    - Keyboard navigation (Enter/Space to toggle)
 *    - Summary line in collapsed state
 *    - Badge counts in headers
 *    - Header actions (Assign, Collect, etc.)
 *
 * DESIGN DECISIONS:
 *
 * 1. COLLAPSED STATE PRIORITY
 *    The most critical info appears in the summary line:
 *    - Guests: "2 adults, 1 child - 2 special needs"
 *    - Guide: "Sarah Johnson" or "No guide assigned"
 *    - Payments: "$98.00 due of $198.00" or "$198.00 paid in full"
 *    - Activity: Latest activity description
 *
 * 2. AUTO-EXPANSION
 *    Sections auto-expand when they contain important info:
 *    - Guests with dietary/accessibility needs
 *    - Sections with "important" or "warning" variant
 *
 * 3. VISUAL FLAGS
 *    - Amber border + icon for sections with special needs
 *    - Green border + icon for fully paid
 *    - Dimmed styling for empty sections
 *    - Left edge accent bar indicates section state
 *
 * 4. RESPONSIVE BEHAVIOR
 *    - Mobile: All sections stack vertically
 *    - Desktop (lg+): SectionGrid enables side-by-side layout
 *    - Sections maintain full functionality at all sizes
 */
