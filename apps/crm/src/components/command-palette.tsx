"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  Search,
  User,
  Users,
  MapPin,
  Map,
  Plus,
  Loader2,
  LayoutDashboard,
  BarChart3,
  Settings,
  ArrowRight,
  Sparkles,
  Clock,
  Zap,
  UserPlus,
  Hash,
  Mail,
  Phone,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";

type EntityType = "booking" | "customer" | "tour" | "schedule" | "guide";

interface SearchResult {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
}

interface CommandPaletteProps {
  orgSlug: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  shortcut: string;
  description?: string;
}

interface QuickAction {
  name: string;
  action: string;
  icon: React.ElementType;
  shortcut?: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

const entityConfig: Record<
  EntityType,
  { icon: React.ElementType; label: string; iconClass: string; bgClass: string }
> = {
  booking: {
    icon: ClipboardList,
    label: "Bookings",
    iconClass: "text-info dark:text-info",
    bgClass: "bg-info/10 dark:bg-info/20",
  },
  customer: {
    icon: User,
    label: "Customers",
    iconClass: "text-success dark:text-success",
    bgClass: "bg-success/10 dark:bg-success/20",
  },
  tour: {
    icon: Map,
    label: "Tours",
    iconClass: "text-info dark:text-info",
    bgClass: "bg-info/10 dark:bg-info/20",
  },
  schedule: {
    icon: Calendar,
    label: "Tour Runs",
    iconClass: "text-warning dark:text-warning",
    bgClass: "bg-warning/10 dark:bg-warning/20",
  },
  guide: {
    icon: Users,
    label: "Guides",
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
  },
};

const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "",
    icon: LayoutDashboard,
    shortcut: "1",
    description: "Overview and metrics",
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    shortcut: "2",
    description: "Schedule view",
  },
  {
    name: "Bookings",
    href: "/bookings",
    icon: ClipboardList,
    shortcut: "3",
    description: "Manage reservations",
  },
  {
    name: "Tours",
    href: "/tours",
    icon: MapPin,
    shortcut: "4",
    description: "Tour catalog",
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    shortcut: "5",
    description: "Customer database",
  },
  {
    name: "Guides",
    href: "/guides",
    icon: User,
    shortcut: "6",
    description: "Guide management",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    shortcut: "7",
    description: "Reports and insights",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    shortcut: "0",
    description: "Configuration",
  },
];

const quickActions: QuickAction[] = [
  {
    name: "New Booking",
    action: "quick-book",
    icon: Zap,
    shortcut: "B",
    description: "Create a reservation",
    iconBg: "bg-info/10 dark:bg-info/20",
    iconColor: "text-info dark:text-info",
  },
  {
    name: "Add Customer",
    action: "new-customer",
    icon: UserPlus,
    description: "Register new customer",
    iconBg: "bg-success/10 dark:bg-success/20",
    iconColor: "text-success dark:text-success",
  },
  {
    name: "Create Tour",
    action: "new-tour",
    icon: Plus,
    description: "Add a new tour",
    iconBg: "bg-info/10 dark:bg-info/20",
    iconColor: "text-info dark:text-info",
  },
];

// Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlight matching text in search results
function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query || query.length < 2) {
    return <span>{text}</span>;
  }

  try {
    const escapedQuery = escapeRegex(query);
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-warning/60 dark:bg-warning/30 text-foreground rounded-sm px-0.5 -mx-0.5"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  } catch {
    // If regex fails for any reason, return plain text
    return <span>{text}</span>;
  }
}

export function CommandPalette({ orgSlug }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isMounted, setIsMounted] = React.useState(false);
  const debouncedSearch = useDebounce(search, 200);
  const { openQuickBooking } = useQuickBookingContext();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Search query
  const { data: searchData, isLoading: isSearching } =
    trpc.search.global.useQuery(
      { query: debouncedSearch, limit: 20 },
      {
        enabled:
          isMounted && debouncedSearch.length >= 2 && open && !!orgSlug,
        staleTime: 30000,
        retry: false,
      }
    );

  // Recent items (only fetch when palette is open and no search)
  const { data: recentData } = trpc.search.recent.useQuery(
    { limit: 6 },
    {
      enabled: isMounted && open && !search && !!orgSlug,
      staleTime: 60000,
    }
  );

  const results: SearchResult[] = React.useMemo(() => {
    if (debouncedSearch.length >= 2 && searchData) {
      return searchData.results;
    }
    return [];
  }, [debouncedSearch, searchData]);

  // Keyboard shortcut to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    // Listen for custom event to open command palette
    const handleOpenCommand = () => setOpen(true);

    document.addEventListener("keydown", down);
    document.addEventListener("open-command-palette", handleOpenCommand);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-palette", handleOpenCommand);
    };
  }, []);

  // Clear search on close
  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const basePath = `/org/${orgSlug}`;

  const navigate = (path: string) => {
    router.push(path as never);
    setOpen(false);
    setSearch("");
  };

  const handleAction = (action: string) => {
    setOpen(false);
    switch (action) {
      case "quick-book":
        openQuickBooking();
        break;
      case "new-customer":
        navigate(`${basePath}/customers/new`);
        break;
      case "new-tour":
        navigate(`${basePath}/tours/new`);
        break;
    }
  };

  const getEntityPath = (type: EntityType, id: string) => {
    const paths: Record<EntityType, string> = {
      booking: `${basePath}/bookings/${id}`,
      customer: `${basePath}/customers/${id}`,
      tour: `${basePath}/tours/${id}`,
      schedule: `${basePath}/command-center`,
      guide: `${basePath}/guides/${id}`,
    };
    return paths[type];
  };

  const groupedResults = React.useMemo(() => {
    const groups: Record<EntityType, SearchResult[]> = {
      booking: [],
      customer: [],
      tour: [],
      schedule: [],
      guide: [],
    };
    results.forEach((result) => {
      groups[result.type].push(result);
    });
    return groups;
  }, [results]);

  const hasResults = results.length > 0;
  const isTyping = search.length > 0 && search.length < 2;
  const showNoResults =
    !isSearching && !hasResults && debouncedSearch.length >= 2;

  // Filter navigation items based on search
  const filteredNavigation = React.useMemo(() => {
    if (!search) return navigationItems;
    const lowerSearch = search.toLowerCase();
    return navigationItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.description?.toLowerCase().includes(lowerSearch)
    );
  }, [search]);

  // Filter quick actions based on search
  const filteredActions = React.useMemo(() => {
    if (!search) return quickActions;
    const lowerSearch = search.toLowerCase();
    return quickActions.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.description.toLowerCase().includes(lowerSearch)
    );
  }, [search]);

  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "Cmd" : "Ctrl";

  return (
    <>
      {/* Search trigger button (shown in nav rail) */}
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm transition-all hover:bg-muted/50 hover:border-border"
      >
        <Search className="h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
        <span className="flex-1 text-left text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
          Search...
        </span>
        <span className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border border-border/50 bg-background/50 px-1.5 text-[10px] font-medium text-muted-foreground/50">
          <svg
            className="h-2.5 w-2.5 opacity-60"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.5 2C2.67157 2 2 2.67157 2 3.5C2 4.32843 2.67157 5 3.5 5H5V3.5C5 2.67157 4.32843 2 3.5 2ZM6 5V3.5C6 2.11929 4.88071 1 3.5 1C2.11929 1 1 2.11929 1 3.5C1 4.88071 2.11929 6 3.5 6H5V10H3.5C2.11929 10 1 11.1193 1 12.5C1 13.8807 2.11929 15 3.5 15C4.88071 15 6 13.8807 6 12.5V11H10V12.5C10 13.8807 11.1193 15 12.5 15C13.8807 15 15 13.8807 15 12.5C15 11.1193 13.8807 10 12.5 10H11V6H12.5C13.8807 6 15 4.88071 15 3.5C15 2.11929 13.8807 1 12.5 1C11.1193 1 10 2.11929 10 3.5V5H6ZM10 6V10H6V6H10ZM11 5V3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5C14 4.32843 13.3284 5 12.5 5H11ZM5 11H3.5C2.67157 11 2 11.6716 2 12.5C2 13.3284 2.67157 14 3.5 14C4.32843 14 5 13.3284 5 12.5V11ZM11 12.5V11H12.5C13.3284 11 14 11.6716 14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5Z"
            />
          </svg>
          K
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search bookings, customers, tours..."
          value={search}
          onValueChange={setSearch}
          showClear={search.length > 0}
          onClear={() => setSearch("")}
        />
        <CommandList>
          {/* Typing hint */}
          {isTyping && (
            <div className="flex flex-col items-center justify-center py-14 px-6">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                Type at least 2 characters to search
              </p>
            </div>
          )}

          {/* Loading state */}
          {isSearching && !hasResults && debouncedSearch.length >= 2 && (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Searching...
              </p>
            </div>
          )}

          {/* No results */}
          {showNoResults && (
            <CommandEmpty>
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No results for &ldquo;{debouncedSearch}&rdquo;
              </p>
              <p className="text-sm text-muted-foreground">
                Try a different search term
              </p>
            </CommandEmpty>
          )}

          {/* Search results */}
          {hasResults && (
            <>
              {Object.entries(groupedResults).map(([type, items]) => {
                if (items.length === 0) return null;
                const config = entityConfig[type as EntityType];
                const Icon = config.icon;

                return (
                  <CommandGroup key={type} heading={config.label}>
                    {items.map((result) => (
                      <CommandItem
                        key={result.id}
                        value={`${result.type}-${result.id}-${result.title}`}
                        onSelect={() =>
                          navigate(getEntityPath(result.type, result.id))
                        }
                        className="group/item"
                      >
                        <div
                          className={`h-8 w-8 rounded-xl ${config.bgClass} flex items-center justify-center ${config.iconClass} shrink-0`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">
                            <HighlightedText
                              text={result.title}
                              query={debouncedSearch}
                            />
                          </span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground/60 truncate flex items-center gap-1.5">
                              {result.type === "customer" &&
                                result.subtitle?.includes("@") && (
                                  <Mail className="h-3 w-3" />
                                )}
                              {result.type === "customer" &&
                                !result.subtitle?.includes("@") &&
                                result.subtitle && (
                                  <Phone className="h-3 w-3" />
                                )}
                              {result.type === "booking" && (
                                <Hash className="h-3 w-3" />
                              )}
                              <HighlightedText
                                text={result.subtitle}
                                query={debouncedSearch}
                              />
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-data-[selected=true]/item:opacity-100 transition-opacity shrink-0" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </>
          )}

          {/* Default menu - when not searching or filtering navigation */}
          {!search && !hasResults && !isTyping && (
            <>
              {/* Quick Actions */}
              <CommandGroup heading="Quick Actions">
                {quickActions.map((action) => (
                  <CommandItem
                    key={action.action}
                    value={`action-${action.action}`}
                    onSelect={() => handleAction(action.action)}
                  >
                    <div
                      className={`h-8 w-8 rounded-xl ${action.iconBg} flex items-center justify-center ${action.iconColor} shrink-0`}
                    >
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium">{action.name}</span>
                      <span className="text-xs text-muted-foreground/60">
                        {action.description}
                      </span>
                    </div>
                    {action.shortcut && (
                      <CommandShortcut>{modKey}+{action.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              {/* Recent Items */}
              {recentData?.results && recentData.results.length > 0 && (
                <>
                  <CommandGroup heading="Recent">
                    {recentData.results.slice(0, 5).map((result) => {
                      const config = entityConfig[result.type];
                      const Icon = config.icon;
                      return (
                        <CommandItem
                          key={`recent-${result.id}`}
                          value={`recent-${result.type}-${result.id}-${result.title}`}
                          onSelect={() =>
                            navigate(getEntityPath(result.type, result.id))
                          }
                          className="group/item"
                        >
                          <div
                            className={`h-8 w-8 rounded-xl ${config.bgClass} flex items-center justify-center ${config.iconClass} shrink-0`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium truncate">
                              {result.title}
                            </span>
                            {result.subtitle && (
                              <span className="text-xs text-muted-foreground/60 truncate">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Navigation */}
              <CommandGroup heading="Navigation">
                {navigationItems.map((item) => (
                  <CommandItem
                    key={item.name}
                    value={`nav-${item.name}`}
                    onSelect={() =>
                      navigate(`${basePath}${item.href}`)
                    }
                  >
                    <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span>{item.name}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground/60">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <CommandShortcut>{modKey}+{item.shortcut}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Filtered navigation when searching matches navigation items */}
          {search &&
            !hasResults &&
            !isTyping &&
            !isSearching &&
            (filteredNavigation.length > 0 || filteredActions.length > 0) && (
              <>
                {filteredActions.length > 0 && (
                  <CommandGroup heading="Quick Actions">
                    {filteredActions.map((action) => (
                      <CommandItem
                        key={action.action}
                        value={`action-${action.action}-${action.name}`}
                        onSelect={() => handleAction(action.action)}
                      >
                        <div
                          className={`h-8 w-8 rounded-xl ${action.iconBg} flex items-center justify-center ${action.iconColor} shrink-0`}
                        >
                          <action.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium">
                            <HighlightedText
                              text={action.name}
                              query={search}
                            />
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            <HighlightedText
                              text={action.description}
                              query={search}
                            />
                          </span>
                        </div>
                        {action.shortcut && (
                          <CommandShortcut>{modKey}+{action.shortcut}</CommandShortcut>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {filteredNavigation.length > 0 && (
                  <CommandGroup heading="Navigation">
                    {filteredNavigation.map((item) => (
                      <CommandItem
                        key={item.name}
                        value={`nav-${item.name}-${item.description}`}
                        onSelect={() =>
                          navigate(`${basePath}${item.href}`)
                        }
                      >
                        <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span>
                            <HighlightedText
                              text={item.name}
                              query={search}
                            />
                          </span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground/60">
                              <HighlightedText
                                text={item.description}
                                query={search}
                              />
                            </span>
                          )}
                        </div>
                        <CommandShortcut>{modKey}+{item.shortcut}</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px]">
                ↓
              </kbd>
              <span className="text-muted-foreground/70">Navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px]">
                ↵
              </kbd>
              <span className="text-muted-foreground/70">Select</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px]">
                esc
              </kbd>
              <span className="text-muted-foreground/70">Close</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/50">
            <Sparkles className="h-3 w-3" />
            <span>Manifest</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
