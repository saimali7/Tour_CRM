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
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Search,
  Plus,
  Minus,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
  X,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  // Pre-selection for context-aware booking
  preselectedCustomerId?: string;
  preselectedTourId?: string;
  preselectedScheduleId?: string;
}

interface CustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
}

type PaymentMethod = "cash" | "card" | "bank_transfer" | "check";

// ============================================================================
// HELPERS
// ============================================================================

function generateDateRange(days: number = 14): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
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
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UnifiedBookingSheet({
  open,
  onOpenChange,
  orgSlug,
  preselectedCustomerId,
  preselectedTourId,
  preselectedScheduleId,
}: UnifiedBookingSheetProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Customer - default to create mode since most bookings are new customers
  const [customerMode, setCustomerMode] = useState<"search" | "create">("create");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [newCustomer, setNewCustomer] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Tour & Schedule
  const [selectedTourId, setSelectedTourId] = useState<string>(preselectedTourId || "");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(preselectedScheduleId || "");
  const [dateScrollOffset, setDateScrollOffset] = useState(0);

  // Guests
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({ adults: 1, children: 0, infants: 0 });

  // Extras
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Payment
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // UI state
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  // Generate dates
  const dates = useMemo(() => generateDateRange(21), []);
  const visibleDates = dates.slice(dateScrollOffset, dateScrollOffset + 7);

  // ---------------------------------------------------------------------------
  // RESET ON OPEN
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      // Reset to defaults, but respect preselections
      // Default to create mode (new customer) unless we have a preselected customer
      setCustomerMode(preselectedCustomerId ? "search" : "create");
      setCustomerSearch("");
      setSelectedCustomer(null);
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "" });
      setSelectedTourId(preselectedTourId || "");
      setSelectedDate(new Date());
      setSelectedScheduleId(preselectedScheduleId || "");
      setDateScrollOffset(0);
      setGuestCounts({ adults: 1, children: 0, infants: 0 });
      setPickupLocation("");
      setNotes("");
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentMethod("card");
      setErrors({});
      setTouched({});

      // Focus first name input for new customers, otherwise focus will be handled by auto-select
      if (!preselectedCustomerId) {
        // Small delay to ensure render is complete
        setTimeout(() => {
          const firstNameInput = document.querySelector('input[placeholder="First Name *"]') as HTMLInputElement;
          firstNameInput?.focus();
        }, 150);
      }
    }
  }, [open, preselectedCustomerId, preselectedTourId, preselectedScheduleId]);

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  const { data: toursData } = trpc.tour.list.useQuery(
    { filters: { status: "active" }, pagination: { page: 1, limit: 50 } },
    { enabled: open }
  );

  const { data: customersData } = trpc.customer.list.useQuery(
    { pagination: { page: 1, limit: 100 } },
    { enabled: open }
  );

  const { data: schedulesData, isLoading: schedulesLoading, isFetching: schedulesFetching } = trpc.schedule.list.useQuery(
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

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  // Recent customers (last 5 with bookings)
  const recentCustomers = useMemo(() => {
    if (!customersData?.data) return [];
    return customersData.data.slice(0, 5);
  }, [customersData]);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customersData?.data || customerSearch.length < 2) return [];
    const search = customerSearch.toLowerCase();
    return customersData.data
      .filter(
        (c) =>
          c.firstName.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.phone?.includes(search)
      )
      .slice(0, 6);
  }, [customersData, customerSearch]);

  // Schedule slots for selected date
  const scheduleSlots = useMemo(() => {
    if (!schedulesData?.data) return [];
    return schedulesData.data
      .filter((s) => {
        const scheduleDate = new Date(s.startsAt);
        return (
          scheduleDate.getDate() === selectedDate.getDate() &&
          scheduleDate.getMonth() === selectedDate.getMonth() &&
          scheduleDate.getFullYear() === selectedDate.getFullYear()
        );
      })
      .map((s) => ({
        id: s.id,
        time: formatTime(s.startsAt),
        startsAt: new Date(s.startsAt),
        bookedCount: s.bookedCount || 0,
        maxParticipants: s.maxParticipants || 10,
        available: (s.maxParticipants || 10) - (s.bookedCount || 0),
        // Differentiators for duplicate time slots
        guideName: s.guide ? `${s.guide.firstName}${s.guide.lastName ? ` ${s.guide.lastName.charAt(0)}.` : ''}` : null,
        meetingPoint: s.meetingPoint || null,
      }));
  }, [schedulesData, selectedDate]);

  // Detect duplicate time slots (same time, different schedules)
  const timeSlotCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scheduleSlots.forEach(slot => {
      counts.set(slot.time, (counts.get(slot.time) || 0) + 1);
    });
    return counts;
  }, [scheduleSlots]);

  // Query for next available schedule (when current date has no slots)
  const { data: nextAvailableData } = trpc.schedule.list.useQuery(
    {
      filters: {
        tourId: selectedTourId,
        status: "scheduled",
        hasAvailability: true,
        dateRange: {
          from: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000), // day after selected
          to: new Date(selectedDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days out
        },
      },
      pagination: { page: 1, limit: 1 },
      sort: { field: "startsAt", direction: "asc" },
    },
    {
      enabled: open && !!selectedTourId && !schedulesLoading && scheduleSlots.length === 0,
    }
  );

  // Next available date (when current date has no slots)
  const nextAvailableDate = useMemo(() => {
    if (!nextAvailableData?.data?.[0]) return null;
    return new Date(nextAvailableData.data[0].startsAt);
  }, [nextAvailableData]);

  // Selected tour
  const selectedTour = useMemo(() => {
    return toursData?.data?.find((t) => t.id === selectedTourId);
  }, [toursData, selectedTourId]);

  // Selected schedule
  const selectedSchedule = useMemo(() => {
    return scheduleSlots.find((s) => s.id === selectedScheduleId);
  }, [scheduleSlots, selectedScheduleId]);

  // Pricing calculation
  const pricing = useMemo(() => {
    if (!selectedTour) return { subtotal: 0, total: 0, breakdown: [] as { label: string; count: number; price: number; total: number }[] };

    const basePrice = parseFloat(selectedTour.basePrice || "0");

    // Find pricing tiers
    const adultTier = pricingTiers?.find((t) => t.name === "adult");
    const childTier = pricingTiers?.find((t) => t.name === "child");
    const infantTier = pricingTiers?.find((t) => t.name === "infant");

    const adultPrice = adultTier?.price ? parseFloat(adultTier.price) : basePrice;
    const childPrice = childTier?.price ? parseFloat(childTier.price) : basePrice * 0.5;
    const infantPrice = infantTier?.price ? parseFloat(infantTier.price) : 0;

    const breakdown = [];
    if (guestCounts.adults > 0) {
      breakdown.push({
        label: adultTier?.label || "Adults",
        count: guestCounts.adults,
        price: adultPrice,
        total: guestCounts.adults * adultPrice,
      });
    }
    if (guestCounts.children > 0) {
      breakdown.push({
        label: childTier?.label || "Children",
        count: guestCounts.children,
        price: childPrice,
        total: guestCounts.children * childPrice,
      });
    }
    if (guestCounts.infants > 0) {
      breakdown.push({
        label: infantTier?.label || "Infants",
        count: guestCounts.infants,
        price: infantPrice,
        total: guestCounts.infants * infantPrice,
      });
    }

    const subtotal = breakdown.reduce((sum, item) => sum + item.total, 0);
    return { subtotal, total: subtotal, breakdown };
  }, [selectedTour, pricingTiers, guestCounts]);

  // Total guests
  const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants;

  // Available spots
  const availableSpots = selectedSchedule?.available || 0;

  // Has valid contact (email OR phone required for new customer)
  const hasValidContact = newCustomer.email.trim() || newCustomer.phone.trim();

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

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

  const recordPaymentMutation = trpc.payment.create.useMutation();

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  // Field-level validation for inline feedback
  const validateField = useCallback((field: string): string | null => {
    switch (field) {
      case 'firstName':
        if (customerMode === 'create' && !newCustomer.firstName.trim()) {
          return 'First name required';
        }
        break;
      case 'email':
        if (customerMode === 'create' && newCustomer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
          return 'Invalid email format';
        }
        break;
      case 'contact':
        if (customerMode === 'create' && !hasValidContact) {
          return 'Email or phone required';
        }
        break;
    }
    return null;
  }, [customerMode, newCustomer, hasValidContact]);

  // Run inline validation when touched fields change
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    Object.keys(touched).forEach(field => {
      if (touched[field]) {
        const error = validateField(field);
        if (error) newErrors[field] = error;
      }
    });
    // Only update errors for touched fields, preserve submit-time errors for others
    setErrors(prev => {
      const untouchedErrors: Record<string, string> = {};
      Object.keys(prev).forEach(key => {
        const error = prev[key];
        if (!touched[key] && error) untouchedErrors[key] = error;
      });
      return { ...untouchedErrors, ...newErrors };
    });
  }, [touched, validateField]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Customer validation
    if (customerMode === "create") {
      if (!newCustomer.firstName.trim()) newErrors.firstName = "First name required";
      if (!hasValidContact) newErrors.contact = "Email or phone required";
      // Check email format if provided
      if (newCustomer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
        newErrors.email = "Invalid email format";
      }
    } else if (!selectedCustomer) {
      newErrors.customer = "Select a customer";
    }

    if (!selectedTourId) newErrors.tour = "Select a tour";
    if (!selectedScheduleId) newErrors.schedule = "Select a time slot";
    if (totalGuests < 1) newErrors.guests = "At least 1 guest required";

    // Check availability
    if (selectedSchedule && totalGuests > availableSpots) {
      newErrors.guests = `Only ${availableSpots} spots available`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customerMode, newCustomer, selectedCustomer, selectedTourId, selectedScheduleId, totalGuests, selectedSchedule, availableSpots, hasValidContact]);

  // ---------------------------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!validate()) return;

    let customerId = selectedCustomer?.id;

    // Create customer if new
    if (customerMode === "create") {
      try {
        const customer = await createCustomerMutation.mutateAsync({
          firstName: newCustomer.firstName.trim(),
          lastName: newCustomer.lastName.trim() || "-",
          email: newCustomer.email.trim() || undefined,
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

    // Combine pickup and notes
    const specialRequests = [
      pickupLocation && `Pickup: ${pickupLocation}`,
      notes,
    ].filter(Boolean).join("\n\n") || undefined;

    // Create booking
    try {
      const booking = await createBookingMutation.mutateAsync({
        customerId,
        scheduleId: selectedScheduleId,
        adultCount: guestCounts.adults,
        childCount: guestCounts.children || undefined,
        infantCount: guestCounts.infants || undefined,
        subtotal: pricing.subtotal.toFixed(2),
        total: pricing.total.toFixed(2),
        specialRequests,
        source: "manual",
      });

      // Record payment if requested
      if (recordPayment && paymentAmount && parseFloat(paymentAmount) > 0) {
        try {
          await recordPaymentMutation.mutateAsync({
            bookingId: booking.id,
            amount: paymentAmount,
            method: paymentMethod,
          });
        } catch {
          toast.warning("Booking created but payment recording failed");
        }
      }
    } catch {
      // Error handled by mutation
    }
  };

  // ---------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // STATE HELPERS
  // ---------------------------------------------------------------------------

  const isSubmitting = createCustomerMutation.isPending || createBookingMutation.isPending;
  const canSubmit = (customerMode === "create" ? (newCustomer.firstName.trim() && hasValidContact) : !!selectedCustomer)
    && selectedTourId
    && selectedScheduleId
    && totalGuests > 0
    && totalGuests <= availableSpots;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Quick Book
          </SheetTitle>
          <SheetDescription className="text-sm">
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono">⌘</kbd>
            <span className="mx-1">+</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono">Enter</kbd>
            <span className="ml-1.5">to submit</span>
          </SheetDescription>
        </SheetHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* =========================================================== */}
            {/* CUSTOMER SECTION */}
            {/* =========================================================== */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Customer</label>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode(customerMode === "create" ? "search" : "create");
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {customerMode === "create" ? "Search Existing →" : "← New Customer"}
                </button>
              </div>

              {customerMode === "search" ? (
                <div className="space-y-3">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, email, or phone..."
                      className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Selected customer display */}
                  {selectedCustomer && (
                    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0] || ""}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {selectedCustomer.firstName} {selectedCustomer.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedCustomer.email || selectedCustomer.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="p-1.5 hover:bg-muted rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Search results */}
                  {!selectedCustomer && filteredCustomers.length > 0 && (
                    <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                      {filteredCustomers.map((customer) => (
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
                          className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {customer.firstName[0]}{customer.lastName[0] || ""}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {customer.email || customer.phone || "No contact"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recent customers (when no search) */}
                  {!selectedCustomer && customerSearch.length < 2 && recentCustomers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Recent
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <TooltipProvider delayDuration={300}>
                          {recentCustomers.slice(0, 4).map((customer) => (
                            <Tooltip key={customer.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer({
                                      id: customer.id,
                                      firstName: customer.firstName,
                                      lastName: customer.lastName,
                                      email: customer.email || "",
                                      phone: customer.phone || "",
                                    });
                                  }}
                                  className="px-3 py-1.5 text-sm bg-muted hover:bg-accent rounded-full transition-colors"
                                >
                                  {customer.firstName} {customer.lastName?.[0] || ""}.
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <div className="text-sm">
                                  <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {customer.email || customer.phone || "No contact info"}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>
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
                /* New customer form */
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={newCustomer.firstName}
                        onChange={(e) => setNewCustomer((prev) => ({ ...prev, firstName: e.target.value }))}
                        onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
                        placeholder="First Name *"
                        className={cn(
                          "w-full px-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                          touched.firstName && errors.firstName ? "border-destructive" : "border-input"
                        )}
                      />
                      {touched.firstName && errors.firstName && (
                        <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newCustomer.lastName}
                        onChange={(e) => setNewCustomer((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Last Name"
                        className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  {(touched.contact || touched.email || touched.phone) && errors.contact ? (
                    <p className="text-xs text-destructive">{errors.contact}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Email or phone required</p>
                  )}
                  <div className="space-y-1">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                        onBlur={() => setTouched(prev => ({ ...prev, email: true, contact: true }))}
                        placeholder="Email"
                        className={cn(
                          "w-full pl-10 pr-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                          touched.email && errors.email ? "border-destructive" :
                          (touched.contact && errors.contact && !hasValidContact) ? "border-destructive" : "border-input"
                        )}
                      />
                    </div>
                    {touched.email && errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                      onBlur={() => setTouched(prev => ({ ...prev, phone: true, contact: true }))}
                      placeholder="Phone"
                      className={cn(
                        "w-full pl-10 pr-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                        (touched.contact && errors.contact && !hasValidContact) ? "border-destructive" : "border-input"
                      )}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* =========================================================== */}
            {/* TOUR SECTION */}
            {/* =========================================================== */}
            <section className="space-y-3">
              <label className="text-sm font-medium text-foreground">Tour</label>
              <div className="grid grid-cols-1 gap-2">
                {toursData?.data?.map((tour) => (
                  <button
                    key={tour.id}
                    type="button"
                    onClick={() => {
                      setSelectedTourId(tour.id);
                      setSelectedScheduleId("");
                    }}
                    className={cn(
                      "w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                      selectedTourId === tour.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    {tour.coverImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={tour.coverImageUrl} alt={tour.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{tour.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {tour.durationMinutes}min
                        </span>
                        <span className="font-medium text-primary">${parseFloat(tour.basePrice).toFixed(0)}</span>
                      </div>
                    </div>
                    {selectedTourId === tour.id && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {errors.tour && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.tour}
                </p>
              )}
            </section>

            {/* =========================================================== */}
            {/* DATE SECTION */}
            {/* =========================================================== */}
            {selectedTourId && (
              <section className="space-y-3">
                <label className="text-sm font-medium text-foreground">Date</label>
                <div className="flex items-center gap-1">
                  {/* Week back button */}
                  <button
                    type="button"
                    onClick={() => setDateScrollOffset(Math.max(0, dateScrollOffset - 7))}
                    disabled={dateScrollOffset === 0}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous week"
                  >
                    <div className="flex">
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronLeft className="h-4 w-4 -ml-2.5" />
                    </div>
                  </button>
                  {/* Day back button */}
                  <button
                    type="button"
                    onClick={() => setDateScrollOffset(Math.max(0, dateScrollOffset - 1))}
                    disabled={dateScrollOffset === 0}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous day"
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
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50",
                            isToday && !isSelected && "bg-accent"
                          )}
                        >
                          <p className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                            {weekday}
                          </p>
                          <p className={cn("text-lg font-bold", isSelected ? "text-primary" : "text-foreground")}>
                            {day}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {/* Day forward button */}
                  <button
                    type="button"
                    onClick={() => setDateScrollOffset(Math.min(dates.length - 7, dateScrollOffset + 1))}
                    disabled={dateScrollOffset >= dates.length - 7}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {/* Week forward button */}
                  <button
                    type="button"
                    onClick={() => setDateScrollOffset(Math.min(dates.length - 7, dateScrollOffset + 7))}
                    disabled={dateScrollOffset >= dates.length - 7}
                    className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next week"
                  >
                    <div className="flex">
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-2.5" />
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* =========================================================== */}
            {/* TIME SLOTS SECTION */}
            {/* =========================================================== */}
            {selectedTourId && (
              <section className="space-y-3">
                <label className="text-sm font-medium text-foreground">Time</label>
                {(schedulesLoading || schedulesFetching) ? (
                  /* Loading skeleton */
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="p-3 rounded-lg border-2 border-border animate-pulse">
                        <div className="h-5 w-16 bg-muted rounded mx-auto mb-1" />
                        <div className="h-3 w-12 bg-muted rounded mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : scheduleSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {scheduleSlots.map((slot) => {
                      const isFull = slot.available <= 0;
                      const isLow = slot.available > 0 && slot.available <= 5;
                      const isSelected = selectedScheduleId === slot.id;
                      const hasDuplicates = (timeSlotCounts.get(slot.time) || 0) > 1;
                      const differentiator = hasDuplicates
                        ? (slot.guideName || slot.meetingPoint || `${slot.maxParticipants} max`)
                        : null;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => !isFull && setSelectedScheduleId(slot.id)}
                          disabled={isFull}
                          className={cn(
                            "p-3 rounded-lg border-2 text-center transition-all",
                            isFull
                              ? "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                              : isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <p className={cn("font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                            {slot.time}
                          </p>
                          {differentiator && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-full px-1">
                              {differentiator}
                            </p>
                          )}
                          <p
                            className={cn(
                              "text-xs mt-0.5 font-medium",
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
                  <div className="py-6 text-center bg-muted/50 rounded-lg border border-dashed border-border">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No slots on this date</p>
                    {nextAvailableDate ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(nextAvailableDate);
                          // Calculate scroll offset to show the date
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const daysDiff = Math.floor((nextAvailableDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
                          setDateScrollOffset(Math.min(Math.max(0, daysDiff - 3), dates.length - 7));
                          setSelectedScheduleId("");
                        }}
                        className="text-xs text-primary hover:underline mt-2 font-medium"
                      >
                        Next available: {nextAvailableDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Try another date</p>
                    )}
                  </div>
                )}
                {errors.schedule && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.schedule}
                  </p>
                )}
              </section>
            )}

            {/* =========================================================== */}
            {/* GUESTS SECTION */}
            {/* =========================================================== */}
            {selectedScheduleId && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Guests</label>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    availableSpots > 5 ? "bg-emerald-100 text-emerald-700" :
                    availableSpots > 0 ? "bg-orange-100 text-orange-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {availableSpots} spots left
                  </span>
                </div>

                <div className="space-y-1 bg-muted/50 rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {/* Adults */}
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-foreground">Adults</p>
                      <p className="text-xs text-muted-foreground">Ages 13+</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {formatCurrency(pricing.breakdown.find(b => b.label.includes("Adult"))?.price || parseFloat(selectedTour?.basePrice || "0"))}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGuestCounts(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                          disabled={guestCounts.adults <= 1}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{guestCounts.adults}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts(prev => ({ ...prev, adults: prev.adults + 1 }))}
                          disabled={totalGuests >= availableSpots}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-foreground">Children</p>
                      <p className="text-xs text-muted-foreground">Ages 3-12</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {formatCurrency(pricing.breakdown.find(b => b.label.includes("Child"))?.price || parseFloat(selectedTour?.basePrice || "0") * 0.5)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGuestCounts(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                          disabled={guestCounts.children <= 0}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{guestCounts.children}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts(prev => ({ ...prev, children: prev.children + 1 }))}
                          disabled={totalGuests >= availableSpots}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Infants */}
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-foreground">Infants</p>
                      <p className="text-xs text-muted-foreground">Under 3</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-16 text-right">Free</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGuestCounts(prev => ({ ...prev, infants: Math.max(0, prev.infants - 1) }))}
                          disabled={guestCounts.infants <= 0}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{guestCounts.infants}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts(prev => ({ ...prev, infants: prev.infants + 1 }))}
                          disabled={totalGuests >= availableSpots}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible price breakdown */}
                {pricing.breakdown.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                      className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {showPriceBreakdown ? 'Hide' : 'Show'} price breakdown
                      <ChevronDown className={cn("h-3 w-3 transition-transform", showPriceBreakdown && "rotate-180")} />
                    </button>

                    {showPriceBreakdown && (
                      <div className="p-3 bg-muted/30 rounded-lg space-y-1.5 text-sm">
                        {pricing.breakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-muted-foreground">
                              {item.count}× {item.label}
                            </span>
                            <span className="font-medium">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                        <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between font-semibold">
                          <span>Total</span>
                          <span className="text-primary">{formatCurrency(pricing.total)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {totalGuests > availableSpots && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Only {availableSpots} spots available
                  </p>
                )}
              </section>
            )}

            {/* =========================================================== */}
            {/* EXTRAS SECTION */}
            {/* =========================================================== */}
            {selectedScheduleId && (
              <section className="space-y-3">
                <label className="text-sm font-medium text-foreground">Details (optional)</label>
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Pickup location / hotel"
                      className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special requests, dietary needs..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                  />
                </div>
              </section>
            )}

            {/* =========================================================== */}
            {/* PAYMENT SECTION */}
            {/* =========================================================== */}
            {selectedScheduleId && (
              <section className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordPayment}
                    onChange={(e) => {
                      setRecordPayment(e.target.checked);
                      if (e.target.checked) {
                        setPaymentAmount(pricing.total.toFixed(2));
                      }
                    }}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Record payment now</span>
                </label>

                {recordPayment && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Method</label>
                      <div className="flex flex-wrap gap-2">
                        {(["card", "cash", "bank_transfer", "check"] as PaymentMethod[]).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                              paymentMethod === method
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-input hover:bg-accent"
                            )}
                          >
                            {method === "bank_transfer" ? "Bank" : method.charAt(0).toUpperCase() + method.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

          </div>
        </div>

        {/* =========================================================== */}
        {/* FOOTER */}
        {/* =========================================================== */}
        <div className="border-t border-border bg-card p-4 space-y-4">
          {/* Price Summary */}
          {selectedTourId && selectedScheduleId && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">{selectedTour?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {selectedSchedule && ` at ${selectedSchedule.time}`}
                  {` · ${totalGuests} guest${totalGuests > 1 ? "s" : ""}`}
                </p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(pricing.total)}
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
              disabled={isSubmitting || !canSubmit}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Book{pricing.total > 0 ? ` · ${formatCurrency(pricing.total)}` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
