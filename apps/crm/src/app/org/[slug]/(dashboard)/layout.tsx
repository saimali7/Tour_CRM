import { getOrgContext } from "@/lib/auth";
import { DashboardProviders } from "./providers";
import { NavigationProgress } from "@/components/navigation-progress";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { Suspense } from "react";
import { User } from "lucide-react";
import { NavRail } from "@/components/layout/nav-rail";
import { MobileHeader } from "./mobile-header";

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
            avatarBox: "h-7 w-7",
          },
        }}
      />
    );
  }

  // Fallback avatar when Clerk is disabled
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
      <User className="h-3.5 w-3.5 text-muted-foreground" />
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
    <div className="flex h-screen bg-background">
      {/* Navigation Progress Bar */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>

      {/* Desktop Navigation Rail (60px) */}
      <NavRail
        orgSlug={slug}
        orgName={organization.name}
        userButton={<UserAccountButton />}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <MobileHeader organization={organization} slug={slug} />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <DashboardProviders orgSlug={slug}>{children}</DashboardProviders>
        </main>
      </div>

      {/* Global keyboard shortcuts modal */}
      <KeyboardShortcutsModal />
    </div>
  );
}
