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
    <main className="flex min-h-screen flex-col bg-muted">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">Manifest</span>
        </div>
        <UserButton />
      </header>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Select Organization
            </h1>
            <p className="mt-2 text-muted-foreground">
              Choose an organization to continue
            </p>
          </div>

          <div className="space-y-2">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.slug}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:border-primary hover:bg-accent transition-colors"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-primary-foreground text-sm font-bold"
                  style={{ backgroundColor: org.primaryColor ?? "#0066FF" }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{org.name}</p>
                  <p className="text-sm text-muted-foreground">{org.slug}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
