import { redirect } from "next/navigation";
import { getUserOrganizations } from "@/lib/auth";
import Link from "next/link";
import type { Route } from "next";
import { Building2, Plus } from "lucide-react";
import { db } from "@tour/database";

// Force dynamic rendering - this page needs database access
export const dynamic = "force-dynamic";

// Check if Clerk is enabled
const ENABLE_CLERK = process.env.ENABLE_CLERK === "true";

export default async function HomePage() {
  let userId: string | null = null;

  // Only check Clerk auth if enabled
  if (ENABLE_CLERK) {
    const { auth } = await import("@clerk/nextjs/server");
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    // In dev mode, assume authenticated
    userId = "dev-user";
  }

  // If not signed in, show landing page
  if (!userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-muted">
        <div className="text-center space-y-6">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Manifest
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Multi-tenant tour operations platform for managing bookings,
            customers, and tours.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={"/sign-in" as Route}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href={"/sign-up" as Route}
              className="inline-flex items-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Get user's organizations (or first org in dev mode)
  let orgs = await getUserOrganizations();

  // In dev mode, if no orgs from getUserOrganizations, get first org directly
  if (!ENABLE_CLERK && orgs.length === 0) {
    const firstOrg = await db.query.organizations.findFirst();
    if (firstOrg) {
      orgs = [firstOrg];
    }
  }

  // If user has exactly one org, redirect to it
  if (orgs.length === 1 && orgs[0]) {
    redirect(`/org/${orgs[0].slug}`);
  }

  // If user has multiple orgs, show selection page
  if (orgs.length > 1) {
    redirect("/select-org");
  }

  // User has no orgs - show onboarding
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-muted">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome to Manifest
        </h1>
        <p className="text-muted-foreground">
          You don&apos;t have access to any organizations yet. Contact your
          administrator to get invited, or create a new organization.
        </p>
        <Link
          href={"/onboarding" as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </Link>
      </div>
    </main>
  );
}
