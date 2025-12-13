"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { Schedule, Tour, TourPricingTier } from "@tour/database";

export interface BookingParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  type: "adult" | "child" | "infant";
  pricingTierId?: string;
  price: number;
}

export interface CustomerDetails {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialRequests?: string;
  dietaryRequirements?: string;
  accessibilityNeeds?: string;
}

export interface BookingState {
  // Selected tour and schedule
  tour: Tour | null;
  schedule: Schedule | null;
  pricingTiers: TourPricingTier[];

  // Participant selections
  participants: BookingParticipant[];

  // Customer details
  customer: CustomerDetails | null;

  // Pricing
  subtotal: number;
  discount: number;
  discountCode: string | null;
  tax: number;
  total: number;
  currency: string;

  // Flow state
  step: "select" | "details" | "payment" | "confirmation";
  isSubmitting: boolean;
  error: string | null;

  // Payment
  stripeClientSecret: string | null;
  bookingId: string | null;
  referenceNumber: string | null;
}

type BookingAction =
  | { type: "SET_TOUR_SCHEDULE"; tour: Tour; schedule: Schedule; pricingTiers: TourPricingTier[]; currency: string }
  | { type: "ADD_PARTICIPANT"; participant: BookingParticipant }
  | { type: "REMOVE_PARTICIPANT"; id: string }
  | { type: "UPDATE_PARTICIPANT"; id: string; updates: Partial<BookingParticipant> }
  | { type: "SET_CUSTOMER"; customer: CustomerDetails }
  | { type: "SET_DISCOUNT"; code: string; amount: number }
  | { type: "CLEAR_DISCOUNT" }
  | { type: "SET_STEP"; step: BookingState["step"] }
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_PAYMENT_INTENT"; clientSecret: string }
  | { type: "SET_BOOKING_RESULT"; bookingId: string; referenceNumber: string }
  | { type: "RESET" };

const initialState: BookingState = {
  tour: null,
  schedule: null,
  pricingTiers: [],
  participants: [],
  customer: null,
  subtotal: 0,
  discount: 0,
  discountCode: null,
  tax: 0,
  total: 0,
  currency: "USD",
  step: "select",
  isSubmitting: false,
  error: null,
  stripeClientSecret: null,
  bookingId: null,
  referenceNumber: null,
};

function calculateTotals(participants: BookingParticipant[], discount: number): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = participants.reduce((sum, p) => sum + p.price, 0);
  // TODO: Calculate tax based on organization settings
  const tax = 0;
  const total = Math.max(0, subtotal - discount + tax);
  return { subtotal, tax, total };
}

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "SET_TOUR_SCHEDULE":
      return {
        ...initialState,
        tour: action.tour,
        schedule: action.schedule,
        pricingTiers: action.pricingTiers,
        currency: action.currency,
        step: "select",
      };

    case "ADD_PARTICIPANT": {
      const newParticipants = [...state.participants, action.participant];
      const totals = calculateTotals(newParticipants, state.discount);
      return {
        ...state,
        participants: newParticipants,
        ...totals,
      };
    }

    case "REMOVE_PARTICIPANT": {
      const newParticipants = state.participants.filter((p) => p.id !== action.id);
      const totals = calculateTotals(newParticipants, state.discount);
      return {
        ...state,
        participants: newParticipants,
        ...totals,
      };
    }

    case "UPDATE_PARTICIPANT": {
      const newParticipants = state.participants.map((p) =>
        p.id === action.id ? { ...p, ...action.updates } : p
      );
      const totals = calculateTotals(newParticipants, state.discount);
      return {
        ...state,
        participants: newParticipants,
        ...totals,
      };
    }

    case "SET_CUSTOMER":
      return {
        ...state,
        customer: action.customer,
      };

    case "SET_DISCOUNT": {
      const totals = calculateTotals(state.participants, action.amount);
      return {
        ...state,
        discountCode: action.code,
        discount: action.amount,
        ...totals,
      };
    }

    case "CLEAR_DISCOUNT": {
      const totals = calculateTotals(state.participants, 0);
      return {
        ...state,
        discountCode: null,
        discount: 0,
        ...totals,
      };
    }

    case "SET_STEP":
      return {
        ...state,
        step: action.step,
        error: null,
      };

    case "SET_SUBMITTING":
      return {
        ...state,
        isSubmitting: action.isSubmitting,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
        isSubmitting: false,
      };

    case "SET_PAYMENT_INTENT":
      return {
        ...state,
        stripeClientSecret: action.clientSecret,
      };

    case "SET_BOOKING_RESULT":
      return {
        ...state,
        bookingId: action.bookingId,
        referenceNumber: action.referenceNumber,
        step: "confirmation",
        isSubmitting: false,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

interface BookingContextValue {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;

  // Helper methods
  setTourSchedule: (tour: Tour, schedule: Schedule, pricingTiers: TourPricingTier[], currency: string) => void;
  addParticipant: (type: "adult" | "child" | "infant", price: number, pricingTierId?: string) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, updates: Partial<BookingParticipant>) => void;
  setCustomer: (customer: CustomerDetails) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const setTourSchedule = (
    tour: Tour,
    schedule: Schedule,
    pricingTiers: TourPricingTier[],
    currency: string
  ) => {
    dispatch({ type: "SET_TOUR_SCHEDULE", tour, schedule, pricingTiers, currency });
  };

  const addParticipant = (
    type: "adult" | "child" | "infant",
    price: number,
    pricingTierId?: string
  ) => {
    const participant: BookingParticipant = {
      id: crypto.randomUUID(),
      firstName: "",
      lastName: "",
      type,
      price,
      pricingTierId,
    };
    dispatch({ type: "ADD_PARTICIPANT", participant });
  };

  const removeParticipant = (id: string) => {
    dispatch({ type: "REMOVE_PARTICIPANT", id });
  };

  const updateParticipant = (id: string, updates: Partial<BookingParticipant>) => {
    dispatch({ type: "UPDATE_PARTICIPANT", id, updates });
  };

  const setCustomer = (customer: CustomerDetails) => {
    dispatch({ type: "SET_CUSTOMER", customer });
  };

  const nextStep = () => {
    const steps: BookingState["step"][] = ["select", "details", "payment", "confirmation"];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex < steps.length - 1) {
      dispatch({ type: "SET_STEP", step: steps[currentIndex + 1]! });
    }
  };

  const prevStep = () => {
    const steps: BookingState["step"][] = ["select", "details", "payment", "confirmation"];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex > 0) {
      dispatch({ type: "SET_STEP", step: steps[currentIndex - 1]! });
    }
  };

  const reset = () => {
    dispatch({ type: "RESET" });
  };

  return (
    <BookingContext.Provider
      value={{
        state,
        dispatch,
        setTourSchedule,
        addParticipant,
        removeParticipant,
        updateParticipant,
        setCustomer,
        nextStep,
        prevStep,
        reset,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
