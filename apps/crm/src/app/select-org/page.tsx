import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganizations } from "@/lib/auth";
import Link from "next/link";
import type { Route } from "next";
import { Building2, ChevronRight } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export default async function SelectOrgPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const orgs = await getUserOrganizations();

  if (orgs.length === 0) {
    redirect("/");
  }

  if (orgs.length === 1 && orgs[0]) {
    redirect(`/org/${orgs[0].slug}`);
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-gray-900">Tour CRM</span>
        </div>
        <UserButton />
      </header>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Select Organization
            </h1>
            <p className="mt-2 text-gray-500">
              Choose an organization to continue
            </p>
          </div>

          <div className="space-y-2">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.slug}`}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-sm font-bold"
                  style={{ backgroundColor: org.primaryColor ?? "#0066FF" }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{org.name}</p>
                  <p className="text-sm text-gray-500">{org.slug}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
