"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { QuickBookingModal } from "./quick-booking-modal";

interface QuickBookingContextValue {
  openQuickBooking: (options?: { customerId?: string; scheduleId?: string }) => void;
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
}

export function QuickBookingProvider({ children }: QuickBookingProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>();
  const [preselectedScheduleId, setPreselectedScheduleId] = useState<string>();

  const openQuickBooking = useCallback((options?: { customerId?: string; scheduleId?: string }) => {
    setPreselectedCustomerId(options?.customerId);
    setPreselectedScheduleId(options?.scheduleId);
    setIsOpen(true);
  }, []);

  const closeQuickBooking = useCallback(() => {
    setIsOpen(false);
    setPreselectedCustomerId(undefined);
    setPreselectedScheduleId(undefined);
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
      <QuickBookingModal
        open={isOpen}
        onOpenChange={setIsOpen}
        preselectedCustomerId={preselectedCustomerId}
        preselectedScheduleId={preselectedScheduleId}
      />
    </QuickBookingContext.Provider>
  );
}
