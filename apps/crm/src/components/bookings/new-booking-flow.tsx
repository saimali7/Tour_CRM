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
  User,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Step indicator
type BookingStep = "tour" | "datetime" | "guests" | "customer" | "confirm";

const STEPS: { id: BookingStep; label: string }[] = [
  { id: "tour", label: "Tour" },
  { id: "datetime", label: "Date & Time" },
  { id: "guests", label: "Guests" },
  { id: "customer", label: "Customer" },
  { id: "confirm", label: "Confirm" },
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
    preselectedScheduleId ? "guests" : preselectedTourId ? "datetime" : "tour"
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
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

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

  // Available dates for calendar
  const availableDates = useMemo(() => {
    return new Set(schedulesByDate.keys());
  }, [schedulesByDate]);

  // Pricing calculation
  const pricing = useMemo(() => {
    if (!selectedSchedule) return { subtotal: 0, total: 0, breakdown: [] as { label: string; count: number; price: number; total: number }[] };

    const basePrice = parseFloat(selectedSchedule.price || selectedTour?.basePrice || "0");

    // Use pricing tiers if available, otherwise use defaults
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
      breakdown.push({
        label: "Adults",
        count: guestCounts.adults,
        price: adultPrice,
        total: guestCounts.adults * adultPrice,
      });
    }
    if (guestCounts.children > 0) {
      breakdown.push({
        label: "Children",
        count: guestCounts.children,
        price: childPrice,
        total: guestCounts.children * childPrice,
      });
    }
    if (guestCounts.infants > 0) {
      breakdown.push({
        label: "Infants",
        count: guestCounts.infants,
        price: infantPrice,
        total: guestCounts.infants * infantPrice,
      });
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
    if (!customerSearch) return customersData.data.slice(0, 10);
    const search = customerSearch.toLowerCase();
    return customersData.data
      .filter(
        (c) =>
          c.firstName.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search)
      )
      .slice(0, 10);
  }, [customersData?.data, customerSearch]);

  // Step navigation
  const canProceed = () => {
    switch (currentStep) {
      case "tour":
        return !!selectedTourId;
      case "datetime":
        return !!selectedScheduleId;
      case "guests":
        return totalGuests > 0 && totalGuests <= availableSpots;
      case "customer":
        if (customerMode === "existing") return !!selectedCustomerId;
        return newCustomer.firstName && newCustomer.lastName && newCustomer.email;
      case "confirm":
        return true;
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
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          email: newCustomer.email,
          phone: newCustomer.phone || undefined,
        });
        customerId = customer.id;
      }

      // Create booking
      await createBookingMutation.mutateAsync({
        customerId,
        scheduleId: selectedScheduleId,
        adultCount: guestCounts.adults,
        childCount: guestCounts.children || undefined,
        infantCount: guestCounts.infants || undefined,
        subtotal: pricing.subtotal.toFixed(2),
        total: pricing.total.toFixed(2),
        specialRequests: notes || undefined,
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
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
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                    isActive && "bg-primary text-white",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-gray-400",
                    isClickable && !isActive && "hover:bg-gray-100"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium",
                      isActive && "bg-white text-primary",
                      isCompleted && "bg-primary text-white",
                      !isActive && !isCompleted && "bg-gray-200 text-gray-500"
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="hidden sm:inline font-medium">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-gray-300 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px]">
        {/* Tour Selection */}
        {currentStep === "tour" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select a Tour</h2>
              <p className="text-gray-500 mt-1">Choose the experience for this booking</p>
            </div>

            {toursLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : toursData?.data && toursData.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toursData.data.map((tour) => (
                  <button
                    key={tour.id}
                    onClick={() => {
                      setSelectedTourId(tour.id);
                      setSelectedScheduleId("");
                      setSelectedDate(null);
                    }}
                    className={cn(
                      "text-left p-4 rounded-xl border-2 transition-all",
                      selectedTourId === tour.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex gap-4">
                      {tour.coverImageUrl ? (
                        <img
                          src={tour.coverImageUrl}
                          alt={tour.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{tour.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(tour.durationMinutes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Max {tour.maxParticipants}
                          </span>
                        </div>
                        <p className="mt-2 text-lg font-semibold text-primary">
                          From ${parseFloat(tour.basePrice).toFixed(0)}
                        </p>
                      </div>
                      {selectedTourId === tour.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
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

        {/* Date & Time Selection */}
        {currentStep === "datetime" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select Date & Time</h2>
              <p className="text-gray-500 mt-1">
                Choose when for {selectedTour?.name}
              </p>
            </div>

            {schedulesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : schedulesData?.data && schedulesData.data.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Date List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Available Dates</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {Array.from(schedulesByDate.entries()).map(([dateKey, schedules]) => {
                      const date = new Date(dateKey);
                      const isSelected = selectedDate?.toDateString() === dateKey;
                      const totalSpots = schedules.reduce(
                        (sum, s) => sum + (s.maxParticipants - (s.bookedCount ?? 0)),
                        0
                      );

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
                            <div>
                              <p className="font-medium text-gray-900">{formatDate(date)}</p>
                              <p className="text-sm text-gray-500">
                                {schedules.length} time{schedules.length > 1 ? "s" : ""} available
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "text-sm font-medium",
                                totalSpots > 10 ? "text-green-600" : totalSpots > 3 ? "text-amber-600" : "text-red-600"
                              )}>
                                {totalSpots} spots
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {selectedDate ? `Times on ${formatDate(selectedDate)}` : "Select a date first"}
                  </h3>
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
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-3 h-3 rounded-full",
                                  spots > 5 ? "bg-green-500" : spots > 0 ? "bg-amber-500" : "bg-red-500"
                                )} />
                                <div>
                                  <p className="font-medium text-gray-900">{formatTime(schedule.startsAt)}</p>
                                  <p className="text-sm text-gray-500">
                                    ${parseFloat(schedule.price || selectedTour?.basePrice || "0").toFixed(0)} per person
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={cn(
                                  "text-sm font-medium",
                                  spots > 5 ? "text-green-600" : spots > 0 ? "text-amber-600" : "text-red-600"
                                )}>
                                  {spots} spots left
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Select a date to see available times</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No available schedules for this tour</p>
                <p className="text-sm text-gray-400 mt-1">Create schedules in the Schedules section</p>
              </div>
            )}
          </div>
        )}

        {/* Guest Count */}
        {currentStep === "guests" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">How many guests?</h2>
              <p className="text-gray-500 mt-1">
                {availableSpots} spots available for this time
              </p>
            </div>

            <div className="space-y-4">
              {/* Adults */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Adults</p>
                  <p className="text-sm text-gray-500">Ages 13+</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    ${(pricing.breakdown.find(b => b.label === "Adults")?.price || 0).toFixed(0)} each
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGuestCounts(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                      disabled={guestCounts.adults <= 1}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{guestCounts.adults}</span>
                    <button
                      onClick={() => setGuestCounts(prev => ({ ...prev, adults: prev.adults + 1 }))}
                      disabled={totalGuests >= availableSpots}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Children</p>
                  <p className="text-sm text-gray-500">Ages 3-12</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    ${(pricing.breakdown.find(b => b.label === "Children")?.price || 0).toFixed(0)} each
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGuestCounts(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                      disabled={guestCounts.children <= 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{guestCounts.children}</span>
                    <button
                      onClick={() => setGuestCounts(prev => ({ ...prev, children: prev.children + 1 }))}
                      disabled={totalGuests >= availableSpots}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Infants */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Infants</p>
                  <p className="text-sm text-gray-500">Under 3</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Free</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGuestCounts(prev => ({ ...prev, infants: Math.max(0, prev.infants - 1) }))}
                      disabled={guestCounts.infants <= 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{guestCounts.infants}</span>
                    <button
                      onClick={() => setGuestCounts(prev => ({ ...prev, infants: prev.infants + 1 }))}
                      disabled={totalGuests >= availableSpots}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {pricing.breakdown.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.count} × {item.label} @ ${item.price.toFixed(0)}
                  </span>
                  <span className="text-gray-900">${item.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg">${pricing.total.toFixed(2)}</span>
              </div>
            </div>

            {totalGuests > availableSpots && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Only {availableSpots} spots available</span>
              </div>
            )}
          </div>
        )}

        {/* Customer */}
        {currentStep === "customer" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Customer Details</h2>
              <p className="text-gray-500 mt-1">Who is this booking for?</p>
            </div>

            {/* Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setCustomerMode("existing")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
                  customerMode === "existing"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Existing Customer
              </button>
              <button
                onClick={() => setCustomerMode("new")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
                  customerMode === "new"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                New Customer
              </button>
            </div>

            {customerMode === "existing" ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {customersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg border transition-all",
                          selectedCustomerId === customer.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                          {selectedCustomerId === customer.id && (
                            <Check className="h-5 w-5 text-primary ml-auto" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation */}
        {currentStep === "confirm" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Confirm Booking</h2>
              <p className="text-gray-500 mt-1">Review the details before creating</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              {/* Tour */}
              <div className="flex items-start gap-4">
                {selectedTour?.coverImageUrl ? (
                  <img
                    src={selectedTour.coverImageUrl}
                    alt={selectedTour.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedTour?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedSchedule && formatDate(selectedSchedule.startsAt)} at{" "}
                    {selectedSchedule && formatTime(selectedSchedule.startsAt)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium text-gray-900">
                      {customerMode === "existing"
                        ? `${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`
                        : `${newCustomer.firstName} ${newCustomer.lastName}`}
                    </p>
                    <p className="text-gray-500">
                      {customerMode === "existing" ? selectedCustomer?.email : newCustomer.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Guests</p>
                    <p className="font-medium text-gray-900">
                      {totalGuests} guest{totalGuests > 1 ? "s" : ""}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {guestCounts.adults} adult{guestCounts.adults > 1 ? "s" : ""}
                      {guestCounts.children > 0 && `, ${guestCounts.children} child${guestCounts.children > 1 ? "ren" : ""}`}
                      {guestCounts.infants > 0 && `, ${guestCounts.infants} infant${guestCounts.infants > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                {pricing.breakdown.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.count} × {item.label}
                    </span>
                    <span className="text-gray-900">${item.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-primary">${pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="text-sm text-primary hover:underline"
              >
                {showNotes ? "Hide notes" : "+ Add special requests or notes"}
              </button>
              {showNotes && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Any special requests, dietary requirements, or notes..."
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === "tour"}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>

        {currentStep === "confirm" ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Booking
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
