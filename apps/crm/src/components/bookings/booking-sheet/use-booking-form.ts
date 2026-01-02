"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { CustomerData } from "./customer-selector";
import type { TourData } from "./tour-selector";
import type { TimeSlot } from "./date-time-selector";
import type { GuestCounts, PriceBreakdownItem } from "./guest-counter";
import type { PaymentMethod } from "./payment-form";

// ============================================================================
// TYPES
// ============================================================================

export interface UseBookingFormOptions {
  open: boolean;
  orgSlug: string;
  preselectedCustomerId?: string;
  preselectedTourId?: string;
  onSuccess: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useBookingForm({
  open,
  orgSlug,
  preselectedCustomerId,
  preselectedTourId,
  onSuccess,
}: UseBookingFormOptions) {
  const router = useRouter();
  const utils = trpc.useUtils();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

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

  // Tour & Time selection
  const [selectedTourId, setSelectedTourId] = useState<string>(preselectedTourId || "");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
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

  // ---------------------------------------------------------------------------
  // RESET ON OPEN
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      setCustomerMode(preselectedCustomerId ? "search" : "create");
      setCustomerSearch("");
      setSelectedCustomer(null);
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "" });
      setSelectedTourId(preselectedTourId || "");
      setSelectedDate(new Date());
      setSelectedTime("");
      setDateScrollOffset(0);
      setGuestCounts({ adults: 1, children: 0, infants: 0 });
      setPickupLocation("");
      setNotes("");
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentMethod("card");
      setErrors({});
      setTouched({});

      if (!preselectedCustomerId) {
        setTimeout(() => {
          const firstNameInput = document.querySelector('input[placeholder="First Name *"]') as HTMLInputElement;
          firstNameInput?.focus();
        }, 150);
      }
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

  const { data: preselectedCustomerData } = trpc.customer.getById.useQuery(
    { id: preselectedCustomerId! },
    { enabled: open && !!preselectedCustomerId }
  );

  useEffect(() => {
    if (preselectedCustomerData && preselectedCustomerId && open) {
      setSelectedCustomer({
        id: preselectedCustomerData.id,
        firstName: preselectedCustomerData.firstName,
        lastName: preselectedCustomerData.lastName,
        email: preselectedCustomerData.email || "",
        phone: preselectedCustomerData.phone || "",
      });
    }
  }, [preselectedCustomerData, preselectedCustomerId, open]);

  const { data: departureTimes, isLoading: departureTimesLoading } = trpc.availability.getDepartureTimes.useQuery(
    { tourId: selectedTourId },
    { enabled: open && !!selectedTourId }
  );

  const { data: pricingTiers } = trpc.tour.listPricingTiers.useQuery(
    { tourId: selectedTourId },
    { enabled: open && !!selectedTourId }
  );

  const currentDate = new Date();
  const availabilityYear = currentDate.getFullYear();
  const availabilityMonth = currentDate.getMonth() + 1;

  const { data: availableDatesData } = trpc.availability.getAvailableDatesForMonth.useQuery(
    {
      tourId: selectedTourId,
      year: availabilityYear,
      month: availabilityMonth,
    },
    { enabled: open && !!selectedTourId && (!departureTimes || departureTimes.filter(dt => dt.isActive).length === 0) }
  );

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const recentCustomers = useMemo(() => {
    if (!customersData?.data) return [];
    return customersData.data.slice(0, 5);
  }, [customersData]);

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

  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!departureTimes) return [];
    return departureTimes
      .filter((dt) => dt.isActive)
      .map((dt) => ({
        time: dt.time,
        label: dt.label || null,
        available: true,
      }));
  }, [departureTimes]);

  const nextAvailableDate = useMemo(() => {
    if (!availableDatesData?.dates?.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDates = availableDatesData.dates.filter((d) => new Date(d.date) > today);
    if (futureDates.length === 0) return null;
    const firstDate = futureDates[0];
    return firstDate ? new Date(firstDate.date) : null;
  }, [availableDatesData]);

  const selectedTour = useMemo(() => {
    return toursData?.data?.find((t) => t.id === selectedTourId);
  }, [toursData, selectedTourId]);

  const tours: TourData[] = useMemo(() => {
    return (toursData?.data || []).map((t) => ({
      id: t.id,
      name: t.name,
      durationMinutes: t.durationMinutes,
      basePrice: t.basePrice,
      coverImageUrl: t.coverImageUrl,
    }));
  }, [toursData]);

  const pricing = useMemo(() => {
    if (!selectedTour) return { subtotal: 0, total: 0, breakdown: [] as PriceBreakdownItem[] };

    const basePrice = parseFloat(selectedTour.basePrice || "0");

    const adultTier = pricingTiers?.find((t) => t.name === "adult");
    const childTier = pricingTiers?.find((t) => t.name === "child");
    const infantTier = pricingTiers?.find((t) => t.name === "infant");

    const adultPrice = adultTier?.price ? parseFloat(adultTier.price) : basePrice;
    const childPrice = childTier?.price ? parseFloat(childTier.price) : basePrice * 0.5;
    const infantPrice = infantTier?.price ? parseFloat(infantTier.price) : 0;

    const breakdown: PriceBreakdownItem[] = [];
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

  const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants;
  const availableSpots = 100;
  const hasValidContact = newCustomer.email.trim() || newCustomer.phone.trim();

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const createCustomerMutation = trpc.customer.create.useMutation();
  const createBookingMutation = trpc.booking.create.useMutation({
    onSuccess: (booking) => {
      utils.booking.list.invalidate();
      toast.success("Booking created successfully!");
      onSuccess();
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

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    Object.keys(touched).forEach(field => {
      if (touched[field]) {
        const error = validateField(field);
        if (error) newErrors[field] = error;
      }
    });
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

    if (customerMode === "create") {
      if (!newCustomer.firstName.trim()) newErrors.firstName = "First name required";
      if (!hasValidContact) newErrors.contact = "Email or phone required";
      if (newCustomer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
        newErrors.email = "Invalid email format";
      }
    } else if (!selectedCustomer) {
      newErrors.customer = "Select a customer";
    }

    if (!selectedTourId) newErrors.tour = "Select a tour";
    if (!selectedTime) newErrors.time = "Select a time slot";
    if (totalGuests < 1) newErrors.guests = "At least 1 guest required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customerMode, newCustomer, selectedCustomer, selectedTourId, selectedTime, totalGuests, hasValidContact]);

  // ---------------------------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------------------------

  const getDateString = (date: Date): string => date.toISOString().split("T")[0] || "";

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    let customerId = selectedCustomer?.id;

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
        // Error shown via toast by mutation's onError
        return;
      }
    }

    if (!customerId) {
      toast.error("Customer is required");
      return;
    }

    const specialRequests = [
      pickupLocation && `Pickup: ${pickupLocation}`,
      notes,
    ].filter(Boolean).join("\n\n") || undefined;

    try {
      const booking = await createBookingMutation.mutateAsync({
        customerId,
        tourId: selectedTourId,
        bookingDate: getDateString(selectedDate),
        bookingTime: selectedTime,
        adultCount: guestCounts.adults,
        childCount: guestCounts.children || undefined,
        infantCount: guestCounts.infants || undefined,
        subtotal: pricing.subtotal.toFixed(2),
        total: pricing.total.toFixed(2),
        specialRequests,
        source: "manual",
      });

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
      // Error handled by mutation's onError callback
    }
  }, [
    validate,
    selectedCustomer,
    customerMode,
    createCustomerMutation,
    newCustomer,
    pickupLocation,
    notes,
    createBookingMutation,
    selectedTourId,
    selectedDate,
    selectedTime,
    guestCounts,
    pricing,
    recordPayment,
    paymentAmount,
    recordPaymentMutation,
    paymentMethod,
  ]);

  // ---------------------------------------------------------------------------
  // STATE HELPERS
  // ---------------------------------------------------------------------------

  const isSubmitting = createCustomerMutation.isPending || createBookingMutation.isPending;
  const canSubmit = (customerMode === "create" ? (newCustomer.firstName.trim() && hasValidContact) : !!selectedCustomer)
    && selectedTourId
    && selectedTime
    && totalGuests > 0;

  const handleTouch = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === "email" || field === "phone") {
      setTouched(prev => ({ ...prev, contact: true }));
    }
  }, []);

  const handleTourSelect = useCallback((tourId: string) => {
    setSelectedTourId(tourId);
    setSelectedTime("");
  }, []);

  return {
    // Customer state
    customerMode,
    setCustomerMode,
    customerSearch,
    setCustomerSearch,
    selectedCustomer,
    setSelectedCustomer,
    newCustomer,
    setNewCustomer,
    filteredCustomers,
    recentCustomers,
    // Tour state
    selectedTourId,
    handleTourSelect,
    tours,
    selectedTour,
    // Date/time state
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    dateScrollOffset,
    setDateScrollOffset,
    timeSlots,
    departureTimesLoading,
    nextAvailableDate,
    // Guest state
    guestCounts,
    setGuestCounts,
    totalGuests,
    availableSpots,
    // Extras state
    pickupLocation,
    setPickupLocation,
    notes,
    setNotes,
    // Payment state
    recordPayment,
    setRecordPayment,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    // Pricing
    pricing,
    showPriceBreakdown,
    setShowPriceBreakdown,
    // Validation
    errors,
    touched,
    handleTouch,
    hasValidContact: !!hasValidContact,
    // Submit
    handleSubmit,
    isSubmitting,
    canSubmit,
  };
}
