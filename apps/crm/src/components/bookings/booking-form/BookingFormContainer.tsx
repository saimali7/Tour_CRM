"use client";

import { Loader2 } from "lucide-react";
import { CustomerQuickCreate } from "@/components/customers/customer-quick-create";
import { useBookingForm } from "./useBookingForm";
import { CustomerSection } from "./CustomerSection";
import { TourSection } from "./TourSection";
import { DateTimeSection } from "./DateTimeSection";
import { ParticipantSection } from "./ParticipantSection";
import { PricingSection } from "./PricingSection";
import { NotesSection } from "./NotesSection";
import type { BookingFormProps } from "./types";

export function BookingFormContainer({
  booking,
  preselectedCustomerId,
}: BookingFormProps) {
  const {
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

    // Availability-based handlers
    handleTourChange,
    handleDateChange,
    handleTimeChange,

    // Actions
    handleSubmit,
    handleCancel,
  } = useBookingForm({
    booking,
    preselectedCustomerId,
  });

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        )}

        {/* Customer Selection */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">
            Customer
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomerSection
              customerId={formData.customerId}
              updateField={updateField}
              isEditing={isEditing}
              booking={booking}
              customerOptions={customerOptions}
              customersLoading={customersLoading}
              onCreateNew={() => setShowCreateCustomer(true)}
            />
          </div>
        </div>

        {/* Tour Selection */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">
            Tour Selection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TourSection
              tourId={formData.tourId}
              onTourChange={handleTourChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Date & Time Selection - Only show when tour is selected */}
        {formData.tourId && (
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">
              Date & Time
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateTimeSection
                tourId={formData.tourId}
                selectedDate={formData.bookingDate}
                selectedTime={formData.bookingTime}
                onDateChange={handleDateChange}
                onTimeChange={handleTimeChange}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Guest Counts */}
        <ParticipantSection
          adultCount={formData.adultCount}
          childCount={formData.childCount}
          infantCount={formData.infantCount}
          updateField={updateField}
        />

        {/* Pricing */}
        <PricingSection
          calculatedPrice={calculatedPrice}
          discount={formData.discount}
          tax={formData.tax}
          updateField={updateField}
        />

        {/* Special Requests */}
        <NotesSection
          specialRequests={formData.specialRequests}
          dietaryRequirements={formData.dietaryRequirements}
          accessibilityNeeds={formData.accessibilityNeeds}
          internalNotes={formData.internalNotes}
          updateField={updateField}
        />

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-foreground hover:bg-accent rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
