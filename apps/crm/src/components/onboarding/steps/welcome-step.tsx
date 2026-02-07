"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Sparkles,
  MapPin,
  Users,
  Calendar,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface WelcomeStepProps {
  onComplete: () => void;
  onSkipStep: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WelcomeStep({ onComplete, onSkipStep }: WelcomeStepProps) {
  // Get organization name
  const { data: org } = trpc.organization.get.useQuery(undefined, {
    staleTime: Infinity,
  });

  const organizationName = org?.name || "your business";

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        onComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onComplete]);

  const features = [
    {
      icon: MapPin,
      title: "Manage Tours",
      description: "Create and organize your tour experiences",
    },
    {
      icon: Calendar,
      title: "Schedule & Availability",
      description: "Set up schedules and manage capacity",
    },
    {
      icon: Users,
      title: "Track Customers",
      description: "Build relationships with your guests",
    },
    {
      icon: CreditCard,
      title: "Accept Payments",
      description: "Process bookings and payments seamlessly",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center">
        <div
          className={cn(
            "inline-flex items-center justify-center h-20 w-20 rounded-3xl mb-6",
            "bg-gradient-to-br from-warning/20 via-warning/10 to-primary/5",
            "animate-in zoom-in-50 duration-500"
          )}
        >
          <Sparkles className="h-10 w-10 text-warning" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to {organizationName}
        </h2>

        <p className="text-muted-foreground max-w-md mx-auto">
          Let's get your tour business up and running in just a few minutes.
          We'll guide you through the essentials.
        </p>
      </div>

      {/* What you'll set up */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          What we'll help you with
        </p>

        <div className="grid gap-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl",
                  "border border-border bg-card/50",
                  "animate-in fade-in slide-in-from-bottom-2",
                  "transition-colors hover:bg-muted/30"
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {feature.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time estimate */}
      <div
        className={cn(
          "flex items-center justify-center gap-2",
          "text-sm text-muted-foreground",
          "animate-in fade-in duration-700 delay-500"
        )}
      >
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span>Takes about 2-3 minutes</span>
      </div>

      {/* CTA */}
      <div className="pt-2">
        <Button
          onClick={onComplete}
          className="w-full h-12 gap-2 font-medium text-base"
        >
          Let's Get Started
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
