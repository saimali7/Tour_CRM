"use client";

import { ArrowLeft, Info, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NewSchedulePage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${slug}/availability` as Route}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Schedule</h1>
          <p className="text-muted-foreground mt-1">Schedules are now managed within tours</p>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Info className="h-6 w-6 text-info flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Schedule Management Has Moved
            </h2>
            <p className="text-muted-foreground">
              Schedules are now created and managed directly within each tour. This provides a
              more intuitive workflow where you can set up recurring schedules, manage capacity,
              and assign guides all in one place.
            </p>
            <div className="pt-2">
              <Link href={`/org/${slug}/tours` as Route}>
                <Button className="gap-2">
                  Go to Tours
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-foreground">How to Create Schedules</h3>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>Navigate to <strong className="text-foreground">Tours</strong> in the sidebar</li>
          <li>Select the tour you want to schedule</li>
          <li>Click the <strong className="text-foreground">Schedules</strong> tab</li>
          <li>Use <strong className="text-foreground">Add Schedules</strong> to create single or recurring time slots</li>
        </ol>
      </div>
    </div>
  );
}
