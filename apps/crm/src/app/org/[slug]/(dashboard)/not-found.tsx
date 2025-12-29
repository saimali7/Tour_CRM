import Link from "next/link";
import type { Route } from "next";
import { MapPin, Home, Search, ArrowLeft } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-full p-8">
          <MapPin className="h-16 w-16 text-primary" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-3">
        Page not found
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved.
        Let's get you back on track.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={"./" as Route}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>

      <div className="mt-12 text-sm text-muted-foreground">
        <p>Looking for something specific? Try:</p>
        <div className="flex flex-wrap justify-center gap-4 mt-3">
          <Link href={"./bookings" as Route} className="text-primary hover:underline">Bookings</Link>
          <Link href={"./tours" as Route} className="text-primary hover:underline">Tours</Link>
          <Link href={"./customers" as Route} className="text-primary hover:underline">Customers</Link>
          <Link href={"./guides" as Route} className="text-primary hover:underline">Guides</Link>
        </div>
      </div>
    </div>
  );
}
