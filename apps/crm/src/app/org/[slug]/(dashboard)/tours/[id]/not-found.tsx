import Link from "next/link";
import type { Route } from "next";
import { Map, ArrowLeft, Plus } from "lucide-react";

export default function TourNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl" />
        <div className="relative bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-full p-8">
          <Map className="h-16 w-16 text-emerald-500" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-3">
        Tour not found
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        This tour may have been deleted or archived.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={"../" as Route}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          View All Tours
        </Link>
        <Link
          href={"../new" as Route}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create New Tour
        </Link>
      </div>
    </div>
  );
}
