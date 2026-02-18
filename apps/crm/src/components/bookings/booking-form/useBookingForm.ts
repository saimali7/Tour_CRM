"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type {
  BookingFormData,
  CalculatedPrice,
  ExistingBooking,
  PricingTier,
} from "./types";
import type { ComboboxOption } from "@/components/ui/combobox";
import { formatDbDateKey } from "@/lib/date-time";

interface UseBookingFormOptions {
  booking?: ExistingBooking;
  preselectedCustomerId?: string;
  preselectedTourId?: string;
}

// Helper to derive tourId/date/time from existing booking
function deriveAvailabilityFromBooking(booking?: ExistingBooking): {
  tourId: string;
  bookingDate: string | null;
  bookingTime: string | null;
} {
  if (!booking) {
    return { tourId: "", bookingDate: null, bookingTime: null };
  }

  // Use availability fields from booking
  const tourId = booking.tourId || booking.tour?.id || "";

  // bookingDate might be a Date object from the database, convert to string
  const dateValue = booking.bookingDate;
  let dateString: string | null = null;
  if (dateValue instanceof Date) {
    dateString = formatDbDateKey(dateValue);
  } else if (typeof dateValue === "string") {
    dateString = formatDbDateKey(dateValue);
  }

  return {
    tourId,
    bookingDate: dateString,
    bookingTime: booking.bookingTime ?? null,
  };
}

export function useBookingForm({
  booking,
  preselectedCustomerId,
  preselectedTourId,
}: UseBookingFormOptions) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isEditing = !!booking;

  // Derive initial availability values from booking (for edit mode backward compat)
  const initialAvailability = deriveAvailabilityFromBooking(booking);

  // Form state
  const [formData, setFormData] = useState<BookingFormData>({
    customerId: booking?.customerId ?? preselectedCustomerId ?? "",
    // Availability-based fields
    tourId: initialAvailability.tourId || preselectedTourId || "",
    bookingDate: initialAvailability.bookingDate,
    bookingTime: initialAvailability.bookingTime,
    adultCount: booking?.adultCount ?? 1,
    childCount: booking?.childCount ?? 0,
    infantCount: booking?.infantCount ?? 0,
    discount: booking?.discount ?? "",
    tax: booking?.tax ?? "",
    specialRequests: booking?.specialRequests ?? "",
    dietaryRequirements: booking?.dietaryRequirements ?? "",
    accessibilityNeeds: booking?.accessibilityNeeds ?? "",
    internalNotes: booking?.internalNotes ?? "",
  });

  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPrice>({
    subtotal: booking?.subtotal ?? "0",
    total: booking?.total ?? "0",
  });

  const [showCreateCustomer, setShowCreateCustomer] = useState(false);

  // tRPC queries
  const { data: customersData, isLoading: customersLoading } =
    trpc.customer.list.useQuery({
      pagination: { page: 1, limit: 100 },
    });

  // Fetch tours for tour selector (new availability-based flow)
  const { data: toursData, isLoading: toursLoading } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
    sort: { field: "name", direction: "asc" },
  });

  // Find selected tour
  const selectedTour = useMemo(
    () => toursData?.data.find((t) => t.id === formData.tourId),
    [toursData?.data, formData.tourId]
  );

  // Fetch available dates for the selected tour and current month
  const currentDate = new Date();
  // Parse year and month from bookingDate (YYYY-MM-DD format)
  let availabilityYear = currentDate.getFullYear();
  let availabilityMonth = currentDate.getMonth() + 1;
  if (formData.bookingDate) {
    const dateParts = formData.bookingDate.split("-");
    if (dateParts[0] && dateParts[1]) {
      availabilityYear = parseInt(dateParts[0], 10);
      availabilityMonth = parseInt(dateParts[1], 10);
    }
  }

  const { data: availableDates, isLoading: availableDatesLoading } =
    trpc.availability.getAvailableDatesForMonth.useQuery(
      {
        tourId: formData.tourId,
        year: availabilityYear,
        month: availabilityMonth,
      },
      { enabled: !!formData.tourId }
    );

  // Fetch departure times for the selected tour
  const { data: departureTimes, isLoading: departureTimesLoading } =
    trpc.availability.getDepartureTimes.useQuery(
      { tourId: formData.tourId },
      { enabled: !!formData.tourId }
    );

  // Get tour ID for pricing tiers
  const tourIdForPricing = formData.tourId;

  // Fetch pricing tiers for selected tour
  const { data: pricingTiers } = trpc.tour.listPricingTiers.useQuery(
    { tourId: tourIdForPricing },
    { enabled: !!tourIdForPricing }
  ) as { data: PricingTier[] | undefined };

  // tRPC mutations
  const utils = trpc.useUtils();

  const createMutation = trpc.booking.create.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
      toast.success("Booking created successfully");
      router.push(`/org/${slug}/bookings`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });

  const updateMutation = trpc.booking.update.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
      utils.booking.getById.invalidate({ id: booking?.id });
      toast.success("Booking updated successfully");
      router.push(`/org/${slug}/bookings`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  // Convert customers to Combobox options
  const customerOptions: ComboboxOption[] = useMemo(() => {
    if (!customersData?.data) return [];
    return customersData.data.map((customer) => ({
      value: customer.id,
      label: `${customer.firstName} ${customer.lastName}`,
      sublabel: customer.email || undefined,
    }));
  }, [customersData?.data]);

  // Convert tours to Combobox options
  const tourOptions: ComboboxOption[] = useMemo(() => {
    if (!toursData?.data) return [];
    return toursData.data.map((tour) => ({
      value: tour.id,
      label: tour.name,
      sublabel: tour.basePrice ? `From $${parseFloat(tour.basePrice).toFixed(2)}` : undefined,
    }));
  }, [toursData?.data]);

  // Format departure times as options
  const timeOptions: ComboboxOption[] = useMemo(() => {
    if (!departureTimes) return [];
    return departureTimes
      .filter((dt) => dt.isActive)
      .map((dt) => ({
        value: dt.time,
        label: formatTime(dt.time),
        sublabel: dt.label || undefined,
      }));
  }, [departureTimes]);

  // Calculate price when tour or guest count changes
  useEffect(() => {
    // Get base price from tour
    let basePrice = 0;

    if (formData.tourId && selectedTour) {
      basePrice = parseFloat(selectedTour.basePrice || "0");
    }

    if (basePrice > 0 || pricingTiers?.length) {
      // Find pricing tiers from database
      const adultTier = pricingTiers?.find((t) => t.name === "adult");
      const childTier = pricingTiers?.find((t) => t.name === "child");
      const infantTier = pricingTiers?.find((t) => t.name === "infant");

      // Use tier prices if available, otherwise fall back to base price
      const adultPrice = adultTier?.price
        ? parseFloat(adultTier.price)
        : basePrice;
      const childPrice = childTier?.price
        ? parseFloat(childTier.price)
        : basePrice;
      const infantPrice = infantTier?.price
        ? parseFloat(infantTier.price)
        : 0;

      const subtotal =
        adultPrice * formData.adultCount +
        childPrice * formData.childCount +
        infantPrice * formData.infantCount;

      const discount = parseFloat(formData.discount || "0");
      const tax = parseFloat(formData.tax || "0");
      const total = subtotal - discount + tax;

      setCalculatedPrice({
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
      });
    }
  }, [
    formData.tourId,
    formData.adultCount,
    formData.childCount,
    formData.infantCount,
    formData.discount,
    formData.tax,
    selectedTour,
    pricingTiers,
  ]);

  // Update a single form field
  const updateField = useCallback(
    <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Handle tour selection
  const handleTourChange = useCallback((tourId: string) => {
    setFormData((prev) => ({
      ...prev,
      tourId,
      // Reset date and time when tour changes
      bookingDate: null,
      bookingTime: null,
    }));
  }, []);

  // Handle date selection
  const handleDateChange = useCallback((date: string) => {
    setFormData((prev) => ({
      ...prev,
      bookingDate: date,
      // Reset time when date changes (user should select new time)
      bookingTime: null,
    }));
  }, []);

  // Handle time selection
  const handleTimeChange = useCallback((time: string) => {
    setFormData((prev) => ({
      ...prev,
      bookingTime: time,
    }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.customerId) {
        toast.error("Please select a customer");
        return;
      }

      // Validate availability-based booking
      if (!formData.tourId) {
        toast.error("Please select a tour");
        return;
      }
      if (!formData.bookingDate) {
        toast.error("Please select a date");
        return;
      }
      if (!formData.bookingTime) {
        toast.error("Please select a time");
        return;
      }

      // Validate discount and tax are valid numbers
      const discount = parseFloat(formData.discount || "0");
      const tax = parseFloat(formData.tax || "0");
      if (formData.discount && (isNaN(discount) || discount < 0)) {
        toast.error("Please enter a valid discount amount");
        return;
      }
      if (formData.tax && (isNaN(tax) || tax < 0)) {
        toast.error("Please enter a valid tax amount");
        return;
      }

      if (isEditing && booking) {
        updateMutation.mutate({
          id: booking.id,
          data: {
            adultCount: formData.adultCount,
            childCount: formData.childCount,
            infantCount: formData.infantCount,
            discount: formData.discount || undefined,
            tax: formData.tax || undefined,
            specialRequests: formData.specialRequests || undefined,
            dietaryRequirements: formData.dietaryRequirements || undefined,
            accessibilityNeeds: formData.accessibilityNeeds || undefined,
            internalNotes: formData.internalNotes || undefined,
          },
        });
      } else {
        // Build mutation payload using availability-based booking
        createMutation.mutate({
          customerId: formData.customerId,
          // Availability-based fields
          tourId: formData.tourId,
          bookingDate: formData.bookingDate!,
          bookingTime: formData.bookingTime!,
          // Guest counts
          adultCount: formData.adultCount,
          childCount: formData.childCount || undefined,
          infantCount: formData.infantCount || undefined,
          subtotal: calculatedPrice.subtotal,
          discount: formData.discount || undefined,
          tax: formData.tax || undefined,
          total: calculatedPrice.total,
          specialRequests: formData.specialRequests || undefined,
          dietaryRequirements: formData.dietaryRequirements || undefined,
          accessibilityNeeds: formData.accessibilityNeeds || undefined,
          internalNotes: formData.internalNotes || undefined,
          source: "manual",
        });
      }
    },
    [
      formData,
      calculatedPrice,
      isEditing,
      booking,
      createMutation,
      updateMutation,
    ]
  );

  // Handle customer creation
  const handleCustomerCreated = useCallback(
    (customer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
    }) => {
      setFormData((prev) => ({ ...prev, customerId: customer.id }));
      utils.customer.list.invalidate();
    },
    [utils.customer.list]
  );

  // Navigation
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return {
    // Form state
    formData,
    updateField,
    calculatedPrice,
    isEditing,
    isSubmitting,
    error,

    // Customer modal
    showCreateCustomer,
    setShowCreateCustomer,
    handleCustomerCreated,

    // Data and options
    customerOptions,
    customersLoading,
    pricingTiers,

    // Tour and availability data
    tourOptions,
    toursLoading,
    selectedTour,
    availableDates,
    availableDatesLoading,
    timeOptions,
    departureTimesLoading,

    // Availability-based handlers
    handleTourChange,
    handleDateChange,
    handleTimeChange,

    // Actions
    handleSubmit,
    handleCancel,
  };
}

// Helper function for formatting time (HH:MM to readable format)
function formatTime(time: string): string {
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// Helper function for formatting date (YYYY-MM-DD to readable format)
function formatBookingDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export { formatTime, formatBookingDate };
