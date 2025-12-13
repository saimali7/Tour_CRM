"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { CustomerQuickCreate } from "@/components/customers/customer-quick-create";
import { toast } from "sonner";

interface BookingFormProps {
  booking?: {
    id: string;
    customerId: string;
    scheduleId: string;
    adultCount: number;
    childCount: number | null;
    infantCount: number | null;
    subtotal: string;
    discount: string | null;
    tax: string | null;
    total: string;
    specialRequests: string | null;
    dietaryRequirements: string | null;
    accessibilityNeeds: string | null;
    internalNotes: string | null;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    schedule?: {
      id: string;
      startsAt: Date;
      endsAt: Date;
    };
    tour?: {
      id: string;
      name: string;
    };
  };
  preselectedCustomerId?: string;
  preselectedScheduleId?: string;
}

export function BookingForm({ booking, preselectedCustomerId, preselectedScheduleId }: BookingFormProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isEditing = !!booking;

  const { data: schedulesData, isLoading: schedulesLoading } = trpc.schedule.list.useQuery({
    pagination: { page: 1, limit: 500 },
    filters: { status: "scheduled" },
    sort: { field: "startsAt", direction: "asc" },
  });

  const { data: customersData, isLoading: customersLoading } = trpc.customer.list.useQuery({
    pagination: { page: 1, limit: 500 },
  });

  const [formData, setFormData] = useState({
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

  const [calculatedPrice, setCalculatedPrice] = useState({
    subtotal: booking?.subtotal ?? "0",
    total: booking?.total ?? "0",
  });

  const [showCreateCustomer, setShowCreateCustomer] = useState(false);

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
      sublabel: customer.email,
    }));
  }, [customersData?.data]);

  // Convert schedules to Combobox options with availability info
  const scheduleOptions: ComboboxOption[] = useMemo(() => {
    if (!schedulesData?.data) return [];
    return schedulesData.data.map((schedule) => {
      const availableSpots = schedule.maxParticipants - (schedule.bookedCount ?? 0);
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
      const schedule = schedulesData.data.find((s) => s.id === formData.scheduleId);
      if (schedule) {
        const adultPrice = parseFloat(schedule.price || schedule.tour?.basePrice || "0");
        // TODO: Fetch actual pricing tiers from tourPricingTiers table
        // For now, use sensible defaults: children at 50% of adult price, infants free
        const childPrice = adultPrice * 0.5;
        const infantPrice = 0;

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
  }, [formData.scheduleId, formData.adultCount, formData.childCount, formData.infantCount, formData.discount, formData.tax, schedulesData?.data]);

  const handleSubmit = (e: React.FormEvent) => {
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
      const totalParticipants = formData.adultCount + formData.childCount + formData.infantCount;
      const availableSpots = selectedSchedule.maxParticipants - (selectedSchedule.bookedCount ?? 0);
      if (totalParticipants > availableSpots) {
        toast.error(`Only ${availableSpots} spots available. You're trying to book ${totalParticipants} participants.`);
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
  };

  const handleCustomerCreated = (customer: { id: string; firstName: string; lastName: string; email: string }) => {
    setFormData((prev) => ({ ...prev, customerId: customer.id }));
    utils.customer.list.invalidate();
  };

  const selectedSchedule = schedulesData?.data.find((s) => s.id === formData.scheduleId);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}

        {/* Customer & Schedule Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              {isEditing ? (
                <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                  {booking?.customer?.firstName} {booking?.customer?.lastName}
                </div>
              ) : (
                <Combobox
                  options={customerOptions}
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, customerId: value }))
                  }
                  placeholder="Search customers..."
                  searchPlaceholder="Search by name or email..."
                  emptyText="No customers found"
                  createLabel="Create New Customer"
                  onCreateNew={() => setShowCreateCustomer(true)}
                  isLoading={customersLoading}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule *
              </label>
              {isEditing ? (
                <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                  {booking?.tour?.name} - {booking?.schedule?.startsAt && formatScheduleDate(booking.schedule.startsAt)}
                </div>
              ) : (
                <Combobox
                  options={scheduleOptions}
                  value={formData.scheduleId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, scheduleId: value }))
                  }
                  placeholder="Search schedules..."
                  searchPlaceholder="Search by tour name or date..."
                  emptyText="No schedules found"
                  isLoading={schedulesLoading}
                />
              )}
            </div>
          </div>

          {selectedSchedule && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Schedule</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Tour</p>
                  <p className="font-medium">{selectedSchedule.tour?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date & Time</p>
                  <p className="font-medium">{formatScheduleDate(selectedSchedule.startsAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pricing</p>
                  <p className="font-medium">
                    Adult: ${parseFloat(selectedSchedule.price || selectedSchedule.tour?.basePrice || "0").toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Child: ${(parseFloat(selectedSchedule.price || selectedSchedule.tour?.basePrice || "0") * 0.5).toFixed(2)}, Infant: Free
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Available spots</p>
                  <p className="font-medium">
                    {selectedSchedule.maxParticipants - (selectedSchedule.bookedCount ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guest Counts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Guests</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adults *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.adultCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    adultCount: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Children
              </label>
              <input
                type="number"
                min="0"
                value={formData.childCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    childCount: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Infants
              </label>
              <input
                type="number"
                min="0"
                value={formData.infantCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    infantCount: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Total participants: {formData.adultCount + formData.childCount + formData.infantCount}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal
              </label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
                ${calculatedPrice.subtotal}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount ($)
              </label>
              <input
                type="text"
                value={formData.discount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, discount: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ($)
              </label>
              <input
                type="text"
                value={formData.tax}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tax: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 font-semibold">
                ${calculatedPrice.total}
              </div>
            </div>
          </div>
        </div>

        {/* Special Requests */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Special Requests</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requests
              </label>
              <textarea
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Any special requests from the customer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dietary Requirements
              </label>
              <textarea
                value={formData.dietaryRequirements}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dietaryRequirements: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Allergies, vegetarian, halal, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accessibility Needs
              </label>
              <textarea
                value={formData.accessibilityNeeds}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, accessibilityNeeds: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Wheelchair access, mobility assistance, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.internalNotes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, internalNotes: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Notes visible only to staff..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Update Booking" : "Create Booking"}
          </button>
        </div>
      </form>

      {/* Customer Quick Create Modal */}
      <CustomerQuickCreate
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        onSuccess={handleCustomerCreated}
      />
    </>
  );
}

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
