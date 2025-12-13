import { redirect } from "next/navigation";
import Link from "next/link";
import { getGuideContext, guideLogout } from "@/lib/guide-auth";
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@tour/ui";

interface GuidePortalLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/guide", icon: LayoutDashboard },
  { name: "My Assignments", href: "/guide/assignments", icon: ClipboardList },
];

async function LogoutButton() {
  async function handleLogout() {
    "use server";
    await guideLogout();
    redirect("/guide/auth");
  }

  return (
    <form action={handleLogout}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="w-full justify-start"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </form>
  );
}

export default async function GuidePortalLayout({
  children,
}: GuidePortalLayoutProps) {
  const guideContext = await getGuideContext();

  // Redirect to auth if not logged in
  if (!guideContext) {
    redirect("/guide/auth");
  }

  const { guide, organization } = guideContext;

  return (
    <div className="flex h-screen bg-gray-50">
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
            <p className="text-xs text-gray-500">Guide Portal</p>
          </div>
        </div>

        {/* Guide Info */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              {guide.avatarUrl ? (
                <img
                  src={guide.avatarUrl}
                  alt={`${guide.firstName} ${guide.lastName}`}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-gray-900 truncate">
                {guide.firstName} {guide.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{guide.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <item.icon className="h-5 w-5 text-gray-400" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Logout section */}
        <div className="border-t border-gray-200 p-4">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {organization.name}
            </p>
            <p className="text-xs text-gray-500">
              {guide.firstName} {guide.lastName}
            </p>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
