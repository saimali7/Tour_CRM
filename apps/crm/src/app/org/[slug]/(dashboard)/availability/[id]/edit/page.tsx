"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ScheduleForm } from "@/components/schedules/schedule-form";

export default function EditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;

  const { data: schedule, isLoading, error } = trpc.schedule.getById.useQuery({ id: scheduleId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <p className="text-destructive">Error loading schedule: {error.message}</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Schedule not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Schedule</h1>
          <p className="text-muted-foreground">
            {schedule.tour?.name} - {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date(schedule.startsAt))}
          </p>
        </div>
      </div>

      {/* Form */}
      <ScheduleForm
        schedule={{
          id: schedule.id,
          tourId: schedule.tourId,
          startsAt: new Date(schedule.startsAt),
          endsAt: new Date(schedule.endsAt),
          maxParticipants: schedule.maxParticipants,
          price: schedule.price,
          meetingPoint: schedule.meetingPoint,
          meetingPointDetails: schedule.meetingPointDetails,
          internalNotes: schedule.internalNotes,
          publicNotes: schedule.publicNotes,
        }}
      />
    </div>
  );
}
