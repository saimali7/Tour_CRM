"use client";

import { createContext, useCallback, useContext, useReducer, type ReactNode } from "react";
import type { BookingOption, Tour, TourPricingTier } from "@tour/database";
import {
  formatLocalDateKey as formatDateKey,
  parseDateKeyToLocalDate,
} from "@/lib/date-key";

export function formatLocalDateKey(date: Date): string {
  return formatDateKey(date);
}

export function parseLocalDateKey(dateKey: string): Date {
  return parseDateKeyToLocalDate(dateKey);
}

export interface BookingParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  type: "adult" | "child" | "infant";
  pricingTierId?: string;
  price: number;
}

export interface BookingTaxConfig {
  enabled: boolean;
  rate: number;
  includeInPrice: boolean;
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

export interface AvailableAddOn {
  id: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  type: "per_booking" | "per_person" | "quantity";
  effectivePrice: number;
  isRequired?: boolean;
  isRecommended?: boolean;
}

export interface SelectedAddOn {
  addOnProductId: string;
  quantity: number;
  unitPrice: number;
  name: string;
}

export interface RequiredWaiver {
  waiverTemplateId: string;
  waiverName: string;
  waiverContent?: string | null;
  isSigned: boolean;
  signedAt?: string;
}

export interface BookingState {
  tour: Tour | null;
  bookingDate: Date | null;
  bookingTime: string | null;
  availableSpots: number;
  pricingTiers: TourPricingTier[];
  bookingOptions: BookingOption[];
  bookingOptionId: string | null;

  participants: BookingParticipant[];

  availableAddOns: AvailableAddOn[];
  selectedAddOns: SelectedAddOn[];

  customer: CustomerDetails | null;

  subtotal: number;
  participantSubtotal: number;
  addOnSubtotal: number;
  discount: number;
  discountCode: string | null;
  tax: number;
  total: number;
  currency: string;
  taxConfig: BookingTaxConfig;

  step: "options" | "select" | "addons" | "details" | "payment" | "waiver" | "confirmation";
  isSubmitting: boolean;
  error: string | null;

  stripeClientSecret: string | null;
  bookingId: string | null;
  referenceNumber: string | null;
  abandonedCartId: string | null;

  requiredWaivers: RequiredWaiver[];
}

type BookingAction =
  | {
      type: "SET_TOUR_AND_AVAILABILITY";
      tour: Tour;
      bookingDate: Date;
      bookingTime: string;
      availableSpots: number;
      pricingTiers: TourPricingTier[];
      bookingOptions: BookingOption[];
      currency: string;
      taxConfig?: BookingTaxConfig;
    }
  | { type: "ADD_PARTICIPANT"; participant: BookingParticipant }
  | { type: "REMOVE_PARTICIPANT"; id: string }
  | { type: "UPDATE_PARTICIPANT"; id: string; updates: Partial<BookingParticipant> }
  | { type: "SET_BOOKING_OPTION"; bookingOptionId: string }
  | { type: "SET_CUSTOMER"; customer: CustomerDetails }
  | { type: "SET_AVAILABLE_ADDONS"; addOns: AvailableAddOn[] }
  | { type: "SET_ADDON_QUANTITY"; addOnProductId: string; quantity: number }
  | { type: "SET_DISCOUNT"; code: string; amount: number }
  | { type: "CLEAR_DISCOUNT" }
  | { type: "SET_STEP"; step: BookingState["step"] }
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_PAYMENT_INTENT"; clientSecret: string }
  | { type: "SET_BOOKING_RESULT"; bookingId: string; referenceNumber: string }
  | { type: "SET_ABANDONED_CART_ID"; cartId: string | null }
  | { type: "SET_REQUIRED_WAIVERS"; waivers: RequiredWaiver[] }
  | { type: "MARK_WAIVER_SIGNED"; waiverTemplateId: string; signedAt?: string }
  | { type: "RESET" };

const initialState: BookingState = {
  tour: null,
  bookingDate: null,
  bookingTime: null,
  availableSpots: 0,
  pricingTiers: [],
  bookingOptions: [],
  bookingOptionId: null,
  participants: [],
  availableAddOns: [],
  selectedAddOns: [],
  customer: null,
  subtotal: 0,
  participantSubtotal: 0,
  addOnSubtotal: 0,
  discount: 0,
  discountCode: null,
  tax: 0,
  total: 0,
  currency: "USD",
  taxConfig: {
    enabled: false,
    rate: 0,
    includeInPrice: false,
  },
  step: "select",
  isSubmitting: false,
  error: null,
  stripeClientSecret: null,
  bookingId: null,
  referenceNumber: null,
  abandonedCartId: null,
  requiredWaivers: [],
};

function getFlowSteps({
  hasBookingOptions,
  hasAddOns,
  hasWaiverStep,
}: {
  hasBookingOptions: boolean;
  hasAddOns: boolean;
  hasWaiverStep: boolean;
}): BookingState["step"][] {
  const steps: BookingState["step"][] = [];

  if (hasBookingOptions) {
    steps.push("options");
  }

  steps.push("select");

  if (hasAddOns) {
    steps.push("addons");
  }

  steps.push("details", "payment");

  if (hasWaiverStep) {
    steps.push("waiver");
  }

  steps.push("confirmation");
  return steps;
}

function calculateTotals(
  participants: BookingParticipant[],
  selectedAddOns: SelectedAddOn[],
  discount: number,
  taxConfig: BookingTaxConfig
): {
  subtotal: number;
  participantSubtotal: number;
  addOnSubtotal: number;
  tax: number;
  total: number;
} {
  const participantSubtotal = Math.round(participants.reduce((sum, p) => sum + p.price, 0) * 100) / 100;
  const addOnSubtotal = Math.round(
    selectedAddOns.reduce((sum, addon) => sum + addon.unitPrice * addon.quantity, 0) * 100
  ) / 100;

  const subtotal = Math.round((participantSubtotal + addOnSubtotal) * 100) / 100;
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  const taxableBase = Math.max(0, subtotal - safeDiscount);
  const shouldTax = taxConfig.enabled && taxConfig.rate > 0;

  const rawTax = !shouldTax
    ? 0
    : taxConfig.includeInPrice
      ? (taxableBase * taxConfig.rate) / (100 + taxConfig.rate)
      : (taxableBase * taxConfig.rate) / 100;

  const rawTotal = taxConfig.includeInPrice
    ? taxableBase
    : taxableBase + rawTax;

  const tax = Math.round(rawTax * 100) / 100;
  const total = Math.round(rawTotal * 100) / 100;

  return { subtotal, participantSubtotal, addOnSubtotal, tax, total };
}

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "SET_TOUR_AND_AVAILABILITY": {
      const defaultBookingOptionId =
        action.bookingOptions.find((option) => option.isDefault)?.id ??
        action.bookingOptions[0]?.id ??
        null;

      return {
        ...initialState,
        tour: action.tour,
        bookingDate: action.bookingDate,
        bookingTime: action.bookingTime,
        availableSpots: action.availableSpots,
        pricingTiers: action.pricingTiers,
        bookingOptions: action.bookingOptions,
        bookingOptionId: defaultBookingOptionId,
        currency: action.currency,
        taxConfig: action.taxConfig ?? initialState.taxConfig,
        step: action.bookingOptions.length > 0 ? "options" : "select",
      };
    }

    case "ADD_PARTICIPANT": {
      const newParticipants = [...state.participants, action.participant];
      const totals = calculateTotals(newParticipants, state.selectedAddOns, state.discount, state.taxConfig);
      return {
        ...state,
        participants: newParticipants,
        ...totals,
      };
    }

    case "REMOVE_PARTICIPANT": {
      const newParticipants = state.participants.filter((p) => p.id !== action.id);
      const totals = calculateTotals(newParticipants, state.selectedAddOns, state.discount, state.taxConfig);
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
      const totals = calculateTotals(newParticipants, state.selectedAddOns, state.discount, state.taxConfig);
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

    case "SET_BOOKING_OPTION":
      return {
        ...state,
        bookingOptionId: action.bookingOptionId,
      };

    case "SET_AVAILABLE_ADDONS": {
      const requiredSelections = action.addOns
        .filter((addOn) => addOn.isRequired)
        .map((addOn) => ({
          addOnProductId: addOn.id,
          quantity: 1,
          unitPrice: addOn.effectivePrice,
          name: addOn.name,
        }));

      const mergedSelections: SelectedAddOn[] = [...requiredSelections];

      for (const existing of state.selectedAddOns) {
        if (mergedSelections.some((item) => item.addOnProductId === existing.addOnProductId)) {
          continue;
        }

        const matchingAddOn = action.addOns.find((addOn) => addOn.id === existing.addOnProductId);
        if (matchingAddOn) {
          mergedSelections.push({
            ...existing,
            unitPrice: matchingAddOn.effectivePrice,
            name: matchingAddOn.name,
          });
        }
      }

      const totals = calculateTotals(state.participants, mergedSelections, state.discount, state.taxConfig);

      return {
        ...state,
        availableAddOns: action.addOns,
        selectedAddOns: mergedSelections,
        ...totals,
      };
    }

    case "SET_ADDON_QUANTITY": {
      const addOn = state.availableAddOns.find((item) => item.id === action.addOnProductId);
      if (!addOn) {
        return state;
      }

      const normalizedQuantity = Math.max(0, Math.min(99, Math.round(action.quantity)));
      const existingIndex = state.selectedAddOns.findIndex(
        (item) => item.addOnProductId === action.addOnProductId
      );

      const nextSelected = [...state.selectedAddOns];

      if (normalizedQuantity === 0 && !addOn.isRequired) {
        if (existingIndex >= 0) {
          nextSelected.splice(existingIndex, 1);
        }
      } else {
        const quantity = addOn.isRequired ? Math.max(1, normalizedQuantity) : normalizedQuantity;
        const nextItem: SelectedAddOn = {
          addOnProductId: addOn.id,
          quantity,
          unitPrice: addOn.effectivePrice,
          name: addOn.name,
        };

        if (existingIndex >= 0) {
          nextSelected[existingIndex] = nextItem;
        } else {
          nextSelected.push(nextItem);
        }
      }

      const totals = calculateTotals(state.participants, nextSelected, state.discount, state.taxConfig);

      return {
        ...state,
        selectedAddOns: nextSelected,
        ...totals,
      };
    }

    case "SET_DISCOUNT": {
      const totals = calculateTotals(state.participants, state.selectedAddOns, action.amount, state.taxConfig);
      return {
        ...state,
        discountCode: action.code,
        discount: action.amount,
        ...totals,
      };
    }

    case "CLEAR_DISCOUNT": {
      const totals = calculateTotals(state.participants, state.selectedAddOns, 0, state.taxConfig);
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
        isSubmitting: false,
      };

    case "SET_ABANDONED_CART_ID":
      return {
        ...state,
        abandonedCartId: action.cartId,
      };

    case "SET_REQUIRED_WAIVERS":
      return {
        ...state,
        requiredWaivers: action.waivers,
      };

    case "MARK_WAIVER_SIGNED":
      return {
        ...state,
        requiredWaivers: state.requiredWaivers.map((waiver) =>
          waiver.waiverTemplateId === action.waiverTemplateId
            ? {
                ...waiver,
                isSigned: true,
                signedAt: action.signedAt || new Date().toISOString(),
              }
            : waiver
        ),
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

  setTourAndAvailability: (
    tour: Tour,
    bookingDate: Date,
    bookingTime: string,
    availableSpots: number,
    pricingTiers: TourPricingTier[],
    bookingOptions: BookingOption[],
    currency: string,
    taxConfig?: BookingTaxConfig
  ) => void;
  setBookingOption: (bookingOptionId: string) => void;
  addParticipant: (type: "adult" | "child" | "infant", price: number, pricingTierId?: string) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, updates: Partial<BookingParticipant>) => void;
  setCustomer: (customer: CustomerDetails) => void;
  setAvailableAddOns: (addOns: AvailableAddOn[]) => void;
  setAddOnQuantity: (addOnProductId: string, quantity: number) => void;
  setAbandonedCartId: (cartId: string | null) => void;
  setRequiredWaivers: (waivers: RequiredWaiver[]) => void;
  markWaiverSigned: (waiverTemplateId: string, signedAt?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const setTourAndAvailability = useCallback((
    tour: Tour,
    bookingDate: Date,
    bookingTime: string,
    availableSpots: number,
    pricingTiers: TourPricingTier[],
    bookingOptions: BookingOption[],
    currency: string,
    taxConfig?: BookingTaxConfig
  ) => {
    dispatch({
      type: "SET_TOUR_AND_AVAILABILITY",
      tour,
      bookingDate,
      bookingTime,
      availableSpots,
      pricingTiers,
      bookingOptions,
      currency,
      taxConfig,
    });
  }, []);

  const setBookingOption = useCallback((bookingOptionId: string) => {
    dispatch({ type: "SET_BOOKING_OPTION", bookingOptionId });
  }, []);

  const addParticipant = useCallback((
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
  }, []);

  const removeParticipant = useCallback((id: string) => {
    dispatch({ type: "REMOVE_PARTICIPANT", id });
  }, []);

  const updateParticipant = useCallback((id: string, updates: Partial<BookingParticipant>) => {
    dispatch({ type: "UPDATE_PARTICIPANT", id, updates });
  }, []);

  const setCustomer = useCallback((customer: CustomerDetails) => {
    dispatch({ type: "SET_CUSTOMER", customer });
  }, []);

  const setAvailableAddOns = useCallback((addOns: AvailableAddOn[]) => {
    dispatch({ type: "SET_AVAILABLE_ADDONS", addOns });
  }, []);

  const setAddOnQuantity = useCallback((addOnProductId: string, quantity: number) => {
    dispatch({ type: "SET_ADDON_QUANTITY", addOnProductId, quantity });
  }, []);

  const setAbandonedCartId = useCallback((cartId: string | null) => {
    dispatch({ type: "SET_ABANDONED_CART_ID", cartId });
  }, []);

  const setRequiredWaivers = useCallback((waivers: RequiredWaiver[]) => {
    dispatch({ type: "SET_REQUIRED_WAIVERS", waivers });
  }, []);

  const markWaiverSigned = useCallback((waiverTemplateId: string, signedAt?: string) => {
    dispatch({ type: "MARK_WAIVER_SIGNED", waiverTemplateId, signedAt });
  }, []);

  const nextStep = useCallback(() => {
    const hasWaiverStep = Boolean(state.bookingId) && state.requiredWaivers.some((waiver) => !waiver.isSigned);
    const steps = getFlowSteps({
      hasBookingOptions: state.bookingOptions.length > 0,
      hasAddOns: state.availableAddOns.length > 0,
      hasWaiverStep,
    });

    const currentIndex = steps.indexOf(state.step);
    if (currentIndex < steps.length - 1) {
      dispatch({ type: "SET_STEP", step: steps[currentIndex + 1]! });
    }
  }, [state.availableAddOns.length, state.bookingId, state.bookingOptions.length, state.requiredWaivers, state.step]);

  const prevStep = useCallback(() => {
    const hasWaiverStep = Boolean(state.bookingId) && state.requiredWaivers.some((waiver) => !waiver.isSigned);
    const steps = getFlowSteps({
      hasBookingOptions: state.bookingOptions.length > 0,
      hasAddOns: state.availableAddOns.length > 0,
      hasWaiverStep,
    });

    const currentIndex = steps.indexOf(state.step);
    if (currentIndex > 0) {
      dispatch({ type: "SET_STEP", step: steps[currentIndex - 1]! });
    }
  }, [state.availableAddOns.length, state.bookingId, state.bookingOptions.length, state.requiredWaivers, state.step]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return (
    <BookingContext.Provider
      value={{
        state,
        dispatch,
        setTourAndAvailability,
        setBookingOption,
        addParticipant,
        removeParticipant,
        updateParticipant,
        setCustomer,
        setAvailableAddOns,
        setAddOnQuantity,
        setAbandonedCartId,
        setRequiredWaivers,
        markWaiverSigned,
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
