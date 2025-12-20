"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Palette,
  Users,
  Calendar,
  Bell,
  CreditCard,
  Receipt,
  Activity,
  Settings2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Route } from "next";

interface SettingsNavProps {
  slug: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function SettingsNav({ slug }: SettingsNavProps) {
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      title: "Organization",
      items: [
        {
          label: "General",
          href: `/org/${slug}/settings/general`,
          icon: Building2,
          description: "Business info",
        },
        {
          label: "Branding",
          href: `/org/${slug}/settings/branding`,
          icon: Palette,
          description: "Logo & colors",
        },
        {
          label: "Team",
          href: `/org/${slug}/settings/team`,
          icon: Users,
          description: "Members & roles",
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          label: "Booking Rules",
          href: `/org/${slug}/settings/booking`,
          icon: Calendar,
          description: "Policies & limits",
        },
        {
          label: "Notifications",
          href: `/org/${slug}/settings/notifications`,
          icon: Bell,
          description: "Email & SMS",
        },
      ],
    },
    {
      title: "Finance",
      items: [
        {
          label: "Payments",
          href: `/org/${slug}/settings/payments`,
          icon: CreditCard,
          description: "Stripe setup",
        },
        {
          label: "Tax & Policies",
          href: `/org/${slug}/settings/tax`,
          icon: Receipt,
          description: "Tax & refunds",
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          label: "Service Status",
          href: `/org/${slug}/settings/system`,
          icon: Activity,
          description: "Health checks",
        },
      ],
    },
  ];

  return (
    <nav className="flex h-full flex-col">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
            <Settings2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Settings</h2>
            <p className="text-[11px] text-muted-foreground">Configure your workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div key={section.title}>
              <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all duration-150",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors",
                          isActive
                            ? "bg-primary-foreground/15"
                            : "bg-muted group-hover:bg-background"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary-foreground" : "")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium leading-none",
                          isActive ? "text-primary-foreground" : "text-foreground"
                        )}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className={cn(
                            "mt-0.5 text-[10px] leading-none truncate",
                            isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-primary-foreground/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 p-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <p className="text-[10px] font-medium text-muted-foreground">Need help?</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">
            Check our <span className="text-primary cursor-pointer hover:underline">documentation</span>
          </p>
        </div>
      </div>
    </nav>
  );
}
