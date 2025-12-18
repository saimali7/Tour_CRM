"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-context";
import { SidebarNav } from "@/components/sidebar-nav";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notification-center";
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
          "hidden flex-shrink-0 border-r border-border/50 bg-card transition-all duration-200 ease-in-out md:flex md:flex-col",
          isCollapsed ? "w-[60px]" : "w-56"
        )}
      >
        {/* Org Header - merged with user avatar */}
        <div
          className={cn(
            "flex items-center gap-3 border-b border-border/50",
            isCollapsed ? "justify-center px-2 py-3" : "px-3 py-3"
          )}
        >
          {/* User avatar on left when collapsed, org logo when expanded */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-shrink-0 cursor-pointer transition-transform hover:scale-105">
                  {userButton}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col gap-0.5">
                <span className="font-semibold">{organization.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{role}</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold shadow-sm">
                {organization.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {organization.name}
                </p>
                <p className="text-[10px] text-muted-foreground/80 capitalize leading-tight">{role}</p>
              </div>
              {/* User avatar on right when expanded */}
              <div className="flex-shrink-0 transition-transform hover:scale-105">
                {userButton}
              </div>
            </>
          )}
        </div>

        {/* Global Search + Notifications */}
        <div
          className={cn(
            "border-b border-border/50",
            isCollapsed ? "px-2 py-2" : "px-2 py-2"
          )}
        >
          <div className={cn("flex items-center gap-1.5", isCollapsed && "flex-col")}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                    }}
                    className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Search
                  <span className="ml-2 text-[10px] text-muted-foreground">⌘K</span>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex-1">
                <CommandPalette orgSlug={slug} />
              </div>
            )}
            {/* Notification Center */}
            <NotificationCenter />
          </div>
        </div>

        {/* Navigation */}
        <SidebarNav orgSlug={slug} />
      </aside>
    </TooltipProvider>
  );
}
