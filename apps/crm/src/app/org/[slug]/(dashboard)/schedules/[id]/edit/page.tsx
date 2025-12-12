"use client";

import { trpc } from "@/lib/trpc";
import { ScheduleForm } from "@/components/schedules/schedule-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";

export default function EditSchedulePage() {
  const params = useParams();
  const slug = params.slug as string;
  const scheduleId = params.id as string;

  const { data: schedule, isLoading, error } = trpc.schedule.getById.useQuery({ id: scheduleId });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading schedule: {error.message}</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Schedule not found</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${slug}/schedules/${schedule.id}` as Route}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Schedule</h1>
          <p className="text-gray-500 mt-1">
            {schedule.tour?.name} - {formatDate(schedule.startsAt)}
          </p>
        </div>
      </div>

      <ScheduleForm schedule={schedule} />
    </div>
  );
}
