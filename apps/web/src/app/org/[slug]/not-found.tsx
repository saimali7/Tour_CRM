import Link from "next/link";
import { Compass, MapPinned, ArrowRight } from "lucide-react";
import { Button } from "@tour/ui";
import { CATEGORY_CONFIGS } from "@/lib/category-config";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 sm:px-8">
      <div className="w-full max-w-lg space-y-8 text-center">
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
            <Link href="/">Browse All Experiences</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>

        {/* Explore categories — keep users on site */}
        <div className="border-t border-border pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Or explore by category
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_CONFIGS.map((cat) => (
              <Link
                key={cat.slug}
                href={`/experiences/${cat.slug}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:text-primary"
              >
                {cat.label}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
