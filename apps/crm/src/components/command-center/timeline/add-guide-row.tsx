"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Plus, User, Truck, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";

// =============================================================================
// TYPES
// =============================================================================

export interface AvailableGuide {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string | null;
  vehicleCapacity: number;
  vehicleDescription?: string | null;
  isExternal?: boolean;
}

interface AddGuideRowProps {
  /**
   * List of available guides that can be added
   */
  availableGuides: AvailableGuide[];

  /**
   * IDs of guides already on the timeline
   */
  activeGuideIds: Set<string>;

  /**
   * Width of the guide info column in pixels
   * @default 200
   */
  guideColumnWidth?: number;

  /**
   * Callback when a guide is selected to add
   */
  onAddGuide: (guide: AvailableGuide) => void;

  /**
   * Callback to add an external/outsource guide
   */
  onAddExternalGuide?: () => void;

  /**
   * Whether guides are being loaded
   */
  isLoading?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// ADD GUIDE ROW COMPONENT
// =============================================================================

export function AddGuideRow({
  availableGuides,
  activeGuideIds,
  guideColumnWidth = 200,
  onAddGuide,
  onAddExternalGuide,
  isLoading = false,
  className,
}: AddGuideRowProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Filter out guides already on the timeline
  const filteredGuides = React.useMemo(() => {
    return availableGuides
      .filter((guide) => !activeGuideIds.has(guide.id))
      .filter((guide) => {
        if (!search) return true;
        const fullName = `${guide.firstName} ${guide.lastName}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
      });
  }, [availableGuides, activeGuideIds, search]);

  const handleSelectGuide = (guide: AvailableGuide) => {
    onAddGuide(guide);
    setOpen(false);
    setSearch("");
  };

  return (
    <div
      className={cn(
        "group flex min-h-[52px] items-stretch border-t border-dashed border-border/50",
        "hover:bg-muted/20 transition-colors",
        className
      )}
    >
      {/* Left column - Add button */}
      <div
        className="flex flex-shrink-0 items-center justify-center border-r border-dashed border-border/50 px-2"
        style={{ width: `${guideColumnWidth}px` }}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Plus className="h-4 w-4" />
              <span>Add Guide</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="w-72 p-0"
          >
            {/* Search */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search guides..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>

            {/* Guide list */}
            <div className="max-h-[240px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading guides...
                </div>
              ) : filteredGuides.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {search ? "No matching guides" : "All available guides are already assigned"}
                </div>
              ) : (
                <div className="py-1">
                  {filteredGuides.map((guide) => (
                    <button
                      key={guide.id}
                      onClick={() => handleSelectGuide(guide)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-left",
                        "hover:bg-muted transition-colors",
                        "focus:outline-none focus:bg-muted"
                      )}
                    >
                      <UserAvatar
                        name={`${guide.firstName} ${guide.lastName}`}
                        src={guide.avatarUrl}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {guide.firstName} {guide.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Truck className="h-3 w-3" />
                            {guide.vehicleCapacity} seats
                          </span>
                          {guide.isExternal && (
                            <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-medium">
                              External
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add external guide option */}
            {onAddExternalGuide && (
              <div className="border-t p-2">
                <button
                  onClick={() => {
                    onAddExternalGuide();
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm",
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-muted transition-colors"
                  )}
                >
                  <User className="h-4 w-4" />
                  <span>Add External Guide...</span>
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Right side - empty timeline area */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/50">
          Add a guide to assign bookings
        </p>
      </div>
    </div>
  );
}

AddGuideRow.displayName = "AddGuideRow";
