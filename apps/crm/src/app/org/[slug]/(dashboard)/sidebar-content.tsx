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
          "hidden flex-shrink-0 border-r border-border bg-card transition-all duration-200 ease-in-out md:flex md:flex-col",
          isCollapsed ? "w-[60px]" : "w-56"
        )}
      >
        {/* Org Header - merged with user avatar */}
        <div
          className={cn(
            "flex items-center gap-3 border-b border-border",
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
            "border-b border-border",
            isCollapsed ? "px-2 py-2" : "px-2 py-2"
          )}
        >
          <div className={cn("flex items-center gap-1.5", isCollapsed && "flex-col")}>
            {/* Always render CommandPalette so it listens for events */}
            <div className={isCollapsed ? "hidden" : "flex-1"}>
              <CommandPalette orgSlug={slug} />
            </div>
            {/* Collapsed search button */}
            {isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      document.dispatchEvent(new CustomEvent('open-command-palette'));
                    }}
                    className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center">
                  Search
                  <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M3.5 2C2.67157 2 2 2.67157 2 3.5C2 4.32843 2.67157 5 3.5 5H5V3.5C5 2.67157 4.32843 2 3.5 2ZM6 5V3.5C6 2.11929 4.88071 1 3.5 1C2.11929 1 1 2.11929 1 3.5C1 4.88071 2.11929 6 3.5 6H5V10H3.5C2.11929 10 1 11.1193 1 12.5C1 13.8807 2.11929 15 3.5 15C4.88071 15 6 13.8807 6 12.5V11H10V12.5C10 13.8807 11.1193 15 12.5 15C13.8807 15 15 13.8807 15 12.5C15 11.1193 13.8807 10 12.5 10H11V6H12.5C13.8807 6 15 4.88071 15 3.5C15 2.11929 13.8807 1 12.5 1C11.1193 1 10 2.11929 10 3.5V5H6ZM10 6V10H6V6H10ZM11 5V3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5C14 4.32843 13.3284 5 12.5 5H11ZM5 11H3.5C2.67157 11 2 11.6716 2 12.5C2 13.3284 2.67157 14 3.5 14C4.32843 14 5 13.3284 5 12.5V11ZM11 12.5V11H12.5C13.3284 11 14 11.6716 14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5Z"/>
                    </svg>
                    K
                  </span>
                </TooltipContent>
              </Tooltip>
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
