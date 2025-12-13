"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Check } from "lucide-react";
import { useBooking, BookingProvider } from "@/lib/booking-context";
import { TicketSelection } from "./ticket-selection";
import { CustomerDetailsForm } from "./customer-details-form";
import { PaymentStep } from "./payment-step";
import { BookingConfirmation } from "./booking-confirmation";
import type { Tour, Schedule, TourPricingTier } from "@tour/database";

interface BookingFlowProps {
  tour: Tour;
  schedule: Schedule;
  pricingTiers: TourPricingTier[];
  currency: string;
  organizationName: string;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE, MMMM d, yyyy");
}

function BookingFlowContent({
  tour,
  schedule,
  pricingTiers,
  currency,
  organizationName,
}: BookingFlowProps) {
  const { state, setTourSchedule } = useBooking();

  // Initialize booking with tour and schedule
  useEffect(() => {
    setTourSchedule(tour, schedule, pricingTiers, currency);
  }, [tour, schedule, pricingTiers, currency, setTourSchedule]);

  const basePrice = parseFloat(schedule.price || tour.basePrice);
  const availableSpots = schedule.maxParticipants - (schedule.bookedCount || 0);

  const steps = [
    { id: "select", label: "Tickets", number: 1 },
    { id: "details", label: "Details", number: 2 },
    { id: "payment", label: "Payment", number: 3 },
    { id: "confirmation", label: "Confirmed", number: 4 },
  ] as const;

  const currentStepIndex = steps.findIndex((s) => s.id === state.step);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${
                    index < currentStepIndex
                      ? "bg-green-500 text-white"
                      : index === currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  ml-2 text-sm hidden sm:block
                  ${
                    index <= currentStepIndex
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }
                `}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-8 sm:w-16 h-0.5 mx-2 sm:mx-4
                    ${index < currentStepIndex ? "bg-green-500" : "bg-muted"}
                  `}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-lg border p-6">
          {state.step === "select" && (
            <TicketSelection
              basePrice={basePrice}
              maxParticipants={schedule.maxParticipants}
              availableSpots={availableSpots}
              currency={currency}
            />
          )}
          {state.step === "details" && <CustomerDetailsForm requireParticipantNames={false} />}
          {state.step === "payment" && (
            <PaymentStep organizationName={organizationName} />
          )}
          {state.step === "confirmation" && (
            <BookingConfirmation organizationName={organizationName} />
          )}
        </div>
      </div>

      {/* Sidebar - Tour Summary */}
      {state.step !== "confirmation" && (
        <div className="lg:col-span-1">
          <div className="sticky top-24 p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-4">Booking Summary</h3>

            {/* Tour Info */}
            <div className="space-y-3 pb-4 border-b">
              <h4 className="font-medium">{tour.name}</h4>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(schedule.startsAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(schedule.startsAt)} - {formatTime(schedule.endsAt)}
                </span>
              </div>

              {tour.meetingPoint && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{tour.meetingPoint}</span>
                </div>
              )}
            </div>

            {/* Participant Summary */}
            {state.participants.length > 0 && (
              <div className="py-4 border-b">
                <h5 className="text-sm font-medium mb-2">Participants</h5>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {(() => {
                    const adults = state.participants.filter((p) => p.type === "adult");
                    const children = state.participants.filter((p) => p.type === "child");
                    const infants = state.participants.filter((p) => p.type === "infant");
                    return (
                      <>
                        {adults.length > 0 && <p>{adults.length} Adult(s)</p>}
                        {children.length > 0 && <p>{children.length} Child(ren)</p>}
                        {infants.length > 0 && <p>{infants.length} Infant(s)</p>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Customer Summary */}
            {state.customer && (
              <div className="py-4 border-b">
                <h5 className="text-sm font-medium mb-2">Lead Contact</h5>
                <p className="text-sm text-muted-foreground">
                  {state.customer.firstName} {state.customer.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{state.customer.email}</p>
              </div>
            )}

            {/* Help */}
            <div className="pt-4">
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <a href="/contact" className="text-primary hover:underline">
                  Contact us
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingFlow(props: BookingFlowProps) {
  return (
    <BookingProvider>
      <BookingFlowContent {...props} />
    </BookingProvider>
  );
}
