"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Route } from "next";

// Redirect from old /schedules/[id]/edit to new /availability/[id]/edit
export default function EditScheduleRedirect() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const scheduleId = params.id as string;

  useEffect(() => {
    router.replace(`/org/${slug}/availability/${scheduleId}/edit` as Route);
  }, [router, slug, scheduleId]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
