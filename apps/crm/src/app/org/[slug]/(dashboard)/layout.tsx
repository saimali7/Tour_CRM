import type { Metadata } from "next";
import { getOrgContext } from "@/lib/auth";
import { logger } from "@tour/services";
import { DashboardProviders } from "./providers";
import { NavigationProgress } from "@/components/navigation-progress";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { Suspense } from "react";
import { NavRail } from "@/components/layout/nav-rail";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MobileHeader } from "./mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { organization } = await getOrgContext(slug);
    return {
      title: {
        template: `%s | ${organization.name} · Manifest`,
        default: `${organization.name} · Manifest`,
      },
      description: `Tour operations dashboard for ${organization.name}`,
    };
  } catch (error) {
    logger.debug({ err: error, slug }, "Could not get org context for metadata, using defaults");
    return {
      title: {
        template: "%s | Manifest",
        default: "Manifest",
      },
      description: "The operations platform for tour companies",
    };
  }
}

// Check if Clerk is enabled
const ENABLE_CLERK = process.env.ENABLE_CLERK === "true";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { slug } = await params;
  const { organization } = await getOrgContext(slug);

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
          clerkEnabled={ENABLE_CLERK}
        />

        {/* Main Content Area - responds to context panel state */}
        <DashboardShell
          mobileHeader={<MobileHeader organization={organization} slug={slug} />}
        >
          <main
            id="main-content"
            className="flex-1 flex flex-col min-h-0 overflow-auto p-4 md:p-6 mobile-content-padding"
            tabIndex={-1}
          >
            {children}
          </main>
        </DashboardShell>

        {/* Mobile bottom navigation */}
        <MobileNav orgSlug={slug} />

        {/* Global keyboard shortcuts modal */}
        <KeyboardShortcutsModal />
      </div>
    </DashboardProviders>
  );
}
