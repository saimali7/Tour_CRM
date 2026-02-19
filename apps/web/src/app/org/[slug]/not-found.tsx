import Link from "next/link";
import { Compass, MapPinned } from "lucide-react";
import { Button } from "@tour/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card">
          <div className="relative">
            <Compass className="h-9 w-9 text-primary" />
            <MapPinned className="absolute -right-4 -top-3 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Page Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">Browse All Tours</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
