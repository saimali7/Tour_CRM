"use client";

import { useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import type { Route } from "next";

// Redirect from old /schedules to new /availability
export default function SchedulesRedirect() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  useEffect(() => {
    const queryString = searchParams.toString();
    const newUrl = `/org/${slug}/availability${queryString ? `?${queryString}` : ""}` as Route;
    router.replace(newUrl);
  }, [router, slug, searchParams]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
