"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { UnifiedBookingSheet } from "./unified-booking-sheet";
import { CustomerFirstBookingSheet } from "./customer-first-booking-sheet";

type BookingMode = "classic" | "customer-first";

interface QuickBookingContextValue {
  openQuickBooking: (options?: { customerId?: string; tourId?: string; mode?: BookingMode }) => void;
  closeQuickBooking: () => void;
  isOpen: boolean;
}

const QuickBookingContext = createContext<QuickBookingContextValue | null>(null);

export function useQuickBookingContext() {
  const context = useContext(QuickBookingContext);
  if (!context) {
    throw new Error("useQuickBookingContext must be used within QuickBookingProvider");
  }
  return context;
}

interface QuickBookingProviderProps {
  children: React.ReactNode;
  orgSlug: string;
  /** Default to customer-first flow for new booking UX */
  defaultMode?: BookingMode;
}

export function QuickBookingProvider({ children, orgSlug, defaultMode = "customer-first" }: QuickBookingProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>();
  const [preselectedTourId, setPreselectedTourId] = useState<string>();
  const [bookingMode, setBookingMode] = useState<BookingMode>(defaultMode);

  const openQuickBooking = useCallback((options?: { customerId?: string; tourId?: string; mode?: BookingMode }) => {
    setPreselectedCustomerId(options?.customerId);
    setPreselectedTourId(options?.tourId);
    // Use provided mode or default
    setBookingMode(options?.mode ?? defaultMode);
    setIsOpen(true);
  }, [defaultMode]);

  const closeQuickBooking = useCallback(() => {
    setIsOpen(false);
    setPreselectedCustomerId(undefined);
    setPreselectedTourId(undefined);
    setBookingMode(defaultMode);
  }, [defaultMode]);

  // Keyboard shortcut: Cmd+B or Ctrl+B to open quick booking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+B or Ctrl+B
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        if (isOpen) {
          closeQuickBooking();
        } else {
          openQuickBooking();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openQuickBooking, closeQuickBooking]);

  return (
    <QuickBookingContext.Provider value={{ openQuickBooking, closeQuickBooking, isOpen }}>
      {children}
      {/* Render based on booking mode */}
      {bookingMode === "customer-first" ? (
        // Customer-first flow: Guests + Date -> See ALL options -> Pick best
        <CustomerFirstBookingSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          orgSlug={orgSlug}
          preselectedCustomerId={preselectedCustomerId}
          preselectedTourId={preselectedTourId}
        />
      ) : (
        // Classic flow: Tour + Date + Time selection
        <UnifiedBookingSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          orgSlug={orgSlug}
          preselectedCustomerId={preselectedCustomerId}
          preselectedTourId={preselectedTourId}
        />
      )}
    </QuickBookingContext.Provider>
  );
}
