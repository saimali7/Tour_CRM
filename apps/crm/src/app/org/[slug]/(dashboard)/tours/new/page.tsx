"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TourForm } from "@/components/tours/tour-form";
import { ScheduleTemplateForm, type ScheduleTemplate } from "@/components/tours/schedule-template-form";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "details" | "schedules";

interface CreatedTour {
  id: string;
  durationMinutes: number;
  maxParticipants: number;
}

export default function NewTourPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [createdTour, setCreatedTour] = useState<CreatedTour | null>(null);
  const [isCreatingSchedules, setIsCreatingSchedules] = useState(false);

  const autoGenerateMutation = trpc.schedule.autoGenerate.useMutation();

  // Handle tour creation success
  const handleTourCreated = (tourId: string) => {
    // Fetch the tour to get duration and maxParticipants
    // For simplicity, we'll use defaults from the form
    // In practice, you might want to pass these values through
    setCreatedTour({
      id: tourId,
      durationMinutes: 60, // Will be overridden by actual query
      maxParticipants: 10, // Will be overridden by actual query
    });
    setCurrentStep("schedules");
  };

  // We need to fetch the tour data after creation
  const { data: tourData } = trpc.tour.getById.useQuery(
    { id: createdTour?.id ?? "" },
    { enabled: !!createdTour?.id }
  );

  // Handle schedule template submission
  const handleScheduleSubmit = async (template: ScheduleTemplate) => {
    if (!createdTour) return;

    setIsCreatingSchedules(true);
    try {
      const result = await autoGenerateMutation.mutateAsync({
        tourId: createdTour.id,
        startDate: new Date(template.startDate),
        endDate: new Date(template.endDate),
        daysOfWeek: template.daysOfWeek,
        times: template.times,
        maxParticipants: template.maxParticipants,
        skipExisting: true,
      });

      toast.success(`Created ${result.created} schedules`);
      router.push(`/org/${slug}/tours/${createdTour.id}?tab=schedules`);
    } catch (error) {
      toast.error("Failed to create schedules");
    } finally {
      setIsCreatingSchedules(false);
    }
  };

  // Handle skipping schedule setup
  const handleSkipSchedules = () => {
    if (!createdTour) return;
    router.push(`/org/${slug}/tours/${createdTour.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${slug}/tours` as Route}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Tour</h1>
          <p className="text-muted-foreground mt-1">
            {currentStep === "details"
              ? "Add a new tour to your catalog"
              : "Set up your initial schedule"}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            currentStep === "details"
              ? "bg-primary text-primary-foreground"
              : "bg-success/10 text-success"
          )}
        >
          {currentStep !== "details" ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs">
              1
            </span>
          )}
          Tour Details
        </div>
        <div className="w-8 h-0.5 bg-border" />
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            currentStep === "schedules"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
            2
          </span>
          Schedule Setup
        </div>
      </div>

      {/* Step Content */}
      {currentStep === "details" ? (
        <TourForm
          mode="create"
          onSuccess={handleTourCreated}
        />
      ) : (
        <div className="bg-card rounded-lg border border-border p-6">
          <ScheduleTemplateForm
            durationMinutes={tourData?.durationMinutes ?? 60}
            defaultMaxParticipants={tourData?.maxParticipants ?? 10}
            onSubmit={handleScheduleSubmit}
            onSkip={handleSkipSchedules}
            isSubmitting={isCreatingSchedules}
          />
        </div>
      )}
    </div>
  );
}
