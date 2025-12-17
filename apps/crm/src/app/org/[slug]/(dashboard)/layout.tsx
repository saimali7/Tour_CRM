import { getOrgContext } from "@/lib/auth";
import { DashboardProviders } from "./providers";
import { NavigationProgress } from "@/components/navigation-progress";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { Suspense } from "react";
import { User } from "lucide-react";
import { SidebarProvider } from "@/components/sidebar-context";
import { SidebarContentClient } from "./sidebar-content";
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
            avatarBox: "h-8 w-8",
          },
        }}
      />
    );
  }

  // Fallback avatar when Clerk is disabled
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
      <User className="h-4 w-4 text-muted-foreground" />
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
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {/* Navigation Progress Bar */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>

        {/* Desktop Sidebar */}
        <SidebarContentClient
          organization={organization}
          role={role}
          slug={slug}
          userButton={<UserAccountButton />}
        />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Mobile header */}
          <MobileHeader organization={organization} slug={slug} />

          {/* Page content */}
          <div className="p-6">
            <DashboardProviders orgSlug={slug}>{children}</DashboardProviders>
          </div>
        </main>

        {/* Global keyboard shortcuts modal */}
        <KeyboardShortcutsModal />
      </div>
    </SidebarProvider>
  );
}
