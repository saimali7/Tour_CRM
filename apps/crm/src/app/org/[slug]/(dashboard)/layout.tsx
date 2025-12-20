import { getOrgContext } from "@/lib/auth";
import { DashboardProviders } from "./providers";
import { NavigationProgress } from "@/components/navigation-progress";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { Suspense } from "react";
import { User } from "lucide-react";
import { NavRail } from "@/components/layout/nav-rail";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MobileHeader } from "./mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";

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
    <DashboardProviders orgSlug={slug}>
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

        {/* Main Content Area - responds to context panel state */}
        <DashboardShell
          mobileHeader={<MobileHeader organization={organization} slug={slug} />}
        >
          {children}
        </DashboardShell>

        {/* Mobile bottom navigation */}
        <MobileNav orgSlug={slug} />

        {/* Global keyboard shortcuts modal */}
        <KeyboardShortcutsModal />
      </div>
    </DashboardProviders>
  );
}
