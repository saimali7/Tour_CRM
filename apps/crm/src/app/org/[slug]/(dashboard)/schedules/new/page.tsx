"use client";

import { ScheduleForm } from "@/components/schedules/schedule-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";

export default function NewSchedulePage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${slug}/schedules` as Route}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Schedule</h1>
          <p className="text-gray-500 mt-1">Schedule a new tour time</p>
        </div>
      </div>

      <ScheduleForm />
    </div>
  );
}
