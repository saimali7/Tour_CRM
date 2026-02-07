import Link from "next/link";
import type { Route } from "next";
import { UserX, ArrowLeft, UserPlus } from "lucide-react";

export default function GuideNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-info/10 rounded-full blur-2xl" />
        <div className="relative bg-gradient-to-br from-info/20 to-info/5 rounded-full p-8">
          <UserX className="h-16 w-16 text-info" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-3">
        Guide not found
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        This guide profile may have been deactivated or removed.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={"../" as Route}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          View All Guides
        </Link>
        <Link
          href={"../?action=add" as Route}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add New Guide
        </Link>
      </div>
    </div>
  );
}
