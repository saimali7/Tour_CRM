"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/providers/onboarding-provider";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  Sparkles,
  Check,
  ArrowRight,
  Calendar,
  Users,
  Ticket,
  Settings,
  Map,
  PartyPopper,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CompletionStepProps {
  onComplete: () => void;
  onSkipStep: () => void;
}

// =============================================================================
// CONFETTI COMPONENT
// =============================================================================

function Confetti() {
  const [pieces, setPieces] = useState<
    Array<{
      id: number;
      left: number;
      delay: number;
      duration: number;
      color: string;
    }>
  >([]);

  useEffect(() => {
    const colors = [
      "bg-primary",
      "bg-success",
      "bg-warning",
      "bg-destructive",
      "bg-info",
      "bg-secondary",
    ];

    const newPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "bg-primary",
    }));

    setPieces(newPieces);

    // Clean up after animation
    const timer = setTimeout(() => {
      setPieces([]);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={cn("absolute w-2 h-2 rounded-full", piece.color)}
          style={{
            left: `${piece.left}%`,
            top: "-10px",
            animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CompletionStep({ onComplete, onSkipStep }: CompletionStepProps) {
  const { state, completeOnboarding } = useOnboarding();
  const params = useParams();
  const slug = params.slug as string;

  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Summary of what was created
  const summary = {
    businessName: state.data.businessProfile?.businessName,
    tourName: state.data.firstTour?.name,
    tourId: state.data.firstTour?.id,
    scheduleDays: state.data.schedule?.daysOfWeek?.length ?? 0,
    scheduleTimes: state.data.schedule?.times?.length ?? 0,
  };

  const totalSlots = summary.scheduleDays * summary.scheduleTimes * 4;

  // Quick actions after onboarding
  const quickActions = [
    {
      icon: Calendar,
      label: "View Calendar",
      description: "See your scheduled tours",
      href: `/org/${slug}/schedules` as Route,
    },
    {
      icon: Map,
      label: "Edit Tour",
      description: "Add details and images",
      href: `/org/${slug}/tours/${summary.tourId}` as Route,
      disabled: !summary.tourId,
    },
    {
      icon: Ticket,
      label: "Create Booking",
      description: "Add your first customer",
      href: `/org/${slug}/bookings` as Route,
    },
    {
      icon: Users,
      label: "Add Guide",
      description: "Assign guides to tours",
      href: `/org/${slug}/guides` as Route,
    },
  ];

  const handleGetStarted = () => {
    completeOnboarding();
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Success header */}
      <div className="text-center pb-2">
        <div
          className={cn(
            "inline-flex items-center justify-center h-20 w-20 rounded-3xl mb-4",
            "bg-gradient-to-br from-success/20 to-success/5",
            "animate-in zoom-in-50 duration-500"
          )}
        >
          <div className="relative">
            <Sparkles className="h-10 w-10 text-success" />
            <div className="absolute -top-1 -right-1">
              <PartyPopper className="h-5 w-5 text-warning animate-bounce" />
            </div>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          You're all set!
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your tour business is ready to accept bookings. Here's what we set up
          for you:
        </p>
      </div>

      {/* Summary of what was created */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {summary.businessName && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {summary.businessName}
              </p>
              <p className="text-xs text-muted-foreground">Business profile</p>
            </div>
          </div>
        )}

        {summary.tourName && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {summary.tourName}
              </p>
              <p className="text-xs text-muted-foreground">First tour</p>
            </div>
          </div>
        )}

        {totalSlots > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {totalSlots} time slots
              </p>
              <p className="text-xs text-muted-foreground">
                For the next 4 weeks
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          What's next?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            if (action.disabled) return null;

            return (
              <Link
                key={action.label}
                href={action.href}
                onClick={handleGetStarted}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg",
                  "border border-border bg-card",
                  "hover:border-primary/50 hover:bg-muted/50",
                  "transition-all duration-150",
                  "group"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    "bg-muted text-muted-foreground",
                    "group-hover:bg-primary/10 group-hover:text-primary",
                    "transition-colors"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main CTA */}
      <div className="pt-2">
        <Button
          onClick={handleGetStarted}
          className="w-full h-11 gap-2 font-medium"
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings reminder */}
      <p className="text-xs text-center text-muted-foreground">
        <Settings className="inline h-3 w-3 mr-1 -mt-0.5" />
        You can update your settings anytime from the dashboard
      </p>
    </div>
  );
}
