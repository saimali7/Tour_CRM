import { getOrgContext } from "@/lib/auth";
import { DashboardProviders } from "./providers";
import { CommandPalette } from "@/components/command-palette";
import { SidebarNav } from "@/components/sidebar-nav";
import { NavigationProgress } from "@/components/navigation-progress";
import { Suspense } from "react";
import { User } from "lucide-react";

// Check if Clerk is enabled
const ENABLE_CLERK = process.env.ENABLE_CLERK === "true";

// Conditionally import UserButton
async function UserAccountButton() {
  if (ENABLE_CLERK) {
    const { UserButton } = await import("@clerk/nextjs");
    return (
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
          },
        }}
      />
    );
  }

  // Fallback avatar when Clerk is disabled
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
      <User className="h-4 w-4 text-gray-600" />
    </div>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { slug } = await params;
  const { organization, role } = await getOrgContext(slug);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation Progress Bar */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>

      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        {/* Logo & Org name */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {organization.name}
            </p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
        </div>

        {/* Global Search */}
        <div className="px-3 py-3 border-b border-gray-200">
          <CommandPalette orgSlug={slug} />
        </div>

        {/* Navigation - Client Component with active states */}
        <SidebarNav orgSlug={slug} />

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <UserAccountButton />
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-gray-900 truncate">
                Account
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          <p className="flex-1 text-sm font-semibold text-gray-900 truncate">
            {organization.name}
          </p>
          <UserAccountButton />
        </header>

        {/* Page content */}
        <div className="p-6">
          <DashboardProviders orgSlug={slug}>{children}</DashboardProviders>
        </div>
      </main>
    </div>
  );
}
