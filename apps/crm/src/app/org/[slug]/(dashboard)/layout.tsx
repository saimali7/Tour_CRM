import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { getOrgContext } from "@/lib/auth";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Map,
  Calendar,
  UserCircle,
  Settings,
  Mail,
  Tag,
} from "lucide-react";
import { DashboardProviders } from "./providers";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

const navigation = [
  { name: "Dashboard", href: "", icon: LayoutDashboard },
  { name: "Bookings", href: "/bookings", icon: CalendarDays },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Tours", href: "/tours", icon: Map },
  { name: "Schedules", href: "/schedules", icon: Calendar },
  { name: "Guides", href: "/guides", icon: UserCircle },
  { name: "Promo Codes", href: "/promo-codes", icon: Tag },
  { name: "Communications", href: "/communications", icon: Mail },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { slug } = await params;
  const { organization, role } = await getOrgContext(slug);

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
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={`/org/${slug}${item.href}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <item.icon className="h-5 w-5 text-gray-400" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
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
          <UserButton />
        </header>

        {/* Page content */}
        <div className="p-6">
          <DashboardProviders orgSlug={slug}>{children}</DashboardProviders>
        </div>
      </main>
    </div>
  );
}
