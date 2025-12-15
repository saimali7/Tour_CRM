"use client";

import { trpc } from "@/lib/trpc";
import { GuideForm } from "@/components/guides/guide-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";

export default function EditGuidePage() {
  const params = useParams();
  const slug = params.slug as string;
  const guideId = params.id as string;

  const { data: guide, isLoading, error } = trpc.guide.getById.useQuery({
    id: guideId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Error loading guide: {error.message}</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Guide not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${slug}/guides/${guide.id}` as Route}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Guide</h1>
          <p className="text-muted-foreground mt-1">
            {guide.firstName} {guide.lastName}
          </p>
        </div>
      </div>

      <GuideForm guide={guide} />
    </div>
  );
}
