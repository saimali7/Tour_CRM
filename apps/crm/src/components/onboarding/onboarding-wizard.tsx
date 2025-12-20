"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useOnboarding,
  TOTAL_STEPS,
} from "@/providers/onboarding-provider";
import { trpc } from "@/lib/trpc";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Map,
  Users,
  Sparkles,
} from "lucide-react";

// Step components
import { WelcomeStep } from "./steps/welcome-step";
import { BusinessProfileStep } from "./steps/business-profile-step";
import { CreateTourStep } from "./steps/create-tour-step";
import { TeamInviteStep } from "./steps/team-invite-step";
import { CompletionStep } from "./steps/completion-step";

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

const steps = [
  {
    id: "welcome",
    title: "Welcome",
    shortTitle: "Welcome",
    description: "Let's get you started",
    icon: Sparkles,
    component: WelcomeStep,
    optional: false,
  },
  {
    id: "business",
    title: "Business Profile",
    shortTitle: "Profile",
    description: "Tell us about your tour business",
    icon: Building2,
    component: BusinessProfileStep,
    optional: false,
  },
  {
    id: "tour",
    title: "Create Your First Tour",
    shortTitle: "Tour",
    description: "Set up your flagship experience",
    icon: Map,
    component: CreateTourStep,
    optional: true,
  },
  {
    id: "team",
    title: "Invite Your Team",
    shortTitle: "Team",
    description: "Add team members to help manage",
    icon: Users,
    component: TeamInviteStep,
    optional: true,
  },
  {
    id: "complete",
    title: "You're All Set!",
    shortTitle: "Done",
    description: "Start accepting bookings",
    icon: Sparkles,
    component: CompletionStep,
    optional: false,
  },
];

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export function OnboardingWizard() {
  const {
    state,
    isHydrated,
    shouldShowOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    markStepComplete,
  } = useOnboarding();

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Check if org has tours
  const { data: tourData, isLoading: toursLoading } = trpc.tour.list.useQuery(
    { pagination: { page: 1, limit: 1 } },
    { enabled: isHydrated }
  );

  const hasTours = (tourData?.data?.length ?? 0) > 0;

  // Determine visibility after hydration and data load
  useEffect(() => {
    if (isHydrated && !toursLoading) {
      // Don't show if already has tours or onboarding is complete/dismissed
      if (hasTours || state.isComplete || state.isDismissed) {
        setIsVisible(false);
      } else {
        // Small delay for smoother appearance
        const timer = setTimeout(() => setIsVisible(true), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isHydrated, toursLoading, hasTours, state.isComplete, state.isDismissed]);

  // Handle skip with animation
  const handleSkip = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      skipOnboarding();
      setIsVisible(false);
    }, 200);
  };

  // Handle completion with animation
  const handleComplete = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      completeOnboarding();
      setIsVisible(false);
    }, 200);
  };

  // Don't render until hydrated
  if (!isHydrated || toursLoading) return null;
  if (!isVisible) return null;

  const currentStep = state.currentStep;
  const CurrentStepComponent = steps[currentStep]?.component;
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const CurrentIcon = steps[currentStep]?.icon ?? Building2;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-background/80 backdrop-blur-sm",
        "transition-opacity duration-200",
        isAnimatingOut ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Backdrop click to dismiss - disabled for better UX */}
      <div className="absolute inset-0" aria-hidden="true" />

      {/* Wizard Card */}
      <div
        className={cn(
          "relative w-full max-w-2xl",
          "bg-card border border-border rounded-2xl shadow-2xl",
          "overflow-hidden",
          "transition-all duration-300",
          isAnimatingOut
            ? "scale-95 opacity-0"
            : "scale-100 opacity-100 animate-in fade-in slide-in-from-bottom-4"
        )}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border bg-gradient-to-b from-muted/50 to-transparent">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Title section */}
          <div className="flex items-start gap-4 pr-8">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                "bg-primary/10 text-primary",
                "transition-transform duration-300"
              )}
            >
              <CurrentIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-foreground tracking-tight">
                {steps[currentStep]?.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {steps[currentStep]?.description}
              </p>
            </div>
          </div>

          {/* Progress section */}
          <div className="mt-5 space-y-3">
            {/* Progress bar */}
            <Progress value={progress} size="sm" className="h-1.5" />

            {/* Step indicators */}
            <div className="flex justify-between">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted =
                  state.completedSteps.includes(index) || index < currentStep;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      isActive
                        ? "text-primary"
                        : isCompleted
                          ? "text-primary/70"
                          : "text-muted-foreground/60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        "transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground scale-110"
                          : isCompleted
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium hidden sm:inline",
                        isActive ? "text-foreground" : ""
                      )}
                    >
                      {step.shortTitle}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {CurrentStepComponent && (
            <CurrentStepComponent
              onComplete={() => {
                markStepComplete(currentStep);
                if (isLastStep) {
                  handleComplete();
                } else {
                  nextStep();
                }
              }}
              onSkipStep={() => {
                if (isLastStep) {
                  handleComplete();
                } else {
                  nextStep();
                }
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={isFirstStep}
            className={cn(
              "gap-2",
              isFirstStep && "invisible"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Skip for now
          </button>

          {/* Next/Complete button is in step components for form handling */}
        </div>
      </div>
    </div>
  );
}
