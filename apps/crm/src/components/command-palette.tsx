"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  Search,
  User,
  Users,
  Map,
  Plus,
  Loader2,
  LayoutDashboard,
  Tag,
  BarChart3,
  Settings,
  ArrowRight,
  Sparkles,
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

const entityConfig: Record<EntityType, { icon: React.ElementType; label: string; iconClass: string; bgClass: string }> = {
  booking: { icon: ClipboardList, label: "Bookings", iconClass: "text-blue-600", bgClass: "bg-blue-500/15" },
  customer: { icon: User, label: "Customers", iconClass: "text-emerald-600", bgClass: "bg-emerald-500/15" },
  tour: { icon: Map, label: "Tours", iconClass: "text-purple-600", bgClass: "bg-purple-500/15" },
  schedule: { icon: Calendar, label: "Schedules", iconClass: "text-orange-600", bgClass: "bg-orange-500/15" },
  guide: { icon: Users, label: "Guides", iconClass: "text-pink-600", bgClass: "bg-pink-500/15" },
};

export function CommandPalette({ orgSlug }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isMounted, setIsMounted] = React.useState(false);
  const debouncedSearch = useDebounce(search, 300);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: searchData, isLoading: isSearching } =
    trpc.search.global.useQuery(
      { query: debouncedSearch, limit: 20 },
      {
        enabled: isMounted && debouncedSearch.length >= 2 && open && !!orgSlug,
        staleTime: 30000,
        retry: false,
      }
    );

  const results: SearchResult[] = React.useMemo(() => {
    if (debouncedSearch.length >= 2 && searchData) {
      return searchData.results;
    }
    return [];
  }, [debouncedSearch, searchData]);

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

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const basePath = `/org/${orgSlug}`;

  const navigate = (path: string) => {
    router.push(path as never);
    setOpen(false);
    setSearch("");
  };

  const getEntityPath = (type: EntityType, id: string) => {
    const paths: Record<EntityType, string> = {
      booking: `${basePath}/bookings/${id}`,
      customer: `${basePath}/customers/${id}`,
      tour: `${basePath}/tours/${id}`,
      schedule: `${basePath}/availability/${id}`,
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
  const showNoResults = !isSearching && !hasResults && debouncedSearch.length >= 2;

  return (
    <>
      {/* Search trigger */}
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm transition-all hover:bg-muted/50 hover:border-border"
      >
        <Search className="h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
        <span className="flex-1 text-left text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
          Search...
        </span>
        <span className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border border-border/50 bg-background/50 px-1.5 text-[10px] font-medium text-muted-foreground/50">
          <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M3.5 2C2.67157 2 2 2.67157 2 3.5C2 4.32843 2.67157 5 3.5 5H5V3.5C5 2.67157 4.32843 2 3.5 2ZM6 5V3.5C6 2.11929 4.88071 1 3.5 1C2.11929 1 1 2.11929 1 3.5C1 4.88071 2.11929 6 3.5 6H5V10H3.5C2.11929 10 1 11.1193 1 12.5C1 13.8807 2.11929 15 3.5 15C4.88071 15 6 13.8807 6 12.5V11H10V12.5C10 13.8807 11.1193 15 12.5 15C13.8807 15 15 13.8807 15 12.5C15 11.1193 13.8807 10 12.5 10H11V6H12.5C13.8807 6 15 4.88071 15 3.5C15 2.11929 13.8807 1 12.5 1C11.1193 1 10 2.11929 10 3.5V5H6ZM10 6V10H6V6H10ZM11 5V3.5C11 2.67157 11.6716 2 12.5 2C13.3284 2 14 2.67157 14 3.5C14 4.32843 13.3284 5 12.5 5H11ZM5 11H3.5C2.67157 11 2 11.6716 2 12.5C2 13.3284 2.67157 14 3.5 14C4.32843 14 5 13.3284 5 12.5V11ZM11 12.5V11H12.5C13.3284 11 14 11.6716 14 12.5C14 13.3284 13.3284 14 12.5 14C11.6716 14 11 13.3284 11 12.5Z"/>
          </svg>
          K
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search anything..."
          value={search}
          onValueChange={setSearch}
          showClear={search.length > 0}
          onClear={() => setSearch("")}
        />
        <CommandList>
          {/* Typing hint */}
          {isTyping && (
            <div className="flex flex-col items-center justify-center py-14 px-6">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Type at least 2 characters to search
              </p>
            </div>
          )}

          {/* Loading state */}
          {isSearching && !hasResults && (
            <div className="flex flex-col items-center justify-center py-14">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          )}

          {/* No results */}
          {showNoResults && (
            <CommandEmpty>
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No results found</p>
              <p className="text-sm text-muted-foreground">
                Try searching for something else
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
                        onSelect={() => navigate(getEntityPath(result.type, result.id))}
                        className="group/item"
                      >
                        <div className={`h-8 w-8 rounded-xl ${config.bgClass} flex items-center justify-center ${config.iconClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground/60 truncate">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-data-[selected=true]/item:opacity-100 transition-opacity" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </>
          )}

          {/* Default menu - Quick actions & Navigation */}
          {!search && (
            <>
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => navigate(`${basePath}/bookings?phone=1`)}>
                  <div className="h-8 w-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Phone Booking</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/bookings/new`)}>
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-600">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-medium">New Booking (Full Form)</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/customers/new`)}>
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-medium">New Customer</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/availability/new`)}>
                  <div className="h-8 w-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-600">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-medium">New Schedule</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Go to">
                <CommandItem onSelect={() => navigate(basePath)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <span>Dashboard</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/bookings`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <span>Bookings</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/customers`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <span>Customers</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/availability`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span>Availability</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/tours`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Map className="h-4 w-4" />
                  </div>
                  <span>Tours</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/guides`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                  <span>Guides</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/promo-codes`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Tag className="h-4 w-4" />
                  </div>
                  <span>Promo Codes</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/reports`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <span>Reports</span>
                </CommandItem>
                <CommandItem onSelect={() => navigate(`${basePath}/settings`)}>
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span>Settings</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 items-center rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px]">↑</kbd>
              <kbd className="inline-flex h-5 items-center rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-5 items-center rounded-md border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px]">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/70">
            <Sparkles className="h-3 w-3" />
            <span>Tour CRM</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
