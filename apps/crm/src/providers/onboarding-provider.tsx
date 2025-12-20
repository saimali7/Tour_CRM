"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

// =============================================================================
// TYPES
// =============================================================================

export interface BusinessProfileData {
  businessName: string;
  contactEmail: string;
  phone: string;
  timezone: string;
}

export interface TourData {
  id?: string;
  name: string;
  category: string;
  durationMinutes: number;
  basePrice: string;
  maxParticipants: number;
  description?: string;
}

export interface ScheduleData {
  tourId: string;
  daysOfWeek: number[];
  times: string[];
  startDate: string;
  endDate: string;
}

export interface OnboardingData {
  businessProfile?: BusinessProfileData;
  firstTour?: TourData;
  schedule?: ScheduleData;
}

export interface OnboardingState {
  isComplete: boolean;
  isDismissed: boolean;
  currentStep: number;
  data: OnboardingData;
  completedSteps: number[];
}

interface OnboardingContextType {
  state: OnboardingState;
  isHydrated: boolean;
  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  // Data management
  setStepData: <K extends keyof OnboardingData>(
    step: K,
    data: OnboardingData[K]
  ) => void;
  markStepComplete: (step: number) => void;
  // Completion
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  dismissOnboarding: () => void;
  // Reset (for testing/debugging)
  resetOnboarding: () => void;
  // Quick check
  shouldShowOnboarding: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ONBOARDING_STORAGE_KEY = "tour-crm-onboarding";
const TOTAL_STEPS = 5; // Welcome, Business Profile, Tour, Team, Completion

const initialState: OnboardingState = {
  isComplete: false,
  isDismissed: false,
  currentStep: 0,
  data: {},
  completedSteps: [],
};

// =============================================================================
// CONTEXT
// =============================================================================

const OnboardingContext = createContext<OnboardingContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface OnboardingProviderProps {
  children: ReactNode;
  hasTours?: boolean; // Whether the org already has tours
}

export function OnboardingProvider({
  children,
  hasTours = false,
}: OnboardingProviderProps) {
  const [state, setState, isHydrated] = useLocalStorage<OnboardingState>(
    ONBOARDING_STORAGE_KEY,
    initialState
  );

  // Navigation handlers
  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
    }));
  }, [setState]);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, [setState]);

  const goToStep = useCallback(
    (step: number) => {
      setState((prev) => ({
        ...prev,
        currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
      }));
    },
    [setState]
  );

  // Data management
  const setStepData = useCallback(
    <K extends keyof OnboardingData>(step: K, data: OnboardingData[K]) => {
      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          [step]: data,
        },
      }));
    },
    [setState]
  );

  const markStepComplete = useCallback(
    (step: number) => {
      setState((prev) => ({
        ...prev,
        completedSteps: prev.completedSteps.includes(step)
          ? prev.completedSteps
          : [...prev.completedSteps, step],
      }));
    },
    [setState]
  );

  // Completion handlers
  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isComplete: true,
      currentStep: TOTAL_STEPS - 1,
    }));
  }, [setState]);

  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDismissed: true,
    }));
  }, [setState]);

  const dismissOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDismissed: true,
    }));
  }, [setState]);

  const resetOnboarding = useCallback(() => {
    setState(initialState);
  }, [setState]);

  // Determine if onboarding should be shown
  // Show if: not complete, not dismissed, and org has no tours
  const shouldShowOnboarding = useMemo(() => {
    if (!isHydrated) return false;
    if (state.isComplete) return false;
    if (state.isDismissed) return false;
    if (hasTours) return false;
    return true;
  }, [isHydrated, state.isComplete, state.isDismissed, hasTours]);

  const value = useMemo(
    () => ({
      state,
      isHydrated,
      nextStep,
      prevStep,
      goToStep,
      setStepData,
      markStepComplete,
      completeOnboarding,
      skipOnboarding,
      dismissOnboarding,
      resetOnboarding,
      shouldShowOnboarding,
    }),
    [
      state,
      isHydrated,
      nextStep,
      prevStep,
      goToStep,
      setStepData,
      markStepComplete,
      completeOnboarding,
      skipOnboarding,
      dismissOnboarding,
      resetOnboarding,
      shouldShowOnboarding,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useOnboarding(): OnboardingContextType {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

// =============================================================================
// CONSTANTS EXPORT
// =============================================================================

export { TOTAL_STEPS };
