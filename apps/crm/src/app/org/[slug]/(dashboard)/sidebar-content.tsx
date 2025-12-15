"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-context";
import { SidebarNav } from "@/components/sidebar-nav";
import { CommandPalette } from "@/components/command-palette";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search } from "lucide-react";

interface SidebarContentClientProps {
  organization: { name: string };
  role: string;
  slug: string;
  userButton: React.ReactNode;
}

export function SidebarContentClient({
  organization,
  role,
  slug,
  userButton,
}: SidebarContentClientProps) {
  const { isCollapsed } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden flex-shrink-0 border-r border-border bg-card transition-all duration-200 ease-in-out md:flex md:flex-col",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo & Org name */}
        <div
          className={cn(
            "flex h-16 items-center gap-3 border-b border-border",
            isCollapsed ? "justify-center px-2" : "px-4"
          )}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold text-foreground truncate">
                {organization.name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          )}
        </div>

        {/* Global Search */}
        <div
          className={cn(
            "border-b border-border",
            isCollapsed ? "px-2 py-3" : "px-3 py-3"
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    // Trigger the global ⌘K shortcut
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                  }}
                  className="flex h-9 w-full items-center justify-center rounded-lg border border-input bg-background/50 text-muted-foreground transition-colors hover:bg-accent/50 hover:border-accent"
                >
                  <Search className="h-4 w-4 opacity-60" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Search
                <span className="ml-2 text-xs text-muted-foreground">⌘K</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <CommandPalette orgSlug={slug} />
          )}
        </div>

        {/* Navigation */}
        <SidebarNav orgSlug={slug} />

        {/* User section */}
        <div
          className={cn(
            "border-t border-border",
            isCollapsed ? "p-2" : "p-4"
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">{userButton}</div>
              </TooltipTrigger>
              <TooltipContent side="right">Account</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              {userButton}
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-foreground truncate">
                  Account
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
