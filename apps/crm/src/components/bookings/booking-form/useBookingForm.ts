"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type {
  BookingFormData,
  CalculatedPrice,
  ExistingBooking,
  ScheduleWithDetails,
  PricingTier,
} from "./types";
import type { ComboboxOption } from "@/components/ui/combobox";

interface UseBookingFormOptions {
  booking?: ExistingBooking;
  preselectedCustomerId?: string;
  preselectedScheduleId?: string;
}

export function useBookingForm({
  booking,
  preselectedCustomerId,
  preselectedScheduleId,
}: UseBookingFormOptions) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isEditing = !!booking;

  // Form state
  const [formData, setFormData] = useState<BookingFormData>({
    customerId: booking?.customerId ?? preselectedCustomerId ?? "",
    scheduleId: booking?.scheduleId ?? preselectedScheduleId ?? "",
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
  const { data: schedulesData, isLoading: schedulesLoading } =
    trpc.schedule.list.useQuery({
      pagination: { page: 1, limit: 100 },
      filters: { status: "scheduled" },
      sort: { field: "startsAt", direction: "asc" },
    });

  const { data: customersData, isLoading: customersLoading } =
    trpc.customer.list.useQuery({
      pagination: { page: 1, limit: 100 },
    });

  // Find selected schedule
  const selectedSchedule = useMemo(
    () =>
      schedulesData?.data.find(
        (s) => s.id === formData.scheduleId
      ) as ScheduleWithDetails | undefined,
    [schedulesData?.data, formData.scheduleId]
  );

  // Fetch pricing tiers for selected tour
  const { data: pricingTiers } = trpc.tour.listPricingTiers.useQuery(
    { tourId: selectedSchedule?.tour?.id || "" },
    { enabled: !!selectedSchedule?.tour?.id }
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

  // Convert schedules to Combobox options with availability info
  const scheduleOptions: ComboboxOption[] = useMemo(() => {
    if (!schedulesData?.data) return [];
    return schedulesData.data.map((schedule) => {
      const availableSpots =
        schedule.maxParticipants - (schedule.bookedCount ?? 0);
      const isAvailable = availableSpots > 0;
      return {
        value: schedule.id,
        label: `${schedule.tour?.name || "Unknown Tour"} - ${formatScheduleDate(schedule.startsAt)}`,
        sublabel: isAvailable
          ? `${availableSpots} spots available`
          : "Fully booked",
        disabled: !isAvailable,
      };
    });
  }, [schedulesData?.data]);

  // Calculate price when schedule or guest count changes
  useEffect(() => {
    if (formData.scheduleId && schedulesData?.data) {
      const schedule = schedulesData.data.find(
        (s) => s.id === formData.scheduleId
      );
      if (schedule) {
        const basePrice = parseFloat(
          schedule.price || schedule.tour?.basePrice || "0"
        );

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
    }
  }, [
    formData.scheduleId,
    formData.adultCount,
    formData.childCount,
    formData.infantCount,
    formData.discount,
    formData.tax,
    schedulesData?.data,
    pricingTiers,
  ]);

  // Update a single form field
  const updateField = useCallback(
    <K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.customerId) {
        toast.error("Please select a customer");
        return;
      }
      if (!formData.scheduleId) {
        toast.error("Please select a schedule");
        return;
      }

      // Validate available spots (overbooking protection)
      if (!isEditing && selectedSchedule) {
        const totalParticipants =
          formData.adultCount + formData.childCount + formData.infantCount;
        const availableSpots =
          selectedSchedule.maxParticipants -
          (selectedSchedule.bookedCount ?? 0);
        if (totalParticipants > availableSpots) {
          toast.error(
            `Only ${availableSpots} spots available. You're trying to book ${totalParticipants} participants.`
          );
          return;
        }
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
        createMutation.mutate({
          customerId: formData.customerId,
          scheduleId: formData.scheduleId,
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
      selectedSchedule,
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
    scheduleOptions,
    schedulesLoading,
    selectedSchedule,
    pricingTiers,

    // Actions
    handleSubmit,
    handleCancel,
  };
}

// Helper function
function formatScheduleDate(startsAt: Date) {
  const date = new Date(startsAt);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export { formatScheduleDate };
