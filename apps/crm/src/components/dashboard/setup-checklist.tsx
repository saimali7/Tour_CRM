"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Check,
  Circle,
  ChevronDown,
  ChevronUp,
  Building2,
  CreditCard,
  MapPin,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SetupChecklistProps {
  orgSlug: string;
}

interface SetupStep {
  name: string;
  label: string;
  description: string;
  completed: boolean;
  href?: string;
  icon: typeof Building2;
}

export function SetupChecklist({ orgSlug }: SetupChecklistProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: setupProgress, isLoading } = trpc.onboarding.getSetupProgress.useQuery(
    undefined,
    {
      staleTime: 30000, // Cache for 30 seconds
    }
  );

  if (isLoading || !setupProgress) {
    return null;
  }

  // Don't show if all steps are complete
  if (setupProgress.percentage === 100 || isDismissed) {
    return null;
  }

  const steps: SetupStep[] = [
    {
      name: "basicInfo",
      label: "Create your organization",
      description: "Set up your business name and preferences",
      completed: setupProgress.steps.find((s) => s.name === "basicInfo")?.completed ?? false,
      icon: Building2,
    },
    {
      name: "businessProfile",
      label: "Complete business profile",
      description: "Add your address, phone, and website",
      completed: setupProgress.steps.find((s) => s.name === "businessProfile")?.completed ?? false,
      href: `/org/${orgSlug}/settings#business`,
      icon: MapPin,
    },
    {
      name: "stripeConnect",
      label: "Connect payment processing",
      description: "Accept online payments with Stripe",
      completed: setupProgress.steps.find((s) => s.name === "stripeConnect")?.completed ?? false,
      href: `/org/${orgSlug}/settings#payments`,
      icon: CreditCard,
    },
    {
      name: "firstTour",
      label: "Create your first tour",
      description: "Add a tour product to sell",
      completed: setupProgress.steps.find((s) => s.name === "firstTour")?.completed ?? false,
      href: `/org/${orgSlug}/tours/new`,
      icon: Ticket,
    },
    {
      name: "firstBooking",
      label: "Get your first booking",
      description: "Receive a customer booking",
      completed: setupProgress.steps.find((s) => s.name === "firstBooking")?.completed ?? false,
      icon: Users,
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const canDismiss = completedSteps >= 3; // Allow dismiss after core steps done

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Complete Your Setup</h3>
            <p className="text-sm text-muted-foreground">
              {completedSteps} of {steps.length} steps complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress Ring */}
          <div className="relative h-10 w-10">
            <svg className="h-10 w-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={100}
                strokeDashoffset={100 - setupProgress.percentage}
                className="text-primary transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
              {setupProgress.percentage}%
            </span>
          </div>
          {canDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            {isMinimized ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Steps List */}
      {!isMinimized && (
        <div className="px-4 pb-4 space-y-2">
          {steps.map((step) => {
            const StepIcon = step.icon;
            const content = (
              <div
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  step.completed
                    ? "bg-muted/50"
                    : step.href
                      ? "hover:bg-accent cursor-pointer"
                      : "bg-muted/30"
                }`}
              >
                {/* Status Icon */}
                <div
                  className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${
                    step.completed
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.completed ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                {/* Action Icon */}
                <div className="flex-shrink-0">
                  <StepIcon
                    className={`h-4 w-4 ${
                      step.completed ? "text-muted-foreground" : "text-primary"
                    }`}
                  />
                </div>
              </div>
            );

            if (step.href && !step.completed) {
              return (
                <Link key={step.name} href={step.href as Route}>
                  {content}
                </Link>
              );
            }

            return <div key={step.name}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
