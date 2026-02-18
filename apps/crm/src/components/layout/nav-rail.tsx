"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  House,
  Radar,
  CalendarDays,
  Ticket,
  Map,
  UserRound,
  UserCheck,
  ChartLine,
  Settings,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect } from "react";
import { NotificationCenter } from "@/components/notification-center";
import { CommandPalette } from "@/components/command-palette";
import { UserAccountButton } from "@/components/layout/user-account-button";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  shortcut: string;
}

const navItems: NavItem[] = [
  // Keep icon metaphors concrete and domain-specific for faster recognition.
  { name: "Dashboard", href: "", icon: House, shortcut: "1" },
  { name: "Dispatch", href: "/command-center", icon: Radar, shortcut: "2" },
  { name: "Calendar", href: "/calendar", icon: CalendarDays, shortcut: "3" },
  { name: "Bookings", href: "/bookings", icon: Ticket, shortcut: "4" },
  { name: "Tours", href: "/tours", icon: Map, shortcut: "5" },
  { name: "Customers", href: "/customers", icon: UserRound, shortcut: "6" },
  { name: "Guides", href: "/guides", icon: UserCheck, shortcut: "7" },
  { name: "Analytics", href: "/analytics", icon: ChartLine, shortcut: "8" },
];

interface NavRailProps {
  orgSlug: string;
  orgName: string;
  clerkEnabled: boolean;
}

export function NavRail({ orgSlug, orgName, clerkEnabled }: NavRailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/org/${orgSlug}`;
  const settingsPath = `${basePath}/settings` as Route;
  const isSettingsActive = pathname === settingsPath || pathname.startsWith(`${settingsPath}/`);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
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
    <TooltipProvider delayDuration={0}>
      <aside className="hidden md:flex w-[60px] flex-shrink-0 flex-col border-r border-border bg-card">
        {/* Manifest Brand Mark */}
        <div className="flex h-14 items-center justify-center border-b border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary cursor-pointer hover:opacity-90 transition-opacity">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 25V7l10 12 10-12v18h-5V14l-5 8-5-8v11z" fill="currentColor" className="text-primary-foreground"/>
                </svg>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span className="font-medium">{orgName}</span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Search + Notifications */}
        <div className="flex flex-col items-center gap-1 py-2 border-b border-border">
          {/* Hidden command palette that listens for events */}
          <div className="hidden">
            <CommandPalette orgSlug={orgSlug} />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  document.dispatchEvent(new CustomEvent("open-command-palette"));
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              Search
              <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                K
              </kbd>
            </TooltipContent>
          </Tooltip>

          <NotificationCenter />
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const itemPath = `${basePath}${item.href}` as Route;
            const isActive =
              item.href === ""
                ? pathname === basePath
                : pathname === itemPath || pathname.startsWith(`${itemPath}/`);

            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={itemPath}
                    prefetch={true}
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-foreground rounded-r-full" />
                    )}
                    <item.icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  {item.name}
                  <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </kbd>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer: Settings, Theme, User */}
        <div className="flex flex-col items-center gap-1 py-2 border-t border-border">
          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={settingsPath}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  isSettingsActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              Settings
              <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                0
              </kbd>
            </TooltipContent>
          </Tooltip>

          {/* Theme */}
          <ThemeToggle collapsed minimal />

          {/* User */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-9 w-9 items-center justify-center cursor-pointer">
                <UserAccountButton clerkEnabled={clerkEnabled} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Account</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
