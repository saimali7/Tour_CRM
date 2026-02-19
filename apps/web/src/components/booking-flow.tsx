"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Check } from "lucide-react";
import { useBooking, BookingProvider, type AvailableAddOn } from "@/lib/booking-context";
import { BookingOptionSelection } from "./booking-option-selection";
import { TicketSelection } from "./ticket-selection";
import { AddonSelection } from "./addon-selection";
import { CustomerDetailsForm } from "./customer-details-form";
import { PaymentStep } from "./payment-step";
import { WaiverStep } from "./waiver-step";
import { BookingConfirmation } from "./booking-confirmation";
import { CardSurface } from "@/components/layout/card-surface";
import type {
  BookingOption,
  OrganizationSettings,
  Tour,
  TourPricingTier,
} from "@tour/database";

interface BookingFlowProps {
  tour: Tour;
  bookingDate: Date;
  bookingTime: string;
  availableSpots: number;
  pricingTiers: TourPricingTier[];
  bookingOptions: BookingOption[];
  currency: string;
  taxConfig?: OrganizationSettings["tax"];
  organizationName: string;
  organizationSlug: string;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours!, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours! * 60 + minutes! + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

function BookingFlowContent({
  tour,
  bookingDate,
  bookingTime,
  availableSpots,
  pricingTiers,
  bookingOptions,
  currency,
  taxConfig,
  organizationName,
  organizationSlug,
}: BookingFlowProps) {
  const { state, setTourAndAvailability, setAvailableAddOns } = useBooking();

  useEffect(() => {
    setTourAndAvailability(
      tour,
      bookingDate,
      bookingTime,
      availableSpots,
      pricingTiers,
      bookingOptions,
      currency,
      {
        enabled: Boolean(taxConfig?.enabled),
        rate: taxConfig?.rate ?? 0,
        includeInPrice: Boolean(taxConfig?.includeInPrice),
      }
    );
  }, [
    tour,
    bookingDate,
    bookingTime,
    availableSpots,
    pricingTiers,
    bookingOptions,
    currency,
    taxConfig?.enabled,
    taxConfig?.rate,
    taxConfig?.includeInPrice,
    setTourAndAvailability,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadAddOns = async () => {
      try {
        const response = await fetch(`/api/add-ons/for-tour?tourId=${encodeURIComponent(tour.id)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAvailableAddOns([]);
          }
          return;
        }

        const payload = (await response.json()) as {
          addOns?: AvailableAddOn[];
        };

        if (!cancelled) {
          setAvailableAddOns(Array.isArray(payload.addOns) ? payload.addOns : []);
        }
      } catch {
        if (!cancelled) {
          setAvailableAddOns([]);
        }
      }
    };

    void loadAddOns();

    return () => {
      cancelled = true;
    };
  }, [setAvailableAddOns, tour.id]);

  const basePrice = parseFloat(tour.basePrice);
  const hasBookingOptions = state.bookingOptions.length > 0;
  const hasAddOns = state.availableAddOns.length > 0;
  const hasWaiverStep = Boolean(state.bookingId) && state.requiredWaivers.some((waiver) => !waiver.isSigned);

  const steps = useMemo(() => {
    const ordered = [] as Array<{ id: BookingFlowStep; label: string }>;
    if (hasBookingOptions) ordered.push({ id: "options", label: "Options" });
    ordered.push({ id: "select", label: "Tickets" });
    if (hasAddOns) ordered.push({ id: "addons", label: "Add-ons" });
    ordered.push({ id: "details", label: "Details" });
    ordered.push({ id: "payment", label: "Payment" });
    if (hasWaiverStep) ordered.push({ id: "waiver", label: "Waiver" });
    ordered.push({ id: "confirmation", label: "Done" });
    return ordered;
  }, [hasAddOns, hasBookingOptions, hasWaiverStep]);

  const currentStepIndex = Math.max(steps.findIndex((s) => s.id === state.step), 0);
  const endTime = calculateEndTime(bookingTime, tour.durationMinutes);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 max-w-[1280px] mx-auto py-4">
      <div className="lg:col-span-7 xl:col-span-8">
        <div className="mb-4 rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 text-sm font-medium text-muted-foreground sm:hidden">
          Step {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}
        </div>

        <div className="mb-10 hidden items-center justify-between sm:flex">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-1 items-center last:flex-none">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-300 ${index < currentStepIndex
                  ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20"
                  : index === currentStepIndex
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110"
                    : "bg-secondary text-muted-foreground"
                  }`}
              >
                {index < currentStepIndex ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              <span
                className={`ml-3 text-sm tracking-wide ${index <= currentStepIndex ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`mx-4 h-[2px] flex-1 rounded-full ${index < currentStepIndex ? "bg-emerald-500/50" : "bg-border/60"}`} />
              )}
            </div>
          ))}
        </div>

        <CardSurface className="p-0 sm:p-0 overflow-hidden shadow-lg border-border/50">
          <div key={state.step} className="animate-fade-in p-6 sm:p-8">
            {state.step === "options" && <BookingOptionSelection />}
            {state.step === "select" && (
              <TicketSelection
                basePrice={basePrice}
                maxParticipants={tour.maxParticipants}
                availableSpots={availableSpots}
                currency={currency}
              />
            )}
            {state.step === "addons" && <AddonSelection />}
            {state.step === "details" && (
              <CustomerDetailsForm
                requireParticipantNames={false}
                organizationSlug={organizationSlug}
              />
            )}
            {state.step === "payment" && (
              <PaymentStep organizationName={organizationName} organizationSlug={organizationSlug} />
            )}
            {state.step === "waiver" && <WaiverStep />}
            {state.step === "confirmation" && (
              <BookingConfirmation
                organizationName={organizationName}
                organizationSlug={organizationSlug}
              />
            )}
          </div>
        </CardSurface>
      </div>

      {state.step !== "confirmation" ? (
        <div className="lg:col-span-5 xl:col-span-4 relative">
          <CardSurface className="sticky top-28 p-6 shadow-xl border-border/60 bg-gradient-to-b from-card to-card/95 backdrop-blur-xl">
            <h3 className="mb-5 font-bold text-xl border-b border-border/40 pb-4">Booking Summary</h3>

            {tour.coverImageUrl ? (
              <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-lg border border-border">
                <Image
                  src={tour.coverImageUrl}
                  alt={tour.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 360px"
                />
              </div>
            ) : null}

            <div className="space-y-3 border-b pb-4">
              <h4 className="font-medium">{tour.name}</h4>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(bookingDate)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(bookingTime)} - {formatTime(endTime)}
                </span>
              </div>

              {tour.meetingPoint && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{tour.meetingPoint}</span>
                </div>
              )}

              {state.bookingOptionId && (
                <div className="text-sm text-muted-foreground">
                  Option: {state.bookingOptions.find((option) => option.id === state.bookingOptionId)?.name}
                </div>
              )}
            </div>

            {state.participants.length > 0 && (
              <div className="border-b py-4">
                <h5 className="mb-2 text-sm font-medium">Participants</h5>
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

            {state.selectedAddOns.length > 0 && (
              <div className="border-b py-4">
                <h5 className="mb-2 text-sm font-medium">Add-ons</h5>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {state.selectedAddOns.map((addon) => (
                    <p key={addon.addOnProductId}>
                      {addon.name} x {addon.quantity}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {state.customer && (
              <div className="border-b py-4">
                <h5 className="mb-2 text-sm font-medium">Lead Contact</h5>
                <p className="text-sm text-muted-foreground">
                  {state.customer.firstName} {state.customer.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{state.customer.email}</p>
              </div>
            )}

            <div className="space-y-2 pt-4 text-sm" aria-live="polite">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Participants</span>
                <span>{formatPrice(state.participantSubtotal, state.currency)}</span>
              </div>
              {state.addOnSubtotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Add-ons</span>
                  <span>{formatPrice(state.addOnSubtotal, state.currency)}</span>
                </div>
              )}
              {state.discount > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(state.discount, state.currency)}</span>
                </div>
              )}
              {state.tax > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(state.tax, state.currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border/40 pt-4 text-lg font-bold">
                <span>Total</span>
                <span className="text-foreground">{formatPrice(state.total, state.currency)}</span>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-border/40 text-center">
              <p className="text-xs text-muted-foreground">
                Need help? Call us or{" "}
                <a href={`/org/${organizationSlug}/contact`} className="text-primary font-medium hover:underline">
                  contact support
                </a>
              </p>
            </div>
          </CardSurface>
        </div>
      ) : <div className="hidden lg:block lg:col-span-5 xl:col-span-4" />}
    </div>
  );
}

type BookingFlowStep = "options" | "select" | "addons" | "details" | "payment" | "waiver" | "confirmation";

export function BookingFlow(props: BookingFlowProps) {
  return (
    <BookingProvider>
      <BookingFlowContent {...props} />
    </BookingProvider>
  );
}
