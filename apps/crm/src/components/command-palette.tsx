"use client";

import * as React from "react";
import {
  Calendar,
  ClipboardList,
  Search,
  User,
  Users,
  Map,
  Plus,
  Loader2,
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

// Helper to navigate without strict type checking
function navigateTo(path: string) {
  window.location.href = path;
}

export function CommandPalette({ orgSlug }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Global search query
  const {
    data: searchData,
    isLoading: isSearching,
  } = trpc.search.global.useQuery(
    { query: debouncedSearch, limit: 20 },
    {
      enabled: debouncedSearch.length >= 2 && open,
      staleTime: 30000, // Cache for 30 seconds
    }
  );

  // Recent items query (when no search)
  const { data: recentData } = trpc.search.recent.useQuery(
    { limit: 6 },
    {
      enabled: open && debouncedSearch.length < 2,
      staleTime: 60000, // Cache for 1 minute
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
        setOpen((open) => !open);
      }
      // Additional shortcuts when palette is open
      if (open) {
        if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleQuickAction("new-booking");
        }
        if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleQuickAction("new-customer");
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  // Clear search when closing
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const getIcon = (type: EntityType) => {
    switch (type) {
      case "booking":
        return <ClipboardList className="mr-2 h-4 w-4 shrink-0" />;
      case "customer":
        return <User className="mr-2 h-4 w-4 shrink-0" />;
      case "tour":
        return <Map className="mr-2 h-4 w-4 shrink-0" />;
      case "schedule":
        return <Calendar className="mr-2 h-4 w-4 shrink-0" />;
      case "guide":
        return <Users className="mr-2 h-4 w-4 shrink-0" />;
    }
  };

  const getPath = (type: EntityType, id: string) => {
    const basePath = `/org/${orgSlug}`;
    switch (type) {
      case "booking":
        return `${basePath}/bookings/${id}`;
      case "customer":
        return `${basePath}/customers/${id}`;
      case "tour":
        return `${basePath}/tours/${id}`;
      case "schedule":
        return `${basePath}/schedules/${id}`;
      case "guide":
        return `${basePath}/guides/${id}`;
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigateTo(getPath(result.type, result.id));
    setOpen(false);
    setSearch("");
  };

  const handleQuickAction = (action: string) => {
    const basePath = `/org/${orgSlug}`;
    switch (action) {
      case "new-booking":
        navigateTo(`${basePath}/bookings/new`);
        break;
      case "new-customer":
        navigateTo(`${basePath}/customers/new`);
        break;
      case "new-tour":
        navigateTo(`${basePath}/tours/new`);
        break;
      case "new-schedule":
        navigateTo(`${basePath}/schedules/new`);
        break;
      case "new-guide":
        navigateTo(`${basePath}/guides/new`);
        break;
    }
    setOpen(false);
    setSearch("");
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
  const showRecentItems = !search && recentData?.results && recentData.results.length > 0;

  return (
    <>
      {/* Trigger button for mobile or explicit click */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search bookings, customers, tours..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {/* No search - show quick actions and recent items */}
          {!search && (
            <>
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => handleQuickAction("new-booking")}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Booking
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => handleQuickAction("new-customer")}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Customer
                  <CommandShortcut>⌘N</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => handleQuickAction("new-schedule")}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Schedule
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {/* Recent Items */}
              {showRecentItems && (
                <>
                  <CommandGroup heading="Recent">
                    {recentData.results.map((result) => (
                      <CommandItem
                        key={`recent-${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result)}
                      >
                        {getIcon(result.type)}
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              <CommandGroup heading="Navigation">
                <CommandItem
                  onSelect={() => {
                    navigateTo(`/org/${orgSlug}`);
                    setOpen(false);
                  }}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Dashboard
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    navigateTo(`/org/${orgSlug}/bookings`);
                    setOpen(false);
                  }}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Bookings
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    navigateTo(`/org/${orgSlug}/customers`);
                    setOpen(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Customers
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    navigateTo(`/org/${orgSlug}/tours`);
                    setOpen(false);
                  }}
                >
                  <Map className="mr-2 h-4 w-4" />
                  Tours
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    navigateTo(`/org/${orgSlug}/schedules`);
                    setOpen(false);
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedules
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    navigateTo(`/org/${orgSlug}/guides`);
                    setOpen(false);
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Guides
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {/* Search results */}
          {search && (
            <>
              {/* Loading state */}
              {isSearching && !hasResults && (
                <CommandEmpty>
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                </CommandEmpty>
              )}

              {/* No results */}
              {!isSearching && !hasResults && debouncedSearch.length >= 2 && (
                <CommandEmpty>
                  <div className="py-4 text-center">
                    <p>No results found for &quot;{debouncedSearch}&quot;</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try searching by name, email, or reference number
                    </p>
                  </div>
                </CommandEmpty>
              )}

              {/* Type more characters hint */}
              {!isSearching && search.length < 2 && (
                <CommandEmpty>
                  <div className="py-4 text-center text-muted-foreground">
                    Type at least 2 characters to search
                  </div>
                </CommandEmpty>
              )}

              {/* Search result counts */}
              {hasResults && searchData?.counts && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                  Found: {searchData.counts.bookings} bookings, {searchData.counts.customers} customers,{" "}
                  {searchData.counts.tours} tours, {searchData.counts.schedules} schedules,{" "}
                  {searchData.counts.guides} guides
                </div>
              )}

              {/* Bookings */}
              {groupedResults.booking.length > 0 && (
                <CommandGroup heading="Bookings">
                  {groupedResults.booking.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      {getIcon(result.type)}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Customers */}
              {groupedResults.customer.length > 0 && (
                <CommandGroup heading="Customers">
                  {groupedResults.customer.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      {getIcon(result.type)}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Tours */}
              {groupedResults.tour.length > 0 && (
                <CommandGroup heading="Tours">
                  {groupedResults.tour.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      {getIcon(result.type)}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Schedules */}
              {groupedResults.schedule.length > 0 && (
                <CommandGroup heading="Schedules">
                  {groupedResults.schedule.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      {getIcon(result.type)}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Guides */}
              {groupedResults.guide.length > 0 && (
                <CommandGroup heading="Guides">
                  {groupedResults.guide.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                    >
                      {getIcon(result.type)}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

// Hook for programmatic command palette control
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
