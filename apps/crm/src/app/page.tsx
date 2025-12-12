import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganizations } from "@/lib/auth";
import Link from "next/link";
import type { Route } from "next";
import { Building2, Plus } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();

  // If not signed in, show landing page
  if (!userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <div className="text-center space-y-6">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary text-white">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Tour CRM
          </h1>
          <p className="text-gray-500 text-lg max-w-md">
            Multi-tenant tour operations platform for managing bookings,
            customers, and tours.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={"/sign-in" as Route}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href={"/sign-up" as Route}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Get user's organizations
  const orgs = await getUserOrganizations();

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
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome to Tour CRM
        </h1>
        <p className="text-gray-500">
          You don&apos;t have access to any organizations yet. Contact your
          administrator to get invited, or create a new organization.
        </p>
        <Link
          href={"/onboarding" as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </Link>
      </div>
    </main>
  );
}
