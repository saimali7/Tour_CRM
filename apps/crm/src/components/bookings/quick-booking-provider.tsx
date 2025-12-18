"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { UnifiedBookingSheet } from "./unified-booking-sheet";

interface QuickBookingContextValue {
  openQuickBooking: (options?: { customerId?: string; scheduleId?: string; tourId?: string }) => void;
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
}

export function QuickBookingProvider({ children, orgSlug }: QuickBookingProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>();
  const [preselectedScheduleId, setPreselectedScheduleId] = useState<string>();
  const [preselectedTourId, setPreselectedTourId] = useState<string>();

  const openQuickBooking = useCallback((options?: { customerId?: string; scheduleId?: string; tourId?: string }) => {
    setPreselectedCustomerId(options?.customerId);
    setPreselectedScheduleId(options?.scheduleId);
    setPreselectedTourId(options?.tourId);
    setIsOpen(true);
  }, []);

  const closeQuickBooking = useCallback(() => {
    setIsOpen(false);
    setPreselectedCustomerId(undefined);
    setPreselectedScheduleId(undefined);
    setPreselectedTourId(undefined);
  }, []);

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
      <UnifiedBookingSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        orgSlug={orgSlug}
        preselectedCustomerId={preselectedCustomerId}
        preselectedScheduleId={preselectedScheduleId}
        preselectedTourId={preselectedTourId}
      />
    </QuickBookingContext.Provider>
  );
}
