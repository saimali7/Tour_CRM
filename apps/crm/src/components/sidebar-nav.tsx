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
  BarChart3,
  LucideIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Route } from "next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/sidebar-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
  badge?: number;
}

// Flat navigation with keyboard shortcuts - no section headers
// Linear/Vercel-style: clean, keyboard-first
const navItems: NavItem[] = [
  { name: "Today", href: "", icon: LayoutDashboard, shortcut: "1" },
  { name: "Calendar", href: "/calendar", icon: Calendar, shortcut: "2" },
  { name: "Bookings", href: "/bookings", icon: CalendarDays, shortcut: "3" },
  { name: "Tours", href: "/tours", icon: Map, shortcut: "4" },
  { name: "Customers", href: "/customers", icon: Users, shortcut: "5" },
  { name: "Guides", href: "/guides", icon: UserCircle, shortcut: "6" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, shortcut: "7" },
];

interface SidebarNavProps {
  orgSlug: string;
}

export function SidebarNav({ orgSlug }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggle } = useSidebar();
  const basePath = `/org/${orgSlug}`;
  const settingsPath = `${basePath}/settings` as Route;
  const isSettingsActive = pathname === settingsPath || pathname.startsWith(`${settingsPath}/`);

  // Keyboard navigation: ⌘1-7 for nav items, ⌘0 for settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= 7) {
        e.preventDefault();
        const item = navItems[num - 1];
        if (item) router.push(`${basePath}${item.href}` as Route);
      } else if (e.key === "0") {
        e.preventDefault();
        router.push(settingsPath);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [basePath, router, settingsPath]);

  return (
    <>
      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          {navItems.map((item, index) => {
            const itemPath = `${basePath}${item.href}` as Route;
            const isActive =
              item.href === ""
                ? pathname === basePath
                : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

            // First 3 items are primary (daily ops), rest are secondary
            const isPrimary = index < 3;

            const linkContent = (
              <Link
                key={item.name}
                href={itemPath}
                prefetch={true}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isCollapsed && "justify-center px-2",
                  // Subtle scale on hover for non-active items
                  !isActive && "hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {/* Left active indicator - Linear style */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-foreground/80 rounded-r-full" />
                )}

                <item.icon
                  className={cn(
                    "flex-shrink-0 h-[18px] w-[18px] transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />

                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {/* Keyboard shortcut */}
                    {item.shortcut && (
                      <kbd className={cn(
                        "hidden lg:inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-mono text-[10px] transition-colors",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground/70"
                          : "bg-muted text-muted-foreground/60 group-hover:bg-accent-foreground/10"
                      )}>
                        ⌘{item.shortcut}
                      </kbd>
                    )}
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            // Add spacing between primary (1-3) and secondary (4-7) items
            const addSpacer = index === 2;

            return (
              <div key={item.name}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.shortcut && (
                        <kbd className="text-[10px] text-muted-foreground">⌘{item.shortcut}</kbd>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
                {addSpacer && <div className="my-2" />}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Compact Footer: Settings + Theme + Collapse in single row */}
      <div className={cn(
        "border-t border-border/50 p-2",
        isCollapsed ? "space-y-1" : "space-y-1"
      )}>
        {/* Settings */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={settingsPath}
                className={cn(
                  "flex items-center justify-center rounded-lg p-2 transition-all duration-150",
                  isSettingsActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95"
                )}
              >
                <Settings className="h-[18px] w-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              <span className="font-medium">Settings</span>
              <kbd className="text-[10px] text-muted-foreground">⌘0</kbd>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href={settingsPath}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              isSettingsActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            <Settings className="h-[18px] w-[18px]" />
            <span className="flex-1">Settings</span>
            <kbd className="hidden lg:inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground/60 group-hover:bg-accent-foreground/10">
              ⌘0
            </kbd>
          </Link>
        )}

        {/* Theme + Collapse Row */}
        <div className={cn(
          "flex items-center gap-1",
          isCollapsed ? "flex-col" : "justify-between px-1"
        )}>
          <ThemeToggle collapsed={isCollapsed} minimal />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className={cn(
                  "flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all duration-150",
                  "hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95"
                )}
              >
                {isCollapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "right" : "top"}>
              {isCollapsed ? "Expand" : "Collapse"}
              <span className="ml-2 text-[10px] text-muted-foreground">⌘\</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
}
