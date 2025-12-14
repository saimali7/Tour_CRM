"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Clock,
  Users,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Minus,
  Calendar,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Simplified 3-step flow
type BookingStep = "tour" | "schedule" | "book";

const STEPS: { id: BookingStep; label: string }[] = [
  { id: "tour", label: "Tour" },
  { id: "schedule", label: "When & Guests" },
  { id: "book", label: "Book" },
];

interface NewBookingFlowProps {
  preselectedTourId?: string;
  preselectedScheduleId?: string;
  preselectedCustomerId?: string;
}

export function NewBookingFlow({
  preselectedTourId,
  preselectedScheduleId,
  preselectedCustomerId,
}: NewBookingFlowProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const utils = trpc.useUtils();

  // Current step
  const [currentStep, setCurrentStep] = useState<BookingStep>(
    preselectedScheduleId ? "book" : preselectedTourId ? "schedule" : "tour"
  );

  // Form state
  const [selectedTourId, setSelectedTourId] = useState<string>(preselectedTourId || "");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(preselectedScheduleId || "");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [guestCounts, setGuestCounts] = useState({ adults: 1, children: 0, infants: 0 });
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    preselectedCustomerId ? "existing" : "new"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || "");
  const [newCustomer, setNewCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Queries
  const { data: toursData, isLoading: toursLoading } = trpc.tour.list.useQuery({
    filters: { status: "active" },
    pagination: { page: 1, limit: 100 },
  });

  const { data: schedulesData, isLoading: schedulesLoading } = trpc.schedule.list.useQuery(
    {
      filters: { tourId: selectedTourId, status: "scheduled", hasAvailability: true },
      pagination: { page: 1, limit: 100 },
      sort: { field: "startsAt", direction: "asc" },
    },
    { enabled: !!selectedTourId }
  );

  const { data: customersData, isLoading: customersLoading } = trpc.customer.list.useQuery({
    pagination: { page: 1, limit: 100 },
  });

  const { data: pricingTiers } = trpc.tour.listPricingTiers.useQuery(
    { tourId: selectedTourId },
    { enabled: !!selectedTourId }
  );

  // Mutations
  const createCustomerMutation = trpc.customer.create.useMutation();
  const createBookingMutation = trpc.booking.create.useMutation({
    onSuccess: (booking) => {
      utils.booking.list.invalidate();
      utils.schedule.list.invalidate();
      toast.success("Booking created successfully!");
      router.push(`/org/${slug}/bookings/${booking.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });

  // Computed values
  const selectedTour = useMemo(
    () => toursData?.data.find((t) => t.id === selectedTourId),
    [toursData?.data, selectedTourId]
  );

  const selectedSchedule = useMemo(
    () => schedulesData?.data.find((s) => s.id === selectedScheduleId),
    [schedulesData?.data, selectedScheduleId]
  );

  const selectedCustomer = useMemo(
    () => customersData?.data.find((c) => c.id === selectedCustomerId),
    [customersData?.data, selectedCustomerId]
  );

  // Schedule type for the map
  type ScheduleItem = NonNullable<typeof schedulesData>["data"][number];

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    if (!schedulesData?.data) return new Map<string, ScheduleItem[]>();
    const map = new Map<string, ScheduleItem[]>();
    schedulesData.data.forEach((schedule) => {
      const dateKey = new Date(schedule.startsAt).toDateString();
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, schedule]);
    });
    return map;
  }, [schedulesData?.data]);

  // Pricing calculation
  const pricing = useMemo(() => {
    if (!selectedSchedule) return { subtotal: 0, total: 0, breakdown: [] as { label: string; count: number; price: number; total: number }[] };

    const basePrice = parseFloat(selectedSchedule.price || selectedTour?.basePrice || "0");

    const adultPrice = pricingTiers?.find(t => t.name === "adult")?.price
      ? parseFloat(pricingTiers.find(t => t.name === "adult")!.price)
      : basePrice;
    const childPrice = pricingTiers?.find(t => t.name === "child")?.price
      ? parseFloat(pricingTiers.find(t => t.name === "child")!.price)
      : basePrice * 0.5;
    const infantPrice = pricingTiers?.find(t => t.name === "infant")?.price
      ? parseFloat(pricingTiers.find(t => t.name === "infant")!.price)
      : 0;

    const breakdown = [];
    if (guestCounts.adults > 0) {
      breakdown.push({ label: "Adults", count: guestCounts.adults, price: adultPrice, total: guestCounts.adults * adultPrice });
    }
    if (guestCounts.children > 0) {
      breakdown.push({ label: "Children", count: guestCounts.children, price: childPrice, total: guestCounts.children * childPrice });
    }
    if (guestCounts.infants > 0) {
      breakdown.push({ label: "Infants", count: guestCounts.infants, price: infantPrice, total: guestCounts.infants * infantPrice });
    }

    const subtotal = breakdown.reduce((sum, item) => sum + item.total, 0);
    return { subtotal, total: subtotal, breakdown };
  }, [selectedSchedule, selectedTour, pricingTiers, guestCounts]);

  // Total guests
  const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants;

  // Available spots
  const availableSpots = selectedSchedule
    ? selectedSchedule.maxParticipants - (selectedSchedule.bookedCount ?? 0)
    : 0;

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customersData?.data) return [];
    if (!customerSearch) return customersData.data.slice(0, 8);
    const search = customerSearch.toLowerCase();
    return customersData.data
      .filter(
        (c) =>
          c.firstName.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search)
      )
      .slice(0, 8);
  }, [customersData?.data, customerSearch]);

  // Validation: email OR phone required (at least one)
  const hasValidContact = newCustomer.email.trim() || newCustomer.phone.trim();

  // Step navigation
  const canProceed = () => {
    switch (currentStep) {
      case "tour":
        return !!selectedTourId;
      case "schedule":
        return !!selectedScheduleId && totalGuests > 0 && totalGuests <= availableSpots;
      case "book":
        if (customerMode === "existing") return !!selectedCustomerId;
        return newCustomer.firstName.trim() && hasValidContact; // lastName optional
      default:
        return false;
    }
  };

  const goToStep = (step: BookingStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    const nextStepItem = STEPS[stepIndex + 1];
    if (stepIndex < STEPS.length - 1 && nextStepItem) {
      setCurrentStep(nextStepItem.id);
    }
  };

  const prevStep = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    const prevStepItem = STEPS[stepIndex - 1];
    if (stepIndex > 0 && prevStepItem) {
      setCurrentStep(prevStepItem.id);
    }
  };

  // Handle booking submission
  const handleSubmit = async () => {
    try {
      let customerId = selectedCustomerId;

      // Create new customer if needed
      if (customerMode === "new") {
        const customer = await createCustomerMutation.mutateAsync({
          firstName: newCustomer.firstName.trim(),
          lastName: newCustomer.lastName.trim() || "-", // Default for optional lastName
          email: newCustomer.email.trim() || `${Date.now()}@placeholder.local`, // Fallback for phone-only
          phone: newCustomer.phone.trim() || undefined,
        });
        customerId = customer.id;
      }

      // Combine pickup and notes into special requests
      const specialRequests = [
        pickupLocation && `Pickup: ${pickupLocation}`,
        notes,
      ].filter(Boolean).join("\n\n") || undefined;

      // Create booking
      await createBookingMutation.mutateAsync({
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
    } catch {
      // Error handled by mutation
    }
  };

  const isSubmitting = createCustomerMutation.isPending || createBookingMutation.isPending;

  // Format helpers
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  // Guest counter component
  const GuestCounter = ({
    label,
    sublabel,
    price,
    count,
    min = 0,
    onDecrement,
    onIncrement,
    disabled
  }: {
    label: string;
    sublabel: string;
    price: string;
    count: number;
    min?: number;
    onDecrement: () => void;
    onIncrement: () => void;
    disabled: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{sublabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 w-16 text-right">{price}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrement}
            disabled={count <= min}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-semibold text-lg">{count}</span>
          <button
            type="button"
            onClick={onIncrement}
            disabled={disabled}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step Indicator - Simplified */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((step, index) => {
            const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
            const isActive = step.id === currentStep;
            const isCompleted = index < stepIndex;
            const isClickable = index <= stepIndex;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => isClickable && goToStep(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                    isActive && "bg-primary text-white shadow-sm",
                    isCompleted && "bg-green-100 text-green-700",
                    !isActive && !isCompleted && "bg-gray-100 text-gray-400",
                    isClickable && !isActive && "hover:bg-gray-200 cursor-pointer"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium",
                    isActive && "bg-white/20",
                    isCompleted && "bg-green-500 text-white"
                  )}>
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="font-medium hidden sm:inline">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className={cn(
                    "h-5 w-5 mx-1",
                    index < stepIndex ? "text-green-500" : "text-gray-300"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* STEP 1: Tour Selection */}
        {currentStep === "tour" && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Which tour?</h2>
              <p className="text-gray-500 mt-1">Select the experience to book</p>
            </div>

            {toursLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : toursData?.data && toursData.data.length > 0 ? (
              <div className="space-y-3">
                {toursData.data.map((tour) => (
                  <button
                    key={tour.id}
                    onClick={() => {
                      setSelectedTourId(tour.id);
                      setSelectedScheduleId("");
                      setSelectedDate(null);
                      // Auto-advance to next step
                      setTimeout(() => setCurrentStep("schedule"), 150);
                    }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all",
                      selectedTourId === tour.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex gap-4">
                      {tour.coverImageUrl ? (
                        <img
                          src={tour.coverImageUrl}
                          alt={tour.name}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-10 w-10 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-gray-900 text-lg">{tour.name}</h3>
                          {selectedTourId === tour.id && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(tour.durationMinutes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Up to {tour.maxParticipants}
                          </span>
                        </div>
                        <p className="mt-2 text-xl font-bold text-primary">
                          ${parseFloat(tour.basePrice).toFixed(0)}
                          <span className="text-sm font-normal text-gray-500"> / person</span>
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active tours available</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Schedule (Date + Time + Guests) */}
        {currentStep === "schedule" && (
          <div>
            {/* Selected Tour Header */}
            {selectedTour && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {selectedTour.coverImageUrl ? (
                    <img src={selectedTour.coverImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedTour.name}</h3>
                    <p className="text-sm text-gray-500">{formatDuration(selectedTour.durationMinutes)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Date & Time Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">When?</h3>

                {schedulesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : schedulesData?.data && schedulesData.data.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Dates */}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Select date</p>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {Array.from(schedulesByDate.entries()).map(([dateKey, schedules]) => {
                          const date = new Date(dateKey);
                          const isSelected = selectedDate?.toDateString() === dateKey;
                          const totalSpots = schedules.reduce((sum, s) => sum + (s.maxParticipants - (s.bookedCount ?? 0)), 0);

                          return (
                            <button
                              key={dateKey}
                              onClick={() => {
                                setSelectedDate(date);
                                setSelectedScheduleId("");
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded-lg border transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{formatDate(date)}</span>
                                <span className={cn(
                                  "text-sm font-medium px-2 py-0.5 rounded-full",
                                  totalSpots > 10 ? "bg-green-100 text-green-700" :
                                  totalSpots > 3 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                )}>
                                  {totalSpots} spots
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Times */}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Select time</p>
                      {selectedDate && schedulesByDate.get(selectedDate.toDateString()) ? (
                        <div className="space-y-2">
                          {schedulesByDate.get(selectedDate.toDateString())!.map((schedule) => {
                            const spots = schedule.maxParticipants - (schedule.bookedCount ?? 0);
                            const isSelected = selectedScheduleId === schedule.id;

                            return (
                              <button
                                key={schedule.id}
                                onClick={() => setSelectedScheduleId(schedule.id)}
                                className={cn(
                                  "w-full text-left px-4 py-3 rounded-lg border transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-gray-200 hover:border-gray-300"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "w-2.5 h-2.5 rounded-full",
                                      spots > 5 ? "bg-green-500" : spots > 0 ? "bg-amber-500" : "bg-red-500"
                                    )} />
                                    <span className="font-semibold text-gray-900">{formatTime(schedule.startsAt)}</span>
                                  </div>
                                  <span className="text-sm text-gray-500">{spots} left</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                          <Calendar className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Select a date first</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
                    <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No schedules available</p>
                    <p className="text-sm text-gray-400 mt-1">Create schedules first</p>
                  </div>
                )}
              </div>

              {/* Guest Count Section */}
              {selectedScheduleId && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">How many guests?</h3>
                    <span className={cn(
                      "text-sm font-medium px-3 py-1 rounded-full",
                      availableSpots > 5 ? "bg-green-100 text-green-700" :
                      availableSpots > 0 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {availableSpots} spots available
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    <GuestCounter
                      label="Adults"
                      sublabel="Ages 13+"
                      price={`$${(pricing.breakdown.find(b => b.label === "Adults")?.price || parseFloat(selectedSchedule?.price || "0")).toFixed(0)}`}
                      count={guestCounts.adults}
                      min={1}
                      onDecrement={() => setGuestCounts(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                      onIncrement={() => setGuestCounts(prev => ({ ...prev, adults: prev.adults + 1 }))}
                      disabled={totalGuests >= availableSpots}
                    />
                    <GuestCounter
                      label="Children"
                      sublabel="Ages 3-12"
                      price={`$${(pricing.breakdown.find(b => b.label === "Children")?.price || parseFloat(selectedSchedule?.price || "0") * 0.5).toFixed(0)}`}
                      count={guestCounts.children}
                      onDecrement={() => setGuestCounts(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                      onIncrement={() => setGuestCounts(prev => ({ ...prev, children: prev.children + 1 }))}
                      disabled={totalGuests >= availableSpots}
                    />
                    <GuestCounter
                      label="Infants"
                      sublabel="Under 3"
                      price="Free"
                      count={guestCounts.infants}
                      onDecrement={() => setGuestCounts(prev => ({ ...prev, infants: Math.max(0, prev.infants - 1) }))}
                      onIncrement={() => setGuestCounts(prev => ({ ...prev, infants: prev.infants + 1 }))}
                      disabled={totalGuests >= availableSpots}
                    />
                  </div>

                  {totalGuests > availableSpots && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>Only {availableSpots} spots available for this time</span>
                    </div>
                  )}

                  {/* Price Summary */}
                  <div className="mt-6 bg-gray-50 rounded-xl p-4">
                    {pricing.breakdown.map((item) => (
                      <div key={item.label} className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">{item.count} × {item.label}</span>
                        <span className="text-gray-900">${item.total.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-xl text-primary">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Book (Customer + Confirm) */}
        {currentStep === "book" && (
          <div>
            {/* Booking Summary Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedTour?.coverImageUrl ? (
                    <img src={selectedTour.coverImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedTour?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedSchedule && formatDate(selectedSchedule.startsAt)} at {selectedSchedule && formatTime(selectedSchedule.startsAt)} · {totalGuests} guest{totalGuests > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">${pricing.total.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact details</h3>

                {/* Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setCustomerMode("new")}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all text-sm",
                      customerMode === "new"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    New Customer
                  </button>
                  <button
                    onClick={() => setCustomerMode("existing")}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all text-sm",
                      customerMode === "existing"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    Existing Customer
                  </button>
                </div>

                {customerMode === "new" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input
                          type="text"
                          value={newCustomer.firstName}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={newCustomer.lastName}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          placeholder="Smith (optional)"
                        />
                      </div>
                    </div>

                    {/* Email OR Phone - at least one required */}
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">Email or phone required (at least one)</p>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                          className={cn(
                            "w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                            !hasValidContact ? "border-amber-300" : "border-gray-300"
                          )}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          className={cn(
                            "w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                            !hasValidContact ? "border-amber-300" : "border-gray-300"
                          )}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>

                    {customersLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between",
                              selectedCustomerId === customer.id
                                ? "border-primary bg-primary/5"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div>
                              <p className="font-medium text-gray-900">{customer.firstName} {customer.lastName}</p>
                              <p className="text-sm text-gray-500">{customer.email}</p>
                            </div>
                            {selectedCustomerId === customer.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pickup Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location / Hotel</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="Hotel name, address, or meeting point"
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special requests (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Dietary requirements, accessibility needs, celebration..."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === "tour"}
          className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:cursor-default transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>

        {currentStep === "book" ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isSubmitting ? "Creating..." : `Book · $${pricing.total.toFixed(2)}`}
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            Continue
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
