"use client";

import { useEffect } from "react";
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
  Loader2,
  Check,
} from "lucide-react";

// Sub-components
import { CustomerSelector } from "./booking-sheet/customer-selector";
import { TourSelector } from "./booking-sheet/tour-selector";
import { DateTimeSelector } from "./booking-sheet/date-time-selector";
import { GuestCounter } from "./booking-sheet/guest-counter";
import { BookingPriceSummary } from "./booking-sheet/price-summary";
import { ExtrasForm } from "./booking-sheet/extras-form";
import { PaymentForm } from "./booking-sheet/payment-form";
import { useBookingForm } from "./booking-sheet/use-booking-form";

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  preselectedCustomerId?: string;
  preselectedTourId?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

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
}: UnifiedBookingSheetProps) {
  const form = useBookingForm({
    open,
    orgSlug,
    preselectedCustomerId,
    preselectedTourId,
    onSuccess: () => onOpenChange(false),
  });

  // ---------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && open) {
        e.preventDefault();
        form.handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, form.handleSubmit]);

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
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono">Cmd</kbd>
            <span className="mx-1">+</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono">Enter</kbd>
            <span className="ml-1.5">to submit</span>
          </SheetDescription>
        </SheetHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer Section */}
            <CustomerSelector
              mode={form.customerMode}
              onModeChange={form.setCustomerMode}
              searchQuery={form.customerSearch}
              onSearchChange={form.setCustomerSearch}
              selectedCustomer={form.selectedCustomer}
              onSelectCustomer={form.setSelectedCustomer}
              filteredCustomers={form.filteredCustomers}
              recentCustomers={form.recentCustomers}
              newCustomer={form.newCustomer}
              onNewCustomerChange={form.setNewCustomer}
              errors={form.errors}
              touched={form.touched}
              onTouch={form.handleTouch}
              hasValidContact={form.hasValidContact}
            />

            {/* Tour Section */}
            <TourSelector
              tours={form.tours}
              selectedTourId={form.selectedTourId}
              onSelectTour={form.handleTourSelect}
              error={form.errors.tour}
            />

            {/* Date & Time Section */}
            {form.selectedTourId && (
              <DateTimeSelector
                selectedDate={form.selectedDate}
                onDateChange={form.setSelectedDate}
                dateScrollOffset={form.dateScrollOffset}
                onDateScrollOffsetChange={form.setDateScrollOffset}
                selectedTime={form.selectedTime}
                onTimeChange={form.setSelectedTime}
                timeSlots={form.timeSlots}
                isLoadingTimeSlots={form.departureTimesLoading}
                nextAvailableDate={form.nextAvailableDate}
                timeError={form.errors.time}
              />
            )}

            {/* Guests Section */}
            {form.selectedTime && (
              <GuestCounter
                guestCounts={form.guestCounts}
                onGuestCountsChange={form.setGuestCounts}
                availableSpots={form.availableSpots}
                basePrice={parseFloat(form.selectedTour?.basePrice || "0")}
                pricing={form.pricing}
                showPriceBreakdown={form.showPriceBreakdown}
                onTogglePriceBreakdown={() => form.setShowPriceBreakdown(!form.showPriceBreakdown)}
                error={form.errors.guests}
              />
            )}

            {/* Extras Section */}
            {form.selectedTime && (
              <ExtrasForm
                pickupLocation={form.pickupLocation}
                onPickupLocationChange={form.setPickupLocation}
                notes={form.notes}
                onNotesChange={form.setNotes}
              />
            )}

            {/* Payment Section */}
            {form.selectedTime && (
              <PaymentForm
                recordPayment={form.recordPayment}
                onRecordPaymentChange={form.setRecordPayment}
                paymentAmount={form.paymentAmount}
                onPaymentAmountChange={form.setPaymentAmount}
                paymentMethod={form.paymentMethod}
                onPaymentMethodChange={form.setPaymentMethod}
                defaultAmount={form.pricing.total}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-card p-4 space-y-4">
          {/* Price Summary */}
          {form.selectedTourId && form.selectedTime && form.selectedTour && (
            <BookingPriceSummary
              tourName={form.selectedTour.name}
              selectedDate={form.selectedDate}
              selectedTime={form.selectedTime}
              totalGuests={form.totalGuests}
              total={form.pricing.total}
            />
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
              onClick={form.handleSubmit}
              disabled={form.isSubmitting || !form.canSubmit}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {form.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Book{form.pricing.total > 0 ? ` \u00B7 ${formatCurrency(form.pricing.total)}` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
