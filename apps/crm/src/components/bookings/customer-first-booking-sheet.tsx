"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  Zap,
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
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Sparkles,
  Ship,
  Car,
  Star,
  TrendingUp,
  Heart,
  Crown,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface CustomerFirstBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  preselectedTourId?: string;
  preselectedCustomerId?: string;
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

type BookingStep = "who-when" | "options" | "add-ons" | "checkout";

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

function formatCurrency(amount: number): string {
  // Amount is in cents
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100);
}

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0] || "";
}

function getBadgeIcon(badge?: string | null) {
  switch (badge) {
    case "BEST_VALUE":
      return <TrendingUp className="h-3.5 w-3.5" />;
    case "RECOMMENDED":
      return <Star className="h-3.5 w-3.5" />;
    case "BEST_FOR_FAMILIES":
      return <Heart className="h-3.5 w-3.5" />;
    case "LUXURY":
      return <Crown className="h-3.5 w-3.5" />;
    case "SAVE_MONEY":
      return <TrendingUp className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function getBadgeColor(badge?: string | null) {
  switch (badge) {
    case "BEST_VALUE":
      return "bg-emerald-100 text-emerald-700";
    case "RECOMMENDED":
      return "bg-primary/10 text-primary";
    case "BEST_FOR_FAMILIES":
      return "bg-pink-100 text-pink-700";
    case "LUXURY":
      return "bg-amber-100 text-amber-700";
    case "SAVE_MONEY":
      return "bg-green-100 text-green-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerFirstBookingSheet({
  open,
  onOpenChange,
  orgSlug,
  preselectedTourId,
  preselectedCustomerId,
}: CustomerFirstBookingSheetProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Current step
  const [step, setStep] = useState<BookingStep>("who-when");

  // Customer
  const [customerMode, setCustomerMode] = useState<"search" | "create">("create");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [newCustomer, setNewCustomer] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Tour & Date
  const [selectedTourId, setSelectedTourId] = useState<string>(preselectedTourId || "");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateScrollOffset, setDateScrollOffset] = useState(0);

  // Guests (WHO - entered FIRST in customer-first flow)
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({ adults: 2, children: 0, infants: 0 });

  // Selected option from availability
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");

  // Extras
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Payment
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate dates
  const dates = useMemo(() => generateDateRange(21), []);
  const visibleDates = dates.slice(dateScrollOffset, dateScrollOffset + 7);

  // Total guests
  const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants;

  // ---------------------------------------------------------------------------
  // RESET ON OPEN
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      setStep("who-when");
      setCustomerMode(preselectedCustomerId ? "search" : "create");
      setCustomerSearch("");
      setSelectedCustomer(null);
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "" });
      setSelectedTourId(preselectedTourId || "");
      setSelectedDate(new Date());
      setDateScrollOffset(0);
      setGuestCounts({ adults: 2, children: 0, infants: 0 });
      setSelectedOptionId("");
      setSelectedScheduleId("");
      setPickupLocation("");
      setNotes("");
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentMethod("card");
      setErrors({});
    }
  }, [open, preselectedCustomerId, preselectedTourId]);

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

  // THE CORE QUERY: Check availability with calculated options
  const {
    data: availabilityData,
    isLoading: availabilityLoading,
    isFetching: availabilityFetching,
  } = trpc.availability.checkAvailability.useQuery(
    {
      tourId: selectedTourId,
      date: getDateString(selectedDate),
      guests: guestCounts,
    },
    {
      enabled: open && !!selectedTourId && step === "options",
    }
  );

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  // Recent customers
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

  // Selected tour
  const selectedTour = useMemo(() => {
    return toursData?.data?.find((t) => t.id === selectedTourId);
  }, [toursData, selectedTourId]);

  // Selected option
  const selectedOption = useMemo(() => {
    if (!availabilityData?.options) return null;
    return availabilityData.options.find((o) => o.id === selectedOptionId);
  }, [availabilityData, selectedOptionId]);

  // Has valid contact
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
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleProceedToOptions = useCallback(() => {
    // Validate customer
    const newErrors: Record<string, string> = {};

    if (customerMode === "create") {
      if (!newCustomer.firstName.trim()) newErrors.firstName = "First name required";
      if (!hasValidContact) newErrors.contact = "Email or phone required";
    } else if (!selectedCustomer) {
      newErrors.customer = "Select a customer";
    }

    if (!selectedTourId) newErrors.tour = "Select a tour";
    if (totalGuests < 1) newErrors.guests = "At least 1 guest required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setStep("options");
    }
  }, [customerMode, newCustomer, selectedCustomer, selectedTourId, totalGuests, hasValidContact]);

  const handleSelectOption = (optionId: string, scheduleId?: string) => {
    setSelectedOptionId(optionId);
    if (scheduleId) {
      setSelectedScheduleId(scheduleId);
    }
    setStep("checkout");
  };

  const handleSubmit = async () => {
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
      } catch (error) {
        // Check if customer already exists - find and use them
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("already exists") && newCustomer.email.trim()) {
          const existingCustomer = customersData?.data?.find(
            (c) => c.email?.toLowerCase() === newCustomer.email.trim().toLowerCase()
          );
          if (existingCustomer) {
            customerId = existingCustomer.id;
            toast.info(`Using existing customer: ${existingCustomer.firstName} ${existingCustomer.lastName}`);
          } else {
            toast.error("Customer exists but couldn't be found. Try using 'Search Existing'.");
            return;
          }
        } else {
          return;
        }
      }
    }

    if (!customerId || !selectedScheduleId) {
      toast.error("Missing required information");
      return;
    }

    // Combine pickup and notes
    const specialRequests = [pickupLocation && `Pickup: ${pickupLocation}`, notes]
      .filter(Boolean)
      .join("\n\n") || undefined;

    try {
      const booking = await createBookingMutation.mutateAsync({
        customerId,
        scheduleId: selectedScheduleId,
        bookingOptionId: selectedOptionId !== "legacy-default" ? selectedOptionId : undefined,
        guestAdults: guestCounts.adults,
        guestChildren: guestCounts.children || undefined,
        guestInfants: guestCounts.infants || undefined,
        pricingSnapshot: selectedOption ? {
          optionId: selectedOption.id,
          optionName: selectedOption.name,
          experienceMode: selectedOption.experienceMode,
          priceBreakdown: selectedOption.priceBreakdown,
        } : undefined,
        adultCount: guestCounts.adults,
        childCount: guestCounts.children || undefined,
        infantCount: guestCounts.infants || undefined,
        subtotal: selectedOption ? (selectedOption.totalPrice.amount / 100).toFixed(2) : "0",
        total: selectedOption ? (selectedOption.totalPrice.amount / 100).toFixed(2) : "0",
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
  // STATE HELPERS
  // ---------------------------------------------------------------------------

  const isSubmitting = createCustomerMutation.isPending || createBookingMutation.isPending;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            {step === "who-when" && "New Booking"}
            {step === "options" && "Choose Your Experience"}
            {step === "checkout" && "Complete Booking"}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {step === "who-when" && "Enter guests and select a date to see available options"}
            {step === "options" && `Prices calculated for ${totalGuests} guest${totalGuests > 1 ? "s" : ""}`}
            {step === "checkout" && "Review and confirm your booking"}
          </SheetDescription>
        </SheetHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* =========================================================== */}
            {/* STEP 1: WHO + WHEN */}
            {/* =========================================================== */}
            {step === "who-when" && (
              <>
                {/* Customer Section */}
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
                      {customerMode === "create" ? "Search Existing" : "New Customer"}
                    </button>
                  </div>

                  {customerMode === "search" ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search by name, email, or phone..."
                          className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>

                      {selectedCustomer && (
                        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {selectedCustomer.firstName[0]}
                              {selectedCustomer.lastName[0] || ""}
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

                      {!selectedCustomer && filteredCustomers.length > 0 && (
                        <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() =>
                                setSelectedCustomer({
                                  id: customer.id,
                                  firstName: customer.firstName,
                                  lastName: customer.lastName,
                                  email: customer.email || "",
                                  phone: customer.phone || "",
                                })
                              }
                              className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                {customer.firstName[0]}
                                {customer.lastName[0] || ""}
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

                      {!selectedCustomer && customerSearch.length < 2 && recentCustomers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Recent
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {recentCustomers.slice(0, 4).map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() =>
                                  setSelectedCustomer({
                                    id: customer.id,
                                    firstName: customer.firstName,
                                    lastName: customer.lastName,
                                    email: customer.email || "",
                                    phone: customer.phone || "",
                                  })
                                }
                                className="px-3 py-1.5 text-sm bg-muted hover:bg-accent rounded-full transition-colors"
                              >
                                {customer.firstName} {customer.lastName?.[0] || ""}.
                              </button>
                            ))}
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
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={newCustomer.firstName}
                            onChange={(e) => setNewCustomer((prev) => ({ ...prev, firstName: e.target.value }))}
                            placeholder="First Name *"
                            className={cn(
                              "w-full px-3 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                              errors.firstName ? "border-destructive" : "border-input"
                            )}
                          />
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
                      {errors.contact ? (
                        <p className="text-xs text-destructive">{errors.contact}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Email or phone required</p>
                      )}
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="Email"
                          className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="tel"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="Phone"
                          className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* Guests Section - WHO FIRST */}
                <section className="space-y-3">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Who&apos;s Coming?
                  </label>

                  <div className="space-y-1 bg-muted/50 rounded-lg border border-border divide-y divide-border overflow-hidden">
                    {/* Adults */}
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-foreground">Adults</p>
                        <p className="text-xs text-muted-foreground">Ages 13+</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setGuestCounts((prev) => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                          disabled={guestCounts.adults <= 1}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{guestCounts.adults}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts((prev) => ({ ...prev, adults: prev.adults + 1 }))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Children */}
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-foreground">Children</p>
                        <p className="text-xs text-muted-foreground">Ages 3-12</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setGuestCounts((prev) => ({ ...prev, children: Math.max(0, prev.children - 1) }))
                          }
                          disabled={guestCounts.children <= 0}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{guestCounts.children}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts((prev) => ({ ...prev, children: prev.children + 1 }))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Infants */}
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-foreground">Infants</p>
                        <p className="text-xs text-muted-foreground">Under 3</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setGuestCounts((prev) => ({ ...prev, infants: Math.max(0, prev.infants - 1) }))
                          }
                          disabled={guestCounts.infants <= 0}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{guestCounts.infants}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCounts((prev) => ({ ...prev, infants: prev.infants + 1 }))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Tour Selection */}
                <section className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Tour</label>
                  <div className="grid grid-cols-1 gap-2">
                    {toursData?.data?.map((tour) => (
                      <button
                        key={tour.id}
                        type="button"
                        onClick={() => setSelectedTourId(tour.id)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                          selectedTourId === tour.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                        )}
                      >
                        {tour.coverImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={tour.coverImageUrl}
                            alt={tour.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
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
                          </div>
                        </div>
                        {selectedTourId === tour.id && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
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

                {/* Date Selection */}
                {selectedTourId && (
                  <section className="space-y-3">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      When?
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDateScrollOffset(Math.max(0, dateScrollOffset - 7))}
                        disabled={dateScrollOffset === 0}
                        className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                              onClick={() => setSelectedDate(date)}
                              className={cn(
                                "flex-1 py-2 px-1 rounded-lg border-2 text-center transition-all",
                                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                                isToday && !isSelected && "bg-accent"
                              )}
                            >
                              <p
                                className={cn(
                                  "text-xs font-medium",
                                  isSelected ? "text-primary" : "text-muted-foreground"
                                )}
                              >
                                {weekday}
                              </p>
                              <p className={cn("text-lg font-bold", isSelected ? "text-primary" : "text-foreground")}>
                                {day}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDateScrollOffset(Math.min(dates.length - 7, dateScrollOffset + 7))}
                        disabled={dateScrollOffset >= dates.length - 7}
                        className="p-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* =========================================================== */}
            {/* STEP 2: OPTIONS */}
            {/* =========================================================== */}
            {step === "options" && (
              <>
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => setStep("who-when")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to details
                </button>

                {/* Summary */}
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{selectedTour?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{totalGuests} guests</p>
                      <p className="text-sm text-muted-foreground">
                        {guestCounts.adults} adults
                        {guestCounts.children > 0 && `, ${guestCounts.children} children`}
                        {guestCounts.infants > 0 && `, ${guestCounts.infants} infants`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Options */}
                {availabilityLoading || availabilityFetching ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-muted-foreground">Calculating your options...</p>
                  </div>
                ) : availabilityData?.soldOut ? (
                  <div className="text-center py-12 bg-muted/50 rounded-lg border border-dashed border-border">
                    <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-medium text-foreground mb-1">Sold Out</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      No availability for this date. Try a nearby date.
                    </p>
                    {availabilityData.alternatives?.nearbyDates?.map((alt) => (
                      <button
                        key={alt.date}
                        type="button"
                        onClick={() => {
                          setSelectedDate(new Date(alt.date));
                        }}
                        className="text-sm text-primary hover:underline mr-3"
                      >
                        {new Date(alt.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availabilityData?.options.map((option) => (
                      <div
                        key={option.id}
                        className={cn(
                          "relative rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md",
                          selectedOptionId === option.id
                            ? "border-primary bg-primary/5 shadow-md"
                            : option.available
                            ? "border-border hover:border-primary/50"
                            : "border-border bg-muted/50 opacity-60"
                        )}
                        onClick={() => {
                          if (option.available && option.scheduling.type === "fixed" && option.scheduling.timeSlots.length > 0) {
                            const availableSlot = option.scheduling.timeSlots.find((s) => s.available);
                            if (availableSlot) {
                              handleSelectOption(option.id, availableSlot.scheduleId);
                            }
                          }
                        }}
                      >
                        {/* Badge */}
                        {option.badge && (
                          <div
                            className={cn(
                              "absolute -top-2 left-4 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1",
                              getBadgeColor(option.badge)
                            )}
                          >
                            {getBadgeIcon(option.badge)}
                            {option.badge.replace("_", " ")}
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {option.experienceMode === "join" && <Users className="h-4 w-4 text-muted-foreground" />}
                              {option.experienceMode === "book" && <Ship className="h-4 w-4 text-muted-foreground" />}
                              {option.experienceMode === "charter" && <Car className="h-4 w-4 text-muted-foreground" />}
                              <span className="font-semibold text-foreground">{option.name}</span>
                            </div>
                            {option.shortDescription && (
                              <p className="text-sm text-muted-foreground mb-2">{option.shortDescription}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{option.priceBreakdown}</p>

                            {/* Comparison */}
                            {option.comparison?.vsShared && (
                              <p className="text-xs text-muted-foreground mt-1">{option.comparison.vsShared.statement}</p>
                            )}

                            {/* Recommendation */}
                            {option.recommendation && (
                              <p className="text-xs text-primary font-medium mt-1">{option.recommendation}</p>
                            )}

                            {/* Time Slots */}
                            {option.scheduling.type === "fixed" && option.scheduling.timeSlots.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {option.scheduling.timeSlots.map((slot) => (
                                  <button
                                    key={slot.scheduleId}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (slot.available) {
                                        handleSelectOption(option.id, slot.scheduleId);
                                      }
                                    }}
                                    disabled={!slot.available}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                      slot.available
                                        ? selectedScheduleId === slot.scheduleId
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted hover:bg-accent"
                                        : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                                    )}
                                  >
                                    {slot.time}
                                    {slot.available && slot.spotsLeft !== undefined && slot.spotsLeft <= 5 && (
                                      <span className="ml-1 text-xs text-orange-600">({slot.spotsLeft} left)</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Right: Price */}
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(option.totalPrice.amount)}</p>
                            {option.urgency && (
                              <p className="text-xs text-orange-600 font-medium mt-1">{option.urgency}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* =========================================================== */}
            {/* STEP 3: CHECKOUT */}
            {/* =========================================================== */}
            {step === "checkout" && selectedOption && (
              <>
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => setStep("options")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to options
                </button>

                {/* Selected Option Summary */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{selectedOption.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedTour?.name}</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(selectedOption.totalPrice.amount)}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <p>{selectedOption.priceBreakdown}</p>
                  </div>
                </div>

                {/* Extras */}
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

                {/* Payment */}
                <section className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordPayment}
                      onChange={(e) => {
                        setRecordPayment(e.target.checked);
                        if (e.target.checked) {
                          setPaymentAmount((selectedOption.totalPrice.amount / 100).toFixed(2));
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
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-card p-4">
          {step === "who-when" && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleProceedToOptions} className="flex-1 bg-primary hover:bg-primary/90">
                See Options
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {step === "options" && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Select a time slot to continue</p>
            </div>
          )}

          {step === "checkout" && selectedOption && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedOption.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalGuests} guest{totalGuests > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(selectedOption.totalPrice.amount)}</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-primary hover:bg-primary/90">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Book Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
