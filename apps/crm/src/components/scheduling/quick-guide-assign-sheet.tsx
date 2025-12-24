"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  User,
  Users,
  ExternalLink,
  Check,
  Search,
  Phone,
  Mail,
  Loader2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Guide {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: "active" | "inactive" | "pending";
}

interface ScheduleInfo {
  id: string;
  tourName: string;
  date: string;
  time: string;
}

interface QuickGuideAssignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  scheduleInfo?: ScheduleInfo;
  availableGuides?: Guide[];
  onSuccess?: () => void;
}

type GuideType = "team" | "external";

// ─────────────────────────────────────────────────────────────────────────────
// Guide Avatar Component
// ─────────────────────────────────────────────────────────────────────────────

function GuideAvatar({
  firstName,
  lastName,
  className
}: {
  firstName: string;
  lastName: string;
  className?: string;
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  // Generate a consistent color based on the name
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-indigo-500 to-blue-500",
  ];
  const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br shadow-sm",
        colors[colorIndex],
        className
      )}
    >
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guide Type Toggle Component
// ─────────────────────────────────────────────────────────────────────────────

function GuideTypeToggle({
  value,
  onChange,
}: {
  value: GuideType;
  onChange: (value: GuideType) => void;
}) {
  return (
    <div className="relative flex items-center p-1 bg-muted/50 rounded-lg border border-border">
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] bg-background rounded-md shadow-sm border border-border/50 transition-all duration-300 ease-out",
          value === "team" ? "left-1" : "left-[calc(50%+2px)]"
        )}
      />

      <button
        type="button"
        onClick={() => onChange("team")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-md transition-colors duration-200",
          value === "team"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/70"
        )}
      >
        <Users className="w-4 h-4" />
        <span>Team Guide</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("external")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-md transition-colors duration-200",
          value === "external"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/70"
        )}
      >
        <ExternalLink className="w-4 h-4" />
        <span>External Guide</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guide List Item Component
// ─────────────────────────────────────────────────────────────────────────────

function GuideListItem({
  guide,
  isSelected,
  onSelect,
}: {
  guide: Guide;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-border/80 hover:bg-accent/50"
      )}
    >
      <GuideAvatar firstName={guide.firstName} lastName={guide.lastName} />

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {guide.firstName} {guide.lastName}
          </span>
          {guide.status === "active" && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </div>
        <span className="text-sm text-muted-foreground truncate block">
          {guide.email}
        </span>
      </div>

      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function QuickGuideAssignSheet({
  open,
  onOpenChange,
  bookingId,
  scheduleInfo,
  availableGuides = [],
  onSuccess,
}: QuickGuideAssignSheetProps) {
  const utils = trpc.useUtils();

  // Form state
  const [guideType, setGuideType] = React.useState<GuideType>("team");
  const [selectedGuideId, setSelectedGuideId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [externalName, setExternalName] = React.useState("");
  const [externalContact, setExternalContact] = React.useState("");
  const [autoConfirm, setAutoConfirm] = React.useState(true);

  // Reset form when sheet opens/closes
  React.useEffect(() => {
    if (!open) {
      setGuideType("team");
      setSelectedGuideId(null);
      setSearchQuery("");
      setExternalName("");
      setExternalContact("");
      setAutoConfirm(true);
    }
  }, [open]);

  // Filter guides based on search
  const filteredGuides = React.useMemo(() => {
    if (!searchQuery.trim()) return availableGuides;

    const query = searchQuery.toLowerCase();
    return availableGuides.filter(
      (guide) =>
        guide.firstName.toLowerCase().includes(query) ||
        guide.lastName.toLowerCase().includes(query) ||
        guide.email.toLowerCase().includes(query)
    );
  }, [availableGuides, searchQuery]);

  // Mutations
  const assignTeamGuideMutation = trpc.guideAssignment.assignGuideToBooking.useMutation({
    onSuccess: () => {
      toast.success("Guide assigned successfully", {
        description: "The guide has been notified of their assignment.",
      });
      utils.guideAssignment.invalidate();
      utils.booking.invalidate();
      utils.schedule.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to assign guide", {
        description: error.message,
      });
    },
  });

  const assignExternalGuideMutation = trpc.guideAssignment.assignOutsourcedGuideToBooking.useMutation({
    onSuccess: () => {
      toast.success("External guide assigned", {
        description: `${externalName} has been added to this booking.`,
      });
      utils.guideAssignment.invalidate();
      utils.booking.invalidate();
      utils.schedule.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to assign external guide", {
        description: error.message,
      });
    },
  });

  const isSubmitting = assignTeamGuideMutation.isPending || assignExternalGuideMutation.isPending;

  const canSubmit =
    (guideType === "team" && selectedGuideId) ||
    (guideType === "external" && externalName.trim().length > 0);

  const handleSubmit = () => {
    if (guideType === "team" && selectedGuideId) {
      assignTeamGuideMutation.mutate({
        bookingId,
        guideId: selectedGuideId,
        options: { autoConfirm },
      });
    } else if (guideType === "external" && externalName.trim()) {
      assignExternalGuideMutation.mutate({
        bookingId,
        outsourcedGuideName: externalName.trim(),
        outsourcedGuideContact: externalContact.trim() || undefined,
        options: { autoConfirm },
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[440px] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold tracking-tight">
                  Assign Guide
                </SheetTitle>
                <SheetDescription className="text-sm">
                  {scheduleInfo
                    ? `${scheduleInfo.tourName} - ${scheduleInfo.date}`
                    : "Select a guide for this booking"
                  }
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Guide Type Toggle */}
          <GuideTypeToggle value={guideType} onChange={setGuideType} />

          {/* Team Guide Selection */}
          <div
            className={cn(
              "space-y-4 transition-all duration-300",
              guideType === "team"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 h-0 overflow-hidden"
            )}
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-border/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Guide List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {filteredGuides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? "No guides found" : "No guides available"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {searchQuery
                      ? "Try a different search term"
                      : "Add guides in Settings"
                    }
                  </p>
                </div>
              ) : (
                filteredGuides.map((guide) => (
                  <GuideListItem
                    key={guide.id}
                    guide={guide}
                    isSelected={selectedGuideId === guide.id}
                    onSelect={() => setSelectedGuideId(guide.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* External Guide Form */}
          <div
            className={cn(
              "space-y-4 transition-all duration-300",
              guideType === "external"
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 h-0 overflow-hidden"
            )}
          >
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  External guides are freelancers or contractors not in your team roster.
                  They won&apos;t receive system notifications.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="external-name" className="text-sm font-medium">
                  Guide Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="external-name"
                    placeholder="Enter guide's full name"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="external-contact" className="text-sm font-medium">
                  Contact <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="external-contact"
                    placeholder="Phone or email"
                    value={externalContact}
                    onChange={(e) => setExternalContact(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Auto-confirm Option */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
            <Checkbox
              id="auto-confirm"
              checked={autoConfirm}
              onCheckedChange={(checked) => setAutoConfirm(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="auto-confirm"
                className="text-sm font-medium cursor-pointer"
              >
                Auto-confirm assignment
              </Label>
              <p className="text-xs text-muted-foreground">
                {guideType === "team"
                  ? "Skip the pending state and confirm immediately"
                  : "Mark external guide as confirmed right away"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Assign Guide</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
