"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Search,
  Plus,
  Minus,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PhoneBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
}

interface CustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface ScheduleSlot {
  id: string;
  time: string;
  startsAt: Date;
  bookedCount: number;
  maxParticipants: number;
  available: number;
}

// Generate dates for next 14 days
function generateDateRange(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDateLabel(date: Date): { day: string; weekday: string; isToday: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();

  return {
    day: date.getDate().toString(),
    weekday: isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" }),
    isToday,
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function PhoneBookingSheet({ open, onOpenChange, orgSlug }: PhoneBookingSheetProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [customerMode, setCustomerMode] = useState<"search" | "create">("search");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [newCustomer, setNewCustomer] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [guestCount, setGuestCount] = useState(1);
  const [dateScrollOffset, setDateScrollOffset] = useState(0);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate dates
  const dates = useMemo(() => generateDateRange(), []);
  const visibleDates = dates.slice(dateScrollOffset, dateScrollOffset + 7);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCustomerMode("search");
      setCustomerSearch("");
      setSelectedCustomer(null);
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "" });
      setSelectedTourId("");
      setSelectedDate(new Date());
      setSelectedScheduleId("");
      setGuestCount(1);
      setDateScrollOffset(0);
      setNotes("");
      setErrors({});
      // Focus search input after a short delay
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Queries
  const { data: toursData } = trpc.tour.list.useQuery(
    { filters: { status: "active" }, pagination: { page: 1, limit: 50 } },
    { enabled: open }
  );

  const { data: customersData } = trpc.customer.list.useQuery(
    { pagination: { page: 1, limit: 100 } },
    { enabled: open && customerMode === "search" && customerSearch.length > 0 }
  );

  const { data: schedulesData } = trpc.schedule.list.useQuery(
    {
      filters: {
        tourId: selectedTourId,
        status: "scheduled",
        hasAvailability: true,
        dateRange: {
          from: selectedDate,
          to: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      pagination: { page: 1, limit: 50 },
      sort: { field: "startsAt", direction: "asc" },
    },
    { enabled: open && !!selectedTourId }
  );

  const { data: pricingTiers } = trpc.tour.listPricingTiers.useQuery(
    { tourId: selectedTourId },
    { enabled: open && !!selectedTourId }
  );

  // Filtered customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customersData?.data || customerSearch.length < 2) return [];
    const search = customerSearch.toLowerCase();
    return customersData.data
      .filter(
        (c: { firstName: string; lastName: string; email: string | null; phone: string | null }) =>
          c.firstName.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.phone?.includes(search)
      )
      .slice(0, 5);
  }, [customersData, customerSearch]);

  // Schedule slots for selected date
  const scheduleSlots: ScheduleSlot[] = useMemo(() => {
    if (!schedulesData?.data) return [];
    return schedulesData.data
      .filter((s: { startsAt: Date | string }) => {
        const scheduleDate = new Date(s.startsAt);
        return (
          scheduleDate.getDate() === selectedDate.getDate() &&
          scheduleDate.getMonth() === selectedDate.getMonth() &&
          scheduleDate.getFullYear() === selectedDate.getFullYear()
        );
      })
      .map((s: { id: string; startsAt: Date | string; bookedCount: number | null; maxParticipants: number | null }) => ({
        id: s.id,
        time: formatTime(new Date(s.startsAt)),
        startsAt: new Date(s.startsAt),
        bookedCount: s.bookedCount || 0,
        maxParticipants: s.maxParticipants || 10,
        available: (s.maxParticipants || 10) - (s.bookedCount || 0),
      }));
  }, [schedulesData, selectedDate]);

  // Calculate price
  const calculatedPrice = useMemo(() => {
    if (!pricingTiers || pricingTiers.length === 0) return 0;
    // Use first tier or look for one labeled "adult"
    const adultTier = pricingTiers.find((t: { label: string }) => t.label.toLowerCase().includes("adult")) || pricingTiers[0];
    return guestCount * parseFloat(adultTier?.price || "0");
  }, [pricingTiers, guestCount]);

  // Selected tour
  const selectedTour = useMemo(() => {
    return toursData?.data?.find((t: { id: string }) => t.id === selectedTourId);
  }, [toursData, selectedTourId]);

  // Selected schedule
  const selectedSchedule = useMemo(() => {
    return scheduleSlots.find((s) => s.id === selectedScheduleId);
  }, [scheduleSlots, selectedScheduleId]);

  // Mutations
  const createCustomerMutation = trpc.customer.create.useMutation();
  const createBookingMutation = trpc.booking.create.useMutation({
    onSuccess: (booking) => {
      utils.booking.list.invalidate();
      utils.schedule.list.invalidate();
      toast.success("Booking created successfully!");
      onOpenChange(false);
      router.push(`/org/${orgSlug}/bookings/${booking.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Customer validation
    if (customerMode === "create") {
      if (!newCustomer.firstName.trim()) newErrors.firstName = "Required";
      if (!newCustomer.lastName.trim()) newErrors.lastName = "Required";
      if (!newCustomer.email.trim()) {
        newErrors.email = "Required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
        newErrors.email = "Invalid email";
      }
    } else if (!selectedCustomer) {
      newErrors.customer = "Select a customer";
    }

    if (!selectedTourId) newErrors.tour = "Select a tour";
    if (!selectedScheduleId) newErrors.schedule = "Select a time slot";
    if (guestCount < 1) newErrors.guests = "At least 1 guest required";

    // Check availability
    if (selectedSchedule && guestCount > selectedSchedule.available) {
      newErrors.guests = `Only ${selectedSchedule.available} spots available`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customerMode, newCustomer, selectedCustomer, selectedTourId, selectedScheduleId, guestCount, selectedSchedule]);

  // Submit booking
  const handleSubmit = async () => {
    if (!validate()) return;

    let customerId = selectedCustomer?.id;

    // Create customer if new
    if (customerMode === "create") {
      try {
        const customer = await createCustomerMutation.mutateAsync({
          firstName: newCustomer.firstName.trim(),
          lastName: newCustomer.lastName.trim(),
          email: newCustomer.email.trim().toLowerCase(),
          phone: newCustomer.phone.trim() || undefined,
        });
        customerId = customer.id;
      } catch {
        return;
      }
    }

    if (!customerId) {
      toast.error("Customer is required");
      return;
    }

    // Create booking
    createBookingMutation.mutate({
      customerId,
      scheduleId: selectedScheduleId,
      adultCount: guestCount,
      childCount: 0,
      infantCount: 0,
      source: "phone",
      internalNotes: notes.trim() || undefined,
    });
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && open) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleSubmit]);

  const isSubmitting = createCustomerMutation.isPending || createBookingMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-blue-600" />
              Phone Booking
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Quick booking for phone orders • <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘+Enter</kbd> to submit
            </p>
          </SheetHeader>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* CUSTOMER SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Customer</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode(customerMode === "search" ? "create" : "search");
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {customerMode === "search" ? "+ New Customer" : "Search Existing"}
                  </button>
                </div>

                {customerMode === "search" ? (
                  <div className="space-y-2">
                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Selected customer display */}
                    {selectedCustomer && (
                      <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">
                            {selectedCustomer.firstName} {selectedCustomer.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(null)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    )}

                    {/* Search results */}
                    {!selectedCustomer && filteredCustomers.length > 0 && (
                      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                        {filteredCustomers.map((customer: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer({
                                id: customer.id,
                                firstName: customer.firstName,
                                lastName: customer.lastName,
                                email: customer.email || "",
                                phone: customer.phone || "",
                              });
                              setCustomerSearch("");
                            }}
                            className="w-full p-3 text-left hover:bg-muted transition-colors"
                          >
                            <p className="font-medium text-foreground">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {customer.email} {customer.phone && `• ${customer.phone}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {errors.customer && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.customer}
                      </p>
                    )}
                  </div>
                ) : (
                  /* Inline customer create form */
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <input
                        type="text"
                        value={newCustomer.firstName}
                        onChange={(e) => setNewCustomer((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="First Name *"
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                          errors.firstName ? "border-destructive" : "border-input"
                        )}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newCustomer.lastName}
                        onChange={(e) => setNewCustomer((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Last Name *"
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                          errors.lastName ? "border-destructive" : "border-input"
                        )}
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Email *"
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                          errors.email ? "border-destructive" : "border-input"
                        )}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone"
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* TOUR SECTION */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Tour</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {toursData?.data?.map((tour: { id: string; name: string; durationMinutes: number | null }) => (
                    <button
                      key={tour.id}
                      type="button"
                      onClick={() => {
                        setSelectedTourId(tour.id);
                        setSelectedScheduleId("");
                      }}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        selectedTourId === tour.id
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-border hover:border-blue-500/50"
                      )}
                    >
                      <p className="font-medium text-foreground text-sm truncate">{tour.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tour.durationMinutes ? `${tour.durationMinutes} min` : "Duration TBD"}
                      </p>
                    </button>
                  ))}
                </div>
                {errors.tour && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.tour}
                  </p>
                )}
              </div>

              {/* DATE SECTION */}
              {selectedTourId && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Date</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDateScrollOffset(Math.max(0, dateScrollOffset - 1))}
                      disabled={dateScrollOffset === 0}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 flex gap-1">
                      {visibleDates.map((date) => {
                        const { day, weekday, isToday } = formatDateLabel(date);
                        const isSelected = date.toDateString() === selectedDate.toDateString();
                        return (
                          <button
                            key={date.toISOString()}
                            type="button"
                            onClick={() => {
                              setSelectedDate(date);
                              setSelectedScheduleId("");
                            }}
                            className={cn(
                              "flex-1 py-2 px-1 rounded-lg border-2 text-center transition-all",
                              isSelected
                                ? "border-blue-500 bg-blue-500/5"
                                : "border-border hover:border-blue-500/50",
                              isToday && !isSelected && "bg-muted"
                            )}
                          >
                            <p className={cn("text-xs", isSelected ? "text-blue-600" : "text-muted-foreground")}>
                              {weekday}
                            </p>
                            <p className={cn("text-lg font-bold", isSelected ? "text-blue-600" : "text-foreground")}>
                              {day}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDateScrollOffset(Math.min(dates.length - 7, dateScrollOffset + 1))}
                      disabled={dateScrollOffset >= dates.length - 7}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TIME SLOTS SECTION */}
              {selectedTourId && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Time Slot</label>
                  {scheduleSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {scheduleSlots.map((slot) => {
                        const isFull = slot.available <= 0;
                        const isLow = slot.available > 0 && slot.available <= 5;
                        const isSelected = selectedScheduleId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => !isFull && setSelectedScheduleId(slot.id)}
                            disabled={isFull}
                            className={cn(
                              "p-3 rounded-lg border-2 text-center transition-all",
                              isFull
                                ? "border-border bg-muted opacity-50 cursor-not-allowed"
                                : isSelected
                                ? "border-blue-500 bg-blue-500/5"
                                : "border-border hover:border-blue-500/50"
                            )}
                          >
                            <p className={cn("font-medium", isSelected ? "text-blue-600" : "text-foreground")}>
                              {slot.time}
                            </p>
                            <p
                              className={cn(
                                "text-xs mt-1",
                                isFull
                                  ? "text-destructive"
                                  : isLow
                                  ? "text-orange-600"
                                  : "text-emerald-600"
                              )}
                            >
                              {isFull ? "Full" : `${slot.available} left`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-lg">
                      No available slots for this date
                    </p>
                  )}
                  {errors.schedule && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.schedule}
                    </p>
                  )}
                </div>
              )}

              {/* GUESTS SECTION */}
              {selectedScheduleId && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Guests</label>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">Number of Guests</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                        className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-lg font-bold text-foreground">{guestCount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const max = selectedSchedule?.available || 10;
                          setGuestCount(Math.min(max, guestCount + 1));
                        }}
                        className="h-8 w-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {errors.guests && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.guests}
                    </p>
                  )}
                </div>
              )}

              {/* NOTES SECTION */}
              {selectedScheduleId && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special requests, pickup location, etc."
                    rows={2}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="border-t border-border bg-card p-4 space-y-4">
            {/* Price Summary */}
            {selectedTourId && selectedScheduleId && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedTour?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {selectedSchedule && ` at ${selectedSchedule.time}`}
                    {` • ${guestCount} guest${guestCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${calculatedPrice.toFixed(2)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Booking
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
