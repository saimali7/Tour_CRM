"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  ChevronLeft,
  Inbox,
  Check,
  Clock,
  MapPin,
  Star,
  Baby,
  Cake,
  Accessibility,
  Car,
} from "lucide-react";
import { type HopperBooking } from "./hopper-card";
import { useAdjustMode } from "../adjust-mode";
import type { GuideInfo, GuideTimeline } from "../timeline/types";

// =============================================================================
// TYPES
// =============================================================================

interface MobileHopperSheetProps {
  /** Unassigned bookings to display */
  bookings: HopperBooking[];
  /** Available guide timelines for assignment */
  guideTimelines: GuideTimeline[];
  /** Callback when a booking is assigned to a guide */
  onAssign?: (bookingId: string, guideId: string, guideName: string, timelineIndex: number) => void;
  /** Whether the sheet is loading */
  isLoading?: boolean;
}

interface GuideOptionProps {
  guide: GuideInfo;
  currentGuests: number;
  vehicleCapacity: number;
  timelineIndex: number;
  isSelected: boolean;
  onSelect: () => void;
  bookingGuestCount: number;
}

// =============================================================================
// COMPACT BOOKING CARD FOR MOBILE
// =============================================================================

function MobileBookingCard({
  booking,
  isSelected,
  onSelect,
}: {
  booking: HopperBooking;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const zoneColor = booking.pickupZone?.color || "#6B7280";

  const hasSpecialIndicators =
    booking.isVIP ||
    booking.specialOccasion ||
    booking.accessibilityNeeds ||
    (booking.childCount > 0 || booking.infantCount > 0);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-3 transition-all duration-150",
        "active:scale-[0.98]",
        isSelected
          ? "ring-2 ring-primary border-primary bg-primary/5"
          : "hover:border-border/80 hover:bg-accent/50"
      )}
    >
      {/* Zone indicator + Customer name row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-1 h-8 rounded-full shrink-0"
          style={{ backgroundColor: zoneColor }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {booking.customerName}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {booking.referenceNumber}
          </p>
        </div>

        {/* Guest count badge */}
        <Badge variant="secondary" className="shrink-0 text-xs h-6 px-2">
          <Users className="h-3 w-3 mr-1" />
          {booking.guestCount}
        </Badge>
      </div>

      {/* Tour + Time row */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 pl-3">
        <Clock className="h-3 w-3" />
        <span className="font-mono">{booking.tourTime}</span>
        <span className="text-muted-foreground/50">|</span>
        <span className="truncate">{booking.tourName}</span>
      </div>

      {/* Zone row */}
      {booking.pickupZone && (
        <div className="flex items-center gap-1.5 pl-3">
          <Badge
            variant="outline"
            className="text-[10px] font-medium h-5 px-1.5"
            style={{
              borderColor: zoneColor,
              color: zoneColor,
              backgroundColor: `${zoneColor}10`,
            }}
          >
            <MapPin className="h-2.5 w-2.5 mr-0.5" />
            {booking.pickupZone.name}
          </Badge>

          {/* Special indicators */}
          {hasSpecialIndicators && (
            <div className="flex items-center gap-1 ml-auto">
              {booking.isVIP && (
                <Star className="h-3.5 w-3.5 text-amber-500" />
              )}
              {booking.specialOccasion && (
                <Cake className="h-3.5 w-3.5 text-pink-500" />
              )}
              {booking.accessibilityNeeds && (
                <Accessibility className="h-3.5 w-3.5 text-purple-500" />
              )}
              {(booking.childCount > 0 || booking.infantCount > 0) && (
                <Baby className="h-3.5 w-3.5 text-blue-500" />
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// =============================================================================
// GUIDE OPTION FOR SELECTION
// =============================================================================

function GuideOption({
  guide,
  currentGuests,
  vehicleCapacity,
  isSelected,
  onSelect,
  bookingGuestCount,
}: GuideOptionProps) {
  const willExceedCapacity = currentGuests + bookingGuestCount > vehicleCapacity;
  const newTotal = currentGuests + bookingGuestCount;
  const capacityPercent = Math.min(100, (newTotal / vehicleCapacity) * 100);

  const initials = `${guide.firstName[0] || ""}${guide.lastName[0] || ""}`.toUpperCase();

  return (
    <button
      onClick={onSelect}
      disabled={willExceedCapacity}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-150",
        "active:scale-[0.98]",
        willExceedCapacity
          ? "opacity-50 cursor-not-allowed"
          : isSelected
            ? "ring-2 ring-primary border-primary bg-primary/5"
            : "hover:border-border/80 hover:bg-accent/50"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        {guide.avatarUrl && <AvatarImage src={guide.avatarUrl} alt={`${guide.firstName} ${guide.lastName}`} />}
        <AvatarFallback className="text-xs font-medium bg-muted">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Guide info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">
          {guide.firstName} {guide.lastName}
        </p>

        {/* Capacity bar */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                willExceedCapacity
                  ? "bg-destructive"
                  : capacityPercent > 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(100, (currentGuests / vehicleCapacity) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {currentGuests}/{vehicleCapacity}
          </span>
        </div>
      </div>

      {/* Capacity change indicator */}
      <div className="shrink-0 text-right">
        {willExceedCapacity ? (
          <span className="text-xs text-destructive font-medium">Full</span>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Car className="h-3 w-3" />
            <span className="font-mono">+{bookingGuestCount}</span>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && !willExceedCapacity && (
        <div className="shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

// =============================================================================
// MOBILE HOPPER SHEET COMPONENT
// =============================================================================

export function MobileHopperSheet({
  bookings,
  guideTimelines,
  onAssign,
  isLoading = false,
}: MobileHopperSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<HopperBooking | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  const { enterAdjustMode, isAdjustMode, addPendingChange } = useAdjustMode();

  // Derived state
  const unassignedCount = bookings.length;
  const hasUnassigned = unassignedCount > 0;

  // Determine if we're in booking list view or guide selection view
  const isInGuideSelection = selectedBooking !== null;

  // Guide options with capacity info
  const guideOptions = useMemo(() => {
    return guideTimelines.map((timeline, index) => ({
      guide: timeline.guide,
      currentGuests: timeline.totalGuests,
      vehicleCapacity: timeline.guide.vehicleCapacity,
      timelineIndex: index,
    }));
  }, [guideTimelines]);

  // Handle booking selection - transition to guide selection view
  const handleBookingSelect = useCallback((booking: HopperBooking) => {
    setSelectedBooking(booking);
    setSelectedGuideId(null);
  }, []);

  // Handle going back to booking list
  const handleBackToBookings = useCallback(() => {
    setSelectedBooking(null);
    setSelectedGuideId(null);
  }, []);

  // Handle guide selection and assignment
  const handleGuideSelect = useCallback((guideId: string) => {
    setSelectedGuideId(guideId);
  }, []);

  // Handle confirm assignment
  const handleConfirmAssignment = useCallback(() => {
    if (!selectedBooking || !selectedGuideId) return;

    const selectedGuide = guideOptions.find((g) => g.guide.id === selectedGuideId);
    if (!selectedGuide) return;

    const guideName = `${selectedGuide.guide.firstName} ${selectedGuide.guide.lastName}`;

    // Enter adjust mode if not already in it
    if (!isAdjustMode) {
      enterAdjustMode();
    }

    // Add the pending change (cast to the specific assign type)
    addPendingChange({
      type: "assign" as const,
      bookingId: selectedBooking.id,
      toGuideId: selectedGuideId,
      toGuideName: guideName,
      timelineIndex: selectedGuide.timelineIndex,
      bookingData: {
        customerName: selectedBooking.customerName,
        guestCount: selectedBooking.guestCount,
        tourName: selectedBooking.tourName,
        tourTime: selectedBooking.tourTime,
        pickupZone: selectedBooking.pickupZone,
      },
    } as Omit<import("../adjust-mode").PendingAssignChange, "id" | "timestamp">);

    // Callback for external handling
    onAssign?.(selectedBooking.id, selectedGuideId, guideName, selectedGuide.timelineIndex);

    // Reset state and close if this was the last booking
    setSelectedBooking(null);
    setSelectedGuideId(null);

    // Close sheet if no more bookings (accounting for the one we just assigned)
    if (bookings.length <= 1) {
      setIsOpen(false);
    }
  }, [
    selectedBooking,
    selectedGuideId,
    guideOptions,
    isAdjustMode,
    enterAdjustMode,
    addPendingChange,
    onAssign,
    bookings.length,
  ]);

  // Don't render anything if no unassigned bookings
  if (!hasUnassigned) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button - Only visible on mobile (below lg breakpoint) */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "lg:hidden fixed bottom-6 right-6 z-40",
          "h-14 w-14 rounded-full shadow-lg",
          "flex items-center justify-center",
          "transition-all duration-200",
          "active:scale-95",
          // Amber if critical (has unassigned), subtle otherwise
          hasUnassigned
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : "bg-muted hover:bg-muted/80 text-muted-foreground"
        )}
        aria-label={`${unassignedCount} unassigned booking${unassignedCount !== 1 ? "s" : ""}`}
      >
        <Inbox className="h-6 w-6" />

        {/* Count badge */}
        {hasUnassigned && (
          <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1.5 rounded-full bg-white text-amber-600 text-xs font-bold flex items-center justify-center shadow-sm">
            {unassignedCount}
          </span>
        )}
      </button>

      {/* Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className={cn(
            "rounded-t-2xl px-0 pb-0",
            "max-h-[60vh] h-auto",
            "flex flex-col"
          )}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <SheetHeader className="px-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              {isInGuideSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 -ml-1"
                  onClick={handleBackToBookings}
                  aria-label="Back to bookings"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base">
                  {isInGuideSelection ? "Assign to Guide" : "Unassigned Bookings"}
                </SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  {isInGuideSelection
                    ? `${selectedBooking?.customerName} - ${selectedBooking?.guestCount} guest${selectedBooking?.guestCount !== 1 ? "s" : ""}`
                    : `${unassignedCount} booking${unassignedCount !== 1 ? "s" : ""} need assignment`}
                </SheetDescription>
              </div>

              {!isInGuideSelection && (
                <Badge variant="secondary" className="shrink-0">
                  {unassignedCount}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-4 space-y-2">
              {isInGuideSelection && selectedBooking ? (
                // Guide Selection View
                <>
                  {guideOptions.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No guides available</p>
                    </div>
                  ) : (
                    guideOptions.map((option) => (
                      <GuideOption
                        key={option.guide.id}
                        guide={option.guide}
                        currentGuests={option.currentGuests}
                        vehicleCapacity={option.vehicleCapacity}
                        timelineIndex={option.timelineIndex}
                        isSelected={selectedGuideId === option.guide.id}
                        onSelect={() => handleGuideSelect(option.guide.id)}
                        bookingGuestCount={selectedBooking.guestCount}
                      />
                    ))
                  )}
                </>
              ) : (
                // Booking List View
                <>
                  {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-20 rounded-lg bg-muted/50 animate-pulse"
                      />
                    ))
                  ) : bookings.length === 0 ? (
                    // Empty state
                    <div className="text-center py-8">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                        <Check className="h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="text-sm font-medium text-foreground">All Assigned!</p>
                      <p className="text-xs text-muted-foreground mt-1">Every booking has a guide</p>
                    </div>
                  ) : (
                    bookings.map((booking) => (
                      <MobileBookingCard
                        key={booking.id}
                        booking={booking}
                        isSelected={false}
                        onSelect={() => handleBookingSelect(booking)}
                      />
                    ))
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer with Confirm Button - Only in guide selection mode */}
          {isInGuideSelection && selectedGuideId && (
            <div className="p-4 border-t border-border bg-background">
              <Button
                className="w-full h-12 text-base font-medium"
                onClick={handleConfirmAssignment}
              >
                <Check className="h-5 w-5 mr-2" />
                Assign to {guideOptions.find((g) => g.guide.id === selectedGuideId)?.guide.firstName}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

MobileHopperSheet.displayName = "MobileHopperSheet";
