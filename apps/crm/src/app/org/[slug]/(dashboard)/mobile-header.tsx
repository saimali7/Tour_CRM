"use client";

import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/sidebar-nav";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/sidebar-context";

interface MobileHeaderProps {
  organization: { name: string };
  slug: string;
}

export function MobileHeader({ organization, slug }: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          {organization.name.charAt(0).toUpperCase()}
        </div>
        <p className="flex-1 text-sm font-semibold text-foreground truncate">
          {organization.name}
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-xl">
            {/* Drawer header */}
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                  {organization.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {organization.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="border-b border-border px-3 py-3">
              <CommandPalette orgSlug={slug} />
            </div>

            {/* Navigation - wrap in provider with expanded state */}
            <SidebarProvider defaultState="expanded">
              <div className="flex-1 overflow-y-auto" onClick={() => setIsOpen(false)}>
                <SidebarNav orgSlug={slug} />
              </div>
            </SidebarProvider>
          </div>
        </div>
      )}
    </>
  );
}
