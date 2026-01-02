"use client";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import type { ExistingBooking, ScheduleWithDetails, PricingTier, FormUpdateFn } from "./types";
import { formatScheduleDate } from "./useBookingForm";

interface ScheduleSectionProps {
  scheduleId: string;
  updateField: FormUpdateFn;
  isEditing: boolean;
  booking?: ExistingBooking;
  scheduleOptions: ComboboxOption[];
  schedulesLoading: boolean;
  selectedSchedule?: ScheduleWithDetails;
  pricingTiers?: PricingTier[];
}

export function ScheduleSection({
  scheduleId,
  updateField,
  isEditing,
  booking,
  scheduleOptions,
  schedulesLoading,
  selectedSchedule,
  pricingTiers,
}: ScheduleSectionProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Schedule *
        </label>
        {isEditing ? (
          <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground">
            {booking?.tour?.name} -{" "}
            {booking?.schedule?.startsAt &&
              formatScheduleDate(booking.schedule.startsAt)}
          </div>
        ) : (
          <Combobox
            options={scheduleOptions}
            value={scheduleId}
            onValueChange={(value) => updateField("scheduleId", value)}
            placeholder="Search schedules..."
            searchPlaceholder="Search by tour name or date..."
            emptyText="No schedules found"
            isLoading={schedulesLoading}
          />
        )}
      </div>

      {selectedSchedule && (
        <div className="bg-muted rounded-lg p-4 md:col-span-2">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Selected Schedule
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tour</p>
              <p className="font-medium">{selectedSchedule.tour?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date & Time</p>
              <p className="font-medium">
                {formatScheduleDate(selectedSchedule.startsAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pricing</p>
              {pricingTiers && pricingTiers.length > 0 ? (
                <div className="space-y-1">
                  {pricingTiers
                    .filter((t) => t.isActive)
                    .map((tier) => (
                      <p key={tier.id} className="text-sm">
                        <span className="font-medium">{tier.label}:</span> $
                        {parseFloat(tier.price).toFixed(2)}
                      </p>
                    ))}
                </div>
              ) : (
                <p className="font-medium">
                  $
                  {parseFloat(
                    selectedSchedule.price ||
                      selectedSchedule.tour?.basePrice ||
                      "0"
                  ).toFixed(2)}{" "}
                  per person
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Available spots</p>
              <p className="font-medium">
                {selectedSchedule.maxParticipants -
                  (selectedSchedule.bookedCount ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
