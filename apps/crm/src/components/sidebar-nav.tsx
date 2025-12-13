"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, useCallback } from "react";
import { cn } from "@/lib/utils";
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
  BarChart3,
  LucideIcon,
  Loader2,
} from "lucide-react";
import type { Route } from "next";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "", icon: LayoutDashboard },
  { name: "Bookings", href: "/bookings", icon: CalendarDays },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Tours", href: "/tours", icon: Map },
  { name: "Schedules", href: "/schedules", icon: Calendar },
  { name: "Guides", href: "/guides", icon: UserCircle },
  { name: "Promo Codes", href: "/promo-codes", icon: Tag },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Communications", href: "/communications", icon: Mail },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  orgSlug: string;
}

export function SidebarNav({ orgSlug }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const basePath = `/org/${orgSlug}`;

  // Track which link is being navigated to
  const handleNavigation = useCallback(
    (href: Route) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navigation.map((item) => {
        const itemPath = `${basePath}${item.href}` as Route;
        const isActive =
          item.href === ""
            ? pathname === basePath
            : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

        return (
          <Link
            key={item.name}
            href={itemPath}
            prefetch={true}
            onClick={(e) => {
              // Use transition for smoother navigation
              if (!isActive) {
                e.preventDefault();
                handleNavigation(itemPath);
              }
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
              isPending && "opacity-70"
            )}
          >
            {isPending && !isActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-primary" : "text-gray-400"
                )}
              />
            )}
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
