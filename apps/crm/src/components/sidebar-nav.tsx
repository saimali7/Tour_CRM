"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Star,
  LucideIcon,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { Route } from "next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/sidebar-context";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { name: "Dashboard", href: "", icon: LayoutDashboard },
      { name: "Bookings", href: "/bookings", icon: CalendarDays },
      { name: "Schedules", href: "/schedules", icon: Calendar },
    ],
  },
  {
    title: "Management",
    items: [
      { name: "Tours", href: "/tours", icon: Map },
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Guides", href: "/guides", icon: UserCircle },
    ],
  },
  {
    title: "Business",
    items: [
      { name: "Promo Codes", href: "/promo-codes", icon: Tag },
      { name: "Reviews", href: "/reviews", icon: Star },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Communications", href: "/communications", icon: Mail },
    ],
  },
  {
    title: "Admin",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

interface SidebarNavProps {
  orgSlug: string;
}

export function SidebarNav({ orgSlug }: SidebarNavProps) {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();
  const basePath = `/org/${orgSlug}`;

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.title} className={cn(groupIndex > 0 && "mt-6")}>
            {/* Group title - hidden when collapsed */}
            {!isCollapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
            )}
            {isCollapsed && groupIndex > 0 && (
              <div className="mx-auto mb-2 h-px w-8 bg-border" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const itemPath = `${basePath}${item.href}` as Route;
                const isActive =
                  item.href === ""
                    ? pathname === basePath
                    : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

                const linkContent = (
                  <Link
                    key={item.name}
                    href={itemPath}
                    prefetch={true}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );

                // Wrap in tooltip when collapsed
                if (isCollapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className={cn("border-t border-border p-3 space-y-1", isCollapsed && "px-2")}>
        {/* Theme toggle */}
        <ThemeToggle collapsed={isCollapsed} />

        {/* Collapse toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={isCollapsed ? "icon" : "sm"}
              onClick={toggle}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                !isCollapsed && "justify-start gap-3"
              )}
            >
              {isCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <>
                  <PanelLeftClose className="h-5 w-5" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              Expand sidebar
              <span className="ml-2 text-xs text-muted-foreground">⌘\</span>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </>
  );
}
