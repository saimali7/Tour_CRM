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
import { Input } from "@/components/ui/input";
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
  WandSparkles,
  ArrowRightLeft,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { formatTimeDisplay } from "../timeline/timeline-utils";
import { type HopperBooking } from "./hopper-card";
import type { GuideInfo, GuideTimeline } from "../timeline/types";

interface MobileAssignedRun {
  id: string;
  guideId: string;
  guideName: string;
  tourName: string;
  startTime: string;
  endTime: string;
  guestCount: number;
}

interface MobileHopperSheetProps {
  bookings: HopperBooking[];
  guideTimelines: GuideTimeline[];
  assignedRuns?: MobileAssignedRun[];
  onAssign?: (bookingId: string, guideId: string, guideName: string, timelineIndex: number) => Promise<void> | void;
  onReassignRun?: (runId: string, fromGuideId: string, toGuideId: string) => Promise<void> | void;
  onNudgeRun?: (runId: string, guideId: string, deltaMinutes: number) => Promise<void> | void;
  isLoading?: boolean;
  isReadOnly?: boolean;
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

function MobileBookingCard({
  booking,
  onSelect,
  onBestFit,
  isBusy,
}: {
  booking: HopperBooking;
  onSelect: () => void;
  onBestFit: () => void;
  isBusy: boolean;
}) {
  const zoneColor = booking.pickupZone?.color || "#6B7280";

  const hasSpecialIndicators =
    booking.isVIP ||
    booking.specialOccasion ||
    booking.accessibilityNeeds ||
    (booking.childCount > 0 || booking.infantCount > 0);

  return (
    <div className="w-full rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-primary/25">
      <button onClick={onSelect} className="w-full text-left">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: zoneColor }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{booking.customerName}</p>
            <p className="font-mono text-xs text-muted-foreground">{booking.referenceNumber}</p>
          </div>

          <Badge variant="secondary" className="h-6 shrink-0 px-2 text-xs">
            <Users className="mr-1 h-3 w-3" />
            {booking.guestCount}
          </Badge>
        </div>

        <div className="mb-1.5 flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-mono">{booking.tourTime}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="truncate">{booking.tourName}</span>
        </div>

        {booking.pickupZone && (
          <div className="flex items-center gap-1.5 pl-3">
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-medium"
              style={{
                borderColor: zoneColor,
                color: zoneColor,
                backgroundColor: `${zoneColor}10`,
              }}
            >
              <MapPin className="mr-0.5 h-2.5 w-2.5" />
              {booking.pickupZone.name}
            </Badge>

            {hasSpecialIndicators && (
              <div className="ml-auto flex items-center gap-1">
                {booking.isVIP && <Star className="h-3.5 w-3.5 text-warning" />}
                {booking.specialOccasion && <Cake className="h-3.5 w-3.5 text-primary" />}
                {booking.accessibilityNeeds && <Accessibility className="h-3.5 w-3.5 text-info" />}
                {(booking.childCount > 0 || booking.infantCount > 0) && <Baby className="h-3.5 w-3.5 text-info" />}
              </div>
            )}
          </div>
        )}
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Tap card to pick guide</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onBestFit}
          disabled={isBusy}
        >
          <WandSparkles className="h-3 w-3" />
          Best Fit
        </Button>
      </div>
    </div>
  );
}

function GuideOption({
  guide,
  currentGuests,
  vehicleCapacity,
  isSelected,
  onSelect,
  bookingGuestCount,
}: GuideOptionProps) {
  const willExceedCapacity = currentGuests + bookingGuestCount > vehicleCapacity;
  const capacityPercent = Math.min(100, (currentGuests / Math.max(vehicleCapacity, 1)) * 100);

  const initials = `${guide.firstName[0] || ""}${guide.lastName[0] || ""}`.toUpperCase();

  return (
    <button
      onClick={onSelect}
      disabled={willExceedCapacity}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-150",
        "active:scale-[0.98]",
        willExceedCapacity
          ? "cursor-not-allowed opacity-50"
          : isSelected
            ? "border-primary bg-primary/5 ring-2 ring-primary"
            : "hover:border-border/80 hover:bg-accent/50"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        {guide.avatarUrl && <AvatarImage src={guide.avatarUrl} alt={`${guide.firstName} ${guide.lastName}`} />}
        <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-foreground">
          {guide.firstName} {guide.lastName}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                capacityPercent > 90 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {currentGuests}/{vehicleCapacity}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        {willExceedCapacity ? (
          <span className="text-xs font-medium text-destructive">Full</span>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Car className="h-3 w-3" />
            <span className="font-mono">+{bookingGuestCount}</span>
          </div>
        )}
      </div>

      {isSelected && !willExceedCapacity && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function AssignedRunCard({
  run,
  guideOptions,
  moveTarget,
  onMoveTargetChange,
  onMove,
  onNudge,
  isBusy,
}: {
  run: MobileAssignedRun;
  guideOptions: Array<{ id: string; label: string }>;
  moveTarget: string;
  onMoveTargetChange: (value: string) => void;
  onMove: () => void;
  onNudge: (deltaMinutes: number) => void;
  isBusy: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{run.tourName}</p>
          <p className="text-xs text-muted-foreground">
            {formatTimeDisplay(run.startTime)} - {formatTimeDisplay(run.endTime)} • {run.guestCount} guests
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Guide: {run.guideName}</p>
        </div>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          {run.guestCount}p
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1 rounded-md border bg-muted/30 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onNudge(-15)}
            disabled={isBusy}
          >
            <Minus className="h-3 w-3" />
            <span className="sr-only">Nudge earlier by 15 minutes</span>
          </Button>
          <span className="px-1 text-[11px] font-medium text-muted-foreground">15m</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onNudge(15)}
            disabled={isBusy}
          >
            <Plus className="h-3 w-3" />
            <span className="sr-only">Nudge later by 15 minutes</span>
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
            value={moveTarget}
            onChange={(event) => onMoveTargetChange(event.target.value)}
            disabled={isBusy}
          >
            <option value="">Move to guide</option>
            {guideOptions
              .filter((option) => option.id !== run.guideId)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={onMove}
            disabled={!moveTarget || isBusy}
          >
            <ArrowRightLeft className="h-3 w-3" />
            Move
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MobileHopperSheet({
  bookings,
  guideTimelines,
  assignedRuns = [],
  onAssign,
  onReassignRun,
  onNudgeRun,
  isLoading = false,
  isReadOnly = false,
}: MobileHopperSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "runs">("queue");
  const [selectedBooking, setSelectedBooking] = useState<HopperBooking | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [queueSearch, setQueueSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [runMoveTargets, setRunMoveTargets] = useState<Record<string, string>>({});

  const unassignedCount = bookings.length;
  const hasUnassigned = unassignedCount > 0;
  const hasAssignedRuns = assignedRuns.length > 0;
  const queueGuestCount = useMemo(
    () => bookings.reduce((sum, booking) => sum + booking.guestCount, 0),
    [bookings]
  );
  const assignedGuestCount = useMemo(
    () => assignedRuns.reduce((sum, run) => sum + run.guestCount, 0),
    [assignedRuns]
  );

  const filteredBookings = useMemo(() => {
    const term = queueSearch.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter((booking) => {
      return (
        booking.customerName.toLowerCase().includes(term) ||
        booking.referenceNumber.toLowerCase().includes(term) ||
        booking.tourName.toLowerCase().includes(term) ||
        booking.tourTime.toLowerCase().includes(term) ||
        booking.pickupZone?.name.toLowerCase().includes(term)
      );
    });
  }, [bookings, queueSearch]);

  const guideOptions = useMemo(() => {
    return guideTimelines.map((timeline, index) => ({
      guide: timeline.guide,
      currentGuests: timeline.totalGuests,
      vehicleCapacity: timeline.guide.vehicleCapacity,
      timelineIndex: index,
    }));
  }, [guideTimelines]);

  const guideOptionLabels = useMemo(
    () =>
      guideOptions.map((option) => ({
        id: option.guide.id,
        label: `${option.guide.firstName} ${option.guide.lastName}`,
      })),
    [guideOptions]
  );

  const handleBookingSelect = useCallback((booking: HopperBooking) => {
    setSelectedBooking(booking);
    setSelectedGuideId(null);
  }, []);

  const handleBackToBookings = useCallback(() => {
    setSelectedBooking(null);
    setSelectedGuideId(null);
  }, []);

  const handleGuideSelect = useCallback((guideId: string) => {
    setSelectedGuideId(guideId);
  }, []);

  const handleConfirmAssignment = useCallback(async () => {
    if (!selectedBooking || !selectedGuideId) return;

    const selectedGuide = guideOptions.find((g) => g.guide.id === selectedGuideId);
    if (!selectedGuide) return;

    const guideName = `${selectedGuide.guide.firstName} ${selectedGuide.guide.lastName}`;

    try {
      setIsSubmitting(true);
      await onAssign?.(selectedBooking.id, selectedGuideId, guideName, selectedGuide.timelineIndex);
      setSelectedBooking(null);
      setSelectedGuideId(null);
      if (bookings.length <= 1) {
        setIsOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, selectedGuideId, guideOptions, onAssign, bookings.length]);

  const handleBestFitAssignment = useCallback(
    async (booking: HopperBooking) => {
      const candidates = guideOptions
        .map((option) => ({
          ...option,
          projectedGuests: option.currentGuests + booking.guestCount,
        }))
        .filter((option) => option.projectedGuests <= option.vehicleCapacity)
        .sort((a, b) => a.vehicleCapacity - a.projectedGuests - (b.vehicleCapacity - b.projectedGuests));

      const best = candidates[0];
      if (!best) return;

      const guideName = `${best.guide.firstName} ${best.guide.lastName}`;
      setIsSubmitting(true);
      try {
        await onAssign?.(booking.id, best.guide.id, guideName, best.timelineIndex);
      } finally {
        setIsSubmitting(false);
      }
    },
    [guideOptions, onAssign]
  );

  const handleRunNudge = useCallback(
    async (runId: string, guideId: string, deltaMinutes: number) => {
      if (!onNudgeRun) return;
      try {
        setBusyRunId(runId);
        await onNudgeRun(runId, guideId, deltaMinutes);
      } finally {
        setBusyRunId(null);
      }
    },
    [onNudgeRun]
  );

  const handleRunMove = useCallback(
    async (runId: string, fromGuideId: string) => {
      const targetGuideId = runMoveTargets[runId];
      if (!targetGuideId || !onReassignRun) return;
      try {
        setBusyRunId(runId);
        await onReassignRun(runId, fromGuideId, targetGuideId);
      } finally {
        setBusyRunId(null);
      }
    },
    [onReassignRun, runMoveTargets]
  );

  if (isReadOnly || (!hasUnassigned && !hasAssignedRuns)) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full border px-4 shadow-lg transition-all duration-200 active:scale-95 lg:hidden",
          hasUnassigned
            ? "border-warning/40 bg-warning text-warning-foreground hover:bg-warning"
            : "border-border bg-card text-foreground hover:bg-muted/80"
        )}
        aria-label={`${unassignedCount} unassigned booking${unassignedCount !== 1 ? "s" : ""}`}
      >
        <Inbox className="h-4 w-4" />
        <span className="text-sm font-semibold">Queue</span>
        {hasUnassigned && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-warning shadow-sm">
            {unassignedCount}
          </span>
        )}
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="flex h-auto max-h-[78vh] flex-col rounded-t-2xl px-0 pb-0">
          <div className="flex justify-center pb-1 pt-2">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="border-b border-border px-4 pb-3">
            <div className="flex items-center gap-3">
              {selectedBooking && activeTab === "queue" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-1 h-8 w-8 p-0"
                  onClick={handleBackToBookings}
                  aria-label="Back to bookings"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base">
                  {activeTab === "runs" ? "Assigned Runs" : selectedBooking ? "Assign to Guide" : "Unassigned Bookings"}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-xs">
                  {activeTab === "runs"
                    ? `${assignedRuns.length} run${assignedRuns.length !== 1 ? "s" : ""} assigned`
                    : selectedBooking
                      ? `${selectedBooking.customerName} - ${selectedBooking.guestCount} guest${selectedBooking.guestCount !== 1 ? "s" : ""}`
                      : `${unassignedCount} booking${unassignedCount !== 1 ? "s" : ""} need assignment`}
                </SheetDescription>
              </div>

              {activeTab === "queue" && !selectedBooking && (
                <Badge variant="secondary" className="shrink-0">
                  {filteredBookings.length}/{unassignedCount}
                </Badge>
              )}
            </div>

            {!selectedBooking && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-muted/20 px-2 py-1.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Queue</p>
                  <p className="text-xs font-semibold tabular-nums text-foreground">{unassignedCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-2 py-1.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Guests</p>
                  <p className="text-xs font-semibold tabular-nums text-foreground">{queueGuestCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-2 py-1.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Assigned</p>
                  <p className="text-xs font-semibold tabular-nums text-foreground">{assignedGuestCount}</p>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-1 rounded-md bg-muted/40 p-1">
              <button
                type="button"
                className={cn(
                  "h-7 flex-1 rounded text-xs font-medium",
                  activeTab === "queue" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
                onClick={() => {
                  setActiveTab("queue");
                  setSelectedBooking(null);
                }}
              >
                Queue
              </button>
              <button
                type="button"
                className={cn(
                  "h-7 flex-1 rounded text-xs font-medium",
                  activeTab === "runs" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
                onClick={() => {
                  setActiveTab("runs");
                  setSelectedBooking(null);
                }}
              >
                Assigned
              </button>
            </div>

            {activeTab === "queue" && !selectedBooking && (
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Search name, ref, tour, time..."
                  className="h-9 pl-9 text-sm"
                />
              </div>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="space-y-2 p-4">
              {activeTab === "queue" ? (
                selectedBooking ? (
                  guideOptions.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
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
                  )
                ) : isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/50" />
                  ))
                ) : bookings.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                      <Check className="h-5 w-5 text-success" />
                    </div>
                    <p className="text-sm font-medium text-foreground">All Assigned</p>
                    <p className="mt-1 text-xs text-muted-foreground">Every booking has a guide</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="py-8 text-center">
                    <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No matching bookings</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try another search term</p>
                  </div>
                ) : (
                  filteredBookings.map((booking) => (
                    <MobileBookingCard
                      key={booking.id}
                      booking={booking}
                      onSelect={() => handleBookingSelect(booking)}
                      onBestFit={() => void handleBestFitAssignment(booking)}
                      isBusy={isSubmitting}
                    />
                  ))
                )
              ) : assignedRuns.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No assigned runs yet</p>
                </div>
              ) : (
                assignedRuns.map((run) => (
                  <AssignedRunCard
                    key={run.id}
                    run={run}
                    guideOptions={guideOptionLabels}
                    moveTarget={runMoveTargets[run.id] ?? ""}
                    onMoveTargetChange={(value) =>
                      setRunMoveTargets((prev) => ({
                        ...prev,
                        [run.id]: value,
                      }))
                    }
                    onMove={() => void handleRunMove(run.id, run.guideId)}
                    onNudge={(deltaMinutes) => void handleRunNudge(run.id, run.guideId, deltaMinutes)}
                    isBusy={busyRunId === run.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {activeTab === "queue" && selectedBooking && selectedGuideId && (
            <div className="border-t border-border bg-background p-4">
              <Button
                className="h-12 w-full text-base font-medium"
                onClick={() => void handleConfirmAssignment()}
                disabled={isSubmitting}
              >
                <Check className="mr-2 h-5 w-5" />
                {isSubmitting
                  ? "Assigning..."
                  : `Assign to ${guideOptions.find((g) => g.guide.id === selectedGuideId)?.guide.firstName}`}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

MobileHopperSheet.displayName = "MobileHopperSheet";
